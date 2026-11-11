import json

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import F, Sum
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .forms import RegisterForm
from .models import EggProduction, Farm, FeedItem, FeedMovement, Flock
from .roles import ROLE_CHOICES


def _request_data(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _user_payload(user):
    role_names = [role for role, _ in ROLE_CHOICES]
    roles = list(user.groups.filter(name__in=role_names).values_list("name", flat=True))
    return {
        "id": user.pk,
        "username": user.get_username(),
        "email": user.email,
        "role": roles[0] if len(roles) == 1 else None,
    }


def _serialize_farm(farm):
    return {
        "id": farm.id,
        "name": farm.name,
        "location": farm.location,
        "owner_id": farm.owner_id,
    }


def _serialize_flock(flock):
    return {
        "id": flock.id,
        "farm": _serialize_farm(flock.farm),
        "name": flock.name,
        "poultry_type": flock.poultry_type,
        "breed": flock.breed,
        "initial_quantity": flock.initial_quantity,
        "acquisition_date": flock.acquisition_date.isoformat(),
        "supplier": flock.supplier,
        "housing_unit": flock.housing_unit,
        "purpose": flock.purpose,
        "notes": flock.notes,
        "status": flock.status,
        "created_at": flock.created_at.isoformat(),
        "updated_at": flock.updated_at.isoformat(),
    }


def _build_flock_summary(flocks):
    return {
        "total": flocks.count(),
        "active": flocks.filter(status=Flock.Status.ACTIVE).count(),
        "completed": flocks.filter(status=Flock.Status.COMPLETED).count(),
        "archived": flocks.filter(status=Flock.Status.ARCHIVED).count(),
    }


def _serialize_egg_production(record):
    return {
        "id": record.id,
        "flock": {
            "id": record.flock_id,
            "name": record.flock.name,
            "farm": _serialize_farm(record.flock.farm),
        },
        "collection_date": record.collection_date.isoformat(),
        "eggs_collected": record.eggs_collected,
        "broken_eggs": record.broken_eggs,
        "quality_grade": record.quality_grade,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _build_egg_summary(records):
    total_eggs = records.aggregate(total_eggs=Sum("eggs_collected"))["total_eggs"] or 0
    total_broken = records.aggregate(total_broken=Sum("broken_eggs"))["total_broken"] or 0
    total_records = records.count()
    return {
        "total_records": total_records,
        "total_eggs": total_eggs,
        "broken_eggs": total_broken,
        "grade_a": records.filter(quality_grade=EggProduction.QualityGrade.GRADE_A).count(),
        "average_daily": round(total_eggs / total_records) if total_records else 0,
    }


def _serialize_feed_item(feed_item):
    return {
        "id": feed_item.id,
        "name": feed_item.name,
        "category": feed_item.category,
        "brand": feed_item.brand,
        "unit": feed_item.unit,
        "unit_cost": float(feed_item.unit_cost),
        "minimum_stock": float(feed_item.minimum_stock),
        "current_stock": float(feed_item.current_stock),
        "supplier": feed_item.supplier,
        "expiry_date": feed_item.expiry_date.isoformat() if feed_item.expiry_date else None,
        "notes": feed_item.notes,
        "created_at": feed_item.created_at.isoformat(),
        "updated_at": feed_item.updated_at.isoformat(),
    }


def _serialize_feed_movement(movement):
    return {
        "id": movement.id,
        "feed_item_id": movement.feed_item_id,
        "feed_item": {
            "id": movement.feed_item_id,
            "name": movement.feed_item.name,
            "unit": movement.feed_item.unit,
        },
        "flock_id": movement.flock_id,
        "flock_name": movement.flock.name if movement.flock else None,
        "movement_type": movement.movement_type,
        "quantity": float(movement.quantity),
        "unit_cost": float(movement.unit_cost),
        "movement_date": movement.movement_date.isoformat(),
        "reference": movement.reference,
        "notes": movement.notes,
        "created_at": movement.created_at.isoformat(),
        "updated_at": movement.updated_at.isoformat(),
    }


def _ensure_authenticated(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)
    return None


@require_GET
@ensure_csrf_cookie
def api_csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
@ensure_csrf_cookie
def api_session(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False})
    return JsonResponse({"authenticated": True, "user": _user_payload(request.user)})


@require_POST
def api_login(request):
    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    username = data.get("username")
    password = data.get("password")
    role = data.get("role")
    if not all(isinstance(value, str) and value for value in (username, password, role)):
        return JsonResponse(
            {"error": "Username/email, password, and role are required."},
            status=400,
        )

    user = authenticate(
        request,
        username=username,
        password=password,
        role=role,
    )
    if user is None:
        return JsonResponse(
            {"error": "Invalid username/email, password, or account type."},
            status=401,
        )

    login(request, user)
    return JsonResponse({"authenticated": True, "user": _user_payload(user)})


@require_POST
def api_signup(request):
    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    form = RegisterForm(data)
    if not form.is_valid():
        return JsonResponse({"errors": form.errors.get_json_data()}, status=400)

    user = form.save()
    login(request, user, backend=settings.AUTHENTICATION_BACKENDS[0])
    return JsonResponse(
        {"authenticated": True, "user": _user_payload(user)},
        status=201,
    )


@require_POST
def api_logout(request):
    auth_logout(request)
    return JsonResponse({"authenticated": False})


@require_http_methods(["GET", "POST"])
def api_farms(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        name = (data.get("name") or "").strip()
        if not name:
            return JsonResponse({"error": "Farm name is required."}, status=400)

        location = (data.get("location") or "").strip()
        farm, created = Farm.objects.get_or_create(
            owner=request.user,
            name=name,
            defaults={"location": location},
        )
        if not created and location:
            farm.location = location
            farm.save(update_fields=["location", "updated_at"])

        return JsonResponse(_serialize_farm(farm), status=201 if created else 200)

    farms = Farm.objects.filter(owner=request.user).order_by("name")
    return JsonResponse({"farms": [_serialize_farm(farm) for farm in farms]})


@require_http_methods(["GET", "POST"])
def api_flocks(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    flocks = Flock.objects.filter(farm__owner=request.user).select_related("farm")

    status_filter = request.GET.get("status")
    if status_filter and status_filter != "all":
        flocks = flocks.filter(status=status_filter)

    search = request.GET.get("search", "").strip()
    if search:
        search_q = search.lower()
        flocks = (
            flocks.filter(name__icontains=search_q)
            | flocks.filter(breed__icontains=search_q)
            | flocks.filter(supplier__icontains=search_q)
        )

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        farm_name = str(data.get("farmName") or "").strip()
        farm_id = data.get("farm_id")
        if farm_id:
            try:
                farm = Farm.objects.get(owner=request.user, id=farm_id)
            except Farm.DoesNotExist:
                return JsonResponse({"error": "Farm not found."}, status=404)
        else:
            if not farm_name:
                return JsonResponse({"error": "Farm name is required."}, status=400)
            farm, _ = Farm.objects.get_or_create(
                owner=request.user,
                name=farm_name,
                defaults={"location": str(data.get("farmLocation") or "").strip()},
            )
            if not farm.location and data.get("farmLocation"):
                farm.location = str(data.get("farmLocation") or "").strip()
                farm.save(update_fields=["location", "updated_at"])

        payload = {
            "name": str(data.get("name") or "").strip(),
            "poultry_type": str(data.get("poultry_type") or Flock.PoultryType.LAYER),
            "breed": str(data.get("breed") or "").strip(),
            "initial_quantity": data.get("initial_quantity"),
            "acquisition_date": data.get("acquisition_date"),
            "supplier": str(data.get("supplier") or "").strip(),
            "housing_unit": str(data.get("housing_unit") or "").strip(),
            "purpose": str(data.get("purpose") or Flock.Purpose.EGGS),
            "notes": str(data.get("notes") or "").strip(),
            "status": str(data.get("status") or Flock.Status.ACTIVE),
        }

        if not payload["name"]:
            return JsonResponse({"error": "Flock name is required."}, status=400)
        if not payload["acquisition_date"]:
            return JsonResponse({"error": "Acquisition date is required."}, status=400)

        try:
            initial_quantity = int(payload["initial_quantity"])
        except (TypeError, ValueError):
            return JsonResponse({"error": "Initial quantity must be a positive number."}, status=400)

        if initial_quantity <= 0:
            return JsonResponse({"error": "Initial quantity must be a positive number."}, status=400)

        try:
            flock = Flock.objects.create(
                farm=farm,
                name=payload["name"],
                poultry_type=payload["poultry_type"],
                breed=payload["breed"],
                initial_quantity=initial_quantity,
                acquisition_date=payload["acquisition_date"],
                supplier=payload["supplier"],
                housing_unit=payload["housing_unit"],
                purpose=payload["purpose"],
                notes=payload["notes"],
                status=payload["status"],
            )
        except (IntegrityError, ValidationError) as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(_serialize_flock(flock), status=201)

    ordered_flocks = flocks.order_by("-acquisition_date", "name")
    return JsonResponse(
        {
            "flocks": [_serialize_flock(flock) for flock in ordered_flocks],
            "summary": _build_flock_summary(ordered_flocks),
        }
    )


@require_http_methods(["GET", "PATCH", "DELETE"])
def api_flock_detail(request, flock_id):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    try:
        flock = Flock.objects.select_related("farm").get(id=flock_id, farm__owner=request.user)
    except Flock.DoesNotExist:
        return JsonResponse({"error": "Flock not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_flock(flock))

    if request.method == "DELETE":
        flock.delete()
        return JsonResponse({"deleted": True}, status=200)

    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    if "farmName" in data:
        farm_name = str(data.get("farmName") or "").strip()
        if farm_name:
            farm, _ = Farm.objects.get_or_create(owner=request.user, name=farm_name)
            flock.farm = farm

    if "farmLocation" in data:
        flock.farm.location = str(data.get("farmLocation") or "").strip()
        flock.farm.save(update_fields=["location", "updated_at"])

    for field in [
        "name",
        "poultry_type",
        "breed",
        "supplier",
        "housing_unit",
        "purpose",
        "notes",
        "status",
    ]:
        if field in data:
            setattr(flock, field, data[field])

    if "initial_quantity" in data:
        value = int(data["initial_quantity"])
        if value <= 0:
            return JsonResponse({"error": "Initial quantity must be a positive number."}, status=400)
        flock.initial_quantity = value

    if "acquisition_date" in data:
        flock.acquisition_date = data["acquisition_date"]

    try:
        flock.full_clean()
        flock.save()
    except ValidationError as exc:
        return JsonResponse({"error": exc.message_dict if hasattr(exc, "message_dict") else str(exc)}, status=400)

    return JsonResponse(_serialize_flock(flock))


@require_http_methods(["GET", "POST"])
def api_egg_production(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    records = EggProduction.objects.filter(flock__farm__owner=request.user).select_related("flock", "flock__farm")

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        flock_id = data.get("flock_id")
        if not flock_id:
            return JsonResponse({"error": "Flock is required."}, status=400)

        try:
            flock = Flock.objects.get(id=flock_id, farm__owner=request.user)
        except Flock.DoesNotExist:
            return JsonResponse({"error": "Flock not found."}, status=404)

        collection_date = str(data.get("collection_date") or "").strip()
        eggs_collected = data.get("eggs_collected")
        broken_eggs = data.get("broken_eggs")
        quality_grade = str(data.get("quality_grade") or EggProduction.QualityGrade.GRADE_A).strip()
        notes = str(data.get("notes") or "").strip()

        if not collection_date:
            return JsonResponse({"error": "Collection date is required."}, status=400)

        try:
            total_eggs = int(eggs_collected)
            cracked = int(broken_eggs or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Egg counts must be numbers."}, status=400)

        if total_eggs < 0:
            return JsonResponse({"error": "Eggs collected must be zero or greater."}, status=400)
        if cracked < 0 or cracked > total_eggs:
            return JsonResponse({"error": "Broken eggs cannot exceed total eggs collected."}, status=400)

        try:
            record = EggProduction.objects.create(
                flock=flock,
                collection_date=collection_date,
                eggs_collected=total_eggs,
                broken_eggs=cracked,
                quality_grade=quality_grade,
                notes=notes,
            )
        except (IntegrityError, ValidationError) as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(_serialize_egg_production(record), status=201)

    ordered_records = records.order_by("-collection_date", "-created_at")
    return JsonResponse(
        {"records": [_serialize_egg_production(record) for record in ordered_records], "summary": _build_egg_summary(ordered_records)}
    )


@require_http_methods(["GET", "PATCH", "DELETE"])
def api_egg_production_detail(request, egg_id):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    try:
        record = EggProduction.objects.select_related("flock", "flock__farm").get(id=egg_id, flock__farm__owner=request.user)
    except EggProduction.DoesNotExist:
        return JsonResponse({"error": "Egg record not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_egg_production(record))

    if request.method == "DELETE":
        record.delete()
        return JsonResponse({"deleted": True}, status=200)

    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    if "flock_id" in data:
        try:
            flock = Flock.objects.get(id=data["flock_id"], farm__owner=request.user)
        except Flock.DoesNotExist:
            return JsonResponse({"error": "Flock not found."}, status=404)
        record.flock = flock

    if "collection_date" in data:
        record.collection_date = data["collection_date"]

    if "eggs_collected" in data:
        try:
            total_eggs = int(data["eggs_collected"])
        except (TypeError, ValueError):
            return JsonResponse({"error": "Egg counts must be numbers."}, status=400)
        if total_eggs < 0:
            return JsonResponse({"error": "Eggs collected must be zero or greater."}, status=400)
        record.eggs_collected = total_eggs

    if "broken_eggs" in data:
        try:
            cracked = int(data["broken_eggs"])
        except (TypeError, ValueError):
            return JsonResponse({"error": "Broken eggs must be a number."}, status=400)
        if cracked < 0 or cracked > record.eggs_collected:
            return JsonResponse({"error": "Broken eggs cannot exceed total eggs collected."}, status=400)
        record.broken_eggs = cracked

    for field in ["quality_grade", "notes"]:
        if field in data:
            setattr(record, field, data[field])

    try:
        record.full_clean()
        record.save()
    except ValidationError as exc:
        return JsonResponse({"error": exc.message_dict if hasattr(exc, "message_dict") else str(exc)}, status=400)

    return JsonResponse(_serialize_egg_production(record))


@require_http_methods(["GET", "POST"])
def api_feed_items(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    items = FeedItem.objects.filter(owner=request.user).select_related()

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        name = str(data.get("name") or "").strip()
        if not name:
            return JsonResponse({"error": "Feed item name is required."}, status=400)

        payload = {
            "name": name,
            "category": str(data.get("category") or FeedItem.Category.LAYER_MASH),
            "brand": str(data.get("brand") or "").strip(),
            "unit": str(data.get("unit") or "kg").strip() or "kg",
            "unit_cost": data.get("unit_cost", 0),
            "minimum_stock": data.get("minimum_stock", 0),
            "current_stock": data.get("current_stock", 0),
            "supplier": str(data.get("supplier") or "").strip(),
            "expiry_date": data.get("expiry_date"),
            "notes": str(data.get("notes") or "").strip(),
        }

        try:
            item = FeedItem.objects.create(owner=request.user, **payload)
        except (IntegrityError, ValidationError) as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(_serialize_feed_item(item), status=201)

    return JsonResponse({"items": [_serialize_feed_item(item) for item in items]})


@require_http_methods(["GET", "POST"])
def api_feed_stock(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        feed_id = data.get("feed_id")
        if not feed_id:
            return JsonResponse({"error": "Feed item is required."}, status=400)

        try:
            item = FeedItem.objects.get(id=feed_id, owner=request.user)
        except FeedItem.DoesNotExist:
            return JsonResponse({"error": "Feed item not found."}, status=404)

        try:
            quantity = float(data.get("quantity", 0))
            unit_cost = float(data.get("unit_cost", 0) or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Quantity and unit cost must be numeric."}, status=400)

        if quantity <= 0:
            return JsonResponse({"error": "Quantity must be greater than zero."}, status=400)

        with transaction.atomic():
            item.current_stock = float(item.current_stock) + quantity
            item.unit_cost = unit_cost or item.unit_cost
            item.save(update_fields=["current_stock", "unit_cost", "updated_at"])

            FeedMovement.objects.create(
                feed_item=item,
                flock=None,
                movement_type=FeedMovement.MovementType.STOCK_IN,
                quantity=quantity,
                unit_cost=unit_cost,
                movement_date=data.get("movement_date") or timezone.now().date().isoformat(),
                reference=str(data.get("reference") or "").strip(),
                notes=str(data.get("notes") or "").strip(),
            )

        return JsonResponse(_serialize_feed_item(item), status=201)

    stock = FeedItem.objects.filter(owner=request.user)
    return JsonResponse({"items": [_serialize_feed_item(item) for item in stock]})


@require_http_methods(["GET", "POST"])
def api_feed_stock_out(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        feed_id = data.get("feed_id")
        flock_id = data.get("flock_id")
        if not feed_id:
            return JsonResponse({"error": "Feed item is required."}, status=400)

        try:
            item = FeedItem.objects.get(id=feed_id, owner=request.user)
        except FeedItem.DoesNotExist:
            return JsonResponse({"error": "Feed item not found."}, status=404)

        flock = None
        if flock_id:
            try:
                flock = Flock.objects.get(id=flock_id, farm__owner=request.user)
            except Flock.DoesNotExist:
                return JsonResponse({"error": "Flock not found."}, status=404)

        try:
            quantity = float(data.get("quantity", 0))
        except (TypeError, ValueError):
            return JsonResponse({"error": "Quantity must be numeric."}, status=400)

        if quantity <= 0:
            return JsonResponse({"error": "Quantity must be greater than zero."}, status=400)
        if float(item.current_stock) - quantity < 0:
            return JsonResponse({"error": "Insufficient stock available for this issue."}, status=400)

        with transaction.atomic():
            item.current_stock = float(item.current_stock) - quantity
            item.save(update_fields=["current_stock", "updated_at"])

            movement = FeedMovement.objects.create(
                feed_item=item,
                flock=flock,
                movement_type=FeedMovement.MovementType.STOCK_OUT,
                quantity=quantity,
                movement_date=data.get("movement_date") or timezone.now().date().isoformat(),
                reference=str(data.get("reference") or "").strip(),
                notes=str(data.get("notes") or "").strip(),
            )

        return JsonResponse(_serialize_feed_movement(movement), status=201)

    return JsonResponse({"movements": []})


@require_GET
def api_feed_movements(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    movements = FeedMovement.objects.filter(feed_item__owner=request.user).select_related("feed_item", "flock")
    feed_id = request.GET.get("feed_id")
    if feed_id:
        movements = movements.filter(feed_item_id=feed_id)
    return JsonResponse({"movements": [_serialize_feed_movement(movement) for movement in movements]})


@require_http_methods(["GET", "POST"])
def api_feed_consumption(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    if request.method == "POST":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        feed_id = data.get("feed_id")
        flock_id = data.get("flock_id")
        if not feed_id:
            return JsonResponse({"error": "Feed item is required."}, status=400)

        try:
            item = FeedItem.objects.get(id=feed_id, owner=request.user)
        except FeedItem.DoesNotExist:
            return JsonResponse({"error": "Feed item not found."}, status=404)

        flock = None
        if flock_id:
            try:
                flock = Flock.objects.get(id=flock_id, farm__owner=request.user)
            except Flock.DoesNotExist:
                return JsonResponse({"error": "Flock not found."}, status=404)

        try:
            quantity = float(data.get("quantity", 0))
        except (TypeError, ValueError):
            return JsonResponse({"error": "Quantity must be numeric."}, status=400)

        if quantity <= 0:
            return JsonResponse({"error": "Quantity must be greater than zero."}, status=400)
        if float(item.current_stock) - quantity < 0:
            return JsonResponse({"error": "Insufficient stock available for this consumption record."}, status=400)

        with transaction.atomic():
            item.current_stock = float(item.current_stock) - quantity
            item.save(update_fields=["current_stock", "updated_at"])

            movement = FeedMovement.objects.create(
                feed_item=item,
                flock=flock,
                movement_type=FeedMovement.MovementType.CONSUMPTION,
                quantity=quantity,
                movement_date=data.get("movement_date") or timezone.now().date().isoformat(),
                reference=str(data.get("reference") or "").strip(),
                notes=str(data.get("notes") or "").strip(),
            )

        return JsonResponse(_serialize_feed_movement(movement), status=201)

    movements = FeedMovement.objects.filter(feed_item__owner=request.user, movement_type=FeedMovement.MovementType.CONSUMPTION).select_related("feed_item", "flock")
    return JsonResponse({"movements": [_serialize_feed_movement(movement) for movement in movements]})


@require_GET
def api_feed_low_stock(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    items = FeedItem.objects.filter(owner=request.user, current_stock__lt=F("minimum_stock"))
    return JsonResponse({"items": [_serialize_feed_item(item) for item in items]})


@require_GET
def api_feed_reports(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    items = FeedItem.objects.filter(owner=request.user).select_related()
    report = []
    for item in items:
        total_in = item.movements.filter(movement_type__in=[FeedMovement.MovementType.STOCK_IN, FeedMovement.MovementType.CONSUMPTION]).aggregate(total=Sum("quantity"))["total"] or 0
        total_out = item.movements.filter(movement_type=FeedMovement.MovementType.STOCK_OUT).aggregate(total=Sum("quantity"))["total"] or 0
        report.append({
            "id": item.id,
            "name": item.name,
            "current_stock": float(item.current_stock),
            "total_in": float(total_in),
            "total_out": float(total_out),
            "minimum_stock": float(item.minimum_stock),
        })
    return JsonResponse({"report": report})


@login_required(login_url="/login")
def home(request):
    return render(request, 'main/home.html')


def sign_up(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('/home')
    else:
        form = RegisterForm()

    return render(request, 'registration/sign_up.html', {"form": form})
