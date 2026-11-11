import json
from datetime import datetime

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
from .models import (
    DiseaseCase,
    EggProduction,
    Farm,
    FeedItem,
    FeedMovement,
    Flock,
    HealthRecord,
    HealthSchedule,
    Medication,
    MortalityRecord,
    TreatmentRecord,
    UserSettings,
    VaccinationPlan,
    VaccinationRecord,
    VeterinaryVisit,
)
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


def _serialize_user_settings(settings_record):
    if settings_record is None:
        settings_record = UserSettings(owner=None)
    return {
        "id": settings_record.id,
        "full_name": settings_record.full_name,
        "email": settings_record.email,
        "phone": settings_record.phone,
        "timezone": settings_record.timezone,
        "farm_name": settings_record.farm_name,
        "farm_location": settings_record.farm_location,
        "production_focus": settings_record.production_focus,
        "currency": settings_record.currency,
        "day_start": settings_record.day_start.isoformat() if settings_record.day_start else "06:00:00",
        "auto_alerts": settings_record.auto_alerts,
        "weekly_digest": settings_record.weekly_digest,
        "low_stock_alert": settings_record.low_stock_alert,
        "mortality_alert": settings_record.mortality_alert,
        "email_reports": settings_record.email_reports,
        "updated_at": settings_record.updated_at.isoformat() if getattr(settings_record, "updated_at", None) else None,
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


def _serialize_health_record(record):
    return {
        "id": record.id,
        "flock_id": record.flock_id,
        "flock_name": record.flock.name,
        "record_date": record.record_date.isoformat(),
        "status": record.status,
        "body_temperature": float(record.body_temperature) if record.body_temperature is not None else None,
        "condition_score": record.condition_score,
        "observed_by": record.observed_by,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _serialize_vaccination_plan(plan):
    return {
        "id": plan.id,
        "flock_id": plan.flock_id,
        "flock_name": plan.flock.name,
        "vaccine_name": plan.vaccine_name,
        "scheduled_date": plan.scheduled_date.isoformat(),
        "due_date": plan.due_date.isoformat(),
        "status": plan.status,
        "administered_by": plan.administered_by,
        "notes": plan.notes,
        "created_at": plan.created_at.isoformat(),
        "updated_at": plan.updated_at.isoformat(),
    }


def _serialize_vaccination_record(record):
    return {
        "id": record.id,
        "flock_id": record.flock_id,
        "flock_name": record.flock.name,
        "vaccine_name": record.vaccine_name,
        "administered_date": record.administered_date.isoformat(),
        "batch_number": record.batch_number,
        "administered_by": record.administered_by,
        "notes": record.notes,
        "plan_id": record.plan_id,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _serialize_disease_case(disease):
    return {
        "id": disease.id,
        "flock_id": disease.flock_id,
        "flock_name": disease.flock.name,
        "disease_name": disease.disease_name,
        "diagnosis_date": disease.diagnosis_date.isoformat(),
        "severity": disease.severity,
        "status": disease.status,
        "symptoms": disease.symptoms,
        "diagnosis": disease.diagnosis,
        "treatment_plan": disease.treatment_plan,
        "notes": disease.notes,
        "created_at": disease.created_at.isoformat(),
        "updated_at": disease.updated_at.isoformat(),
    }


def _serialize_treatment_record(record):
    return {
        "id": record.id,
        "flock_id": record.flock_id,
        "flock_name": record.flock.name,
        "disease_case_id": record.disease_case_id,
        "treatment_name": record.treatment_name,
        "medication": record.medication,
        "dosage": record.dosage,
        "start_date": record.start_date.isoformat(),
        "end_date": record.end_date.isoformat() if record.end_date else None,
        "status": record.status,
        "veterinarian": record.veterinarian,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _serialize_mortality_record(record):
    return {
        "id": record.id,
        "flock_id": record.flock_id,
        "flock_name": record.flock.name,
        "record_date": record.record_date.isoformat(),
        "deaths": record.deaths,
        "culls": record.culls,
        "cause": record.cause,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _serialize_veterinary_visit(record):
    return {
        "id": record.id,
        "flock_id": record.flock_id,
        "flock_name": record.flock.name,
        "visit_date": record.visit_date.isoformat(),
        "veterinarian_name": record.veterinarian_name,
        "purpose": record.purpose,
        "findings": record.findings,
        "recommendations": record.recommendations,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _serialize_health_schedule(record):
    return {
        "id": record.id,
        "flock_id": record.flock_id,
        "flock_name": record.flock.name,
        "title": record.title,
        "category": record.category,
        "scheduled_for": record.scheduled_for.isoformat(),
        "status": record.status,
        "assigned_to": record.assigned_to,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
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


@require_http_methods(["GET", "PUT"])
def api_user_settings(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    settings_record, _ = UserSettings.objects.get_or_create(owner=request.user)

    if request.method == "PUT":
        data = _request_data(request)
        if data is None:
            return JsonResponse({"error": "Expected a JSON object."}, status=400)

        field_map = {
            "full_name": "full_name",
            "email": "email",
            "phone": "phone",
            "timezone": "timezone",
            "farm_name": "farm_name",
            "farm_location": "farm_location",
            "production_focus": "production_focus",
            "currency": "currency",
            "day_start": "day_start",
            "auto_alerts": "auto_alerts",
            "weekly_digest": "weekly_digest",
            "low_stock_alert": "low_stock_alert",
            "mortality_alert": "mortality_alert",
            "email_reports": "email_reports",
        }

        for request_field, model_field in field_map.items():
            if request_field not in data:
                continue

            value = data.get(request_field)
            if value is None:
                continue

            if model_field == "day_start" and value:
                try:
                    value = datetime.strptime(str(value), "%H:%M").time()
                except ValueError:
                    return JsonResponse({"error": "Day start time must be in HH:MM format."}, status=400)

            setattr(settings_record, model_field, value)

        if not settings_record.email and request.user.email:
            settings_record.email = request.user.email
        if not settings_record.full_name:
            name_parts = [request.user.first_name, request.user.last_name]
            settings_record.full_name = " ".join(part.strip() for part in name_parts if part.strip())

        settings_record.save()
        return JsonResponse(_serialize_user_settings(settings_record))

    return JsonResponse({"settings": _serialize_user_settings(settings_record)})


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


@require_GET
def api_health_dashboard(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    flocks = Flock.objects.filter(farm__owner=request.user).select_related("farm")
    records = HealthRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")
    plans = VaccinationPlan.objects.filter(flock__farm__owner=request.user).select_related("flock")
    disease_cases = DiseaseCase.objects.filter(flock__farm__owner=request.user).select_related("flock")
    mortality = MortalityRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")

    total_flocks = flocks.count()
    active_disease_cases = disease_cases.filter(status__in=[DiseaseCase.Status.OPEN, DiseaseCase.Status.MONITORING]).count()
    vaccinations_due = plans.filter(status__in=[VaccinationPlan.Status.PENDING, VaccinationPlan.Status.OVERDUE]).count()
    total_birds = flocks.aggregate(total=Sum("initial_quantity"))["total"] or 0
    total_deaths = mortality.aggregate(total=Sum("deaths"))["total"] or 0
    mortality_rate = round((total_deaths / total_birds) * 100, 2) if total_birds else 0
    healthy_flocks = records.filter(status=HealthRecord.Status.HEALTHY).values_list("flock_id", flat=True).distinct().count()

    alerts = []
    if active_disease_cases:
        alerts.append({"type": "disease", "title": "Active disease cases", "message": f"{active_disease_cases} flock health cases need attention."})
    if vaccinations_due:
        alerts.append({"type": "vaccination", "title": "Vaccinations due", "message": f"{vaccinations_due} vaccination activities are due or overdue."})
    if not alerts:
        alerts.append({"type": "healthy", "title": "All clear", "message": "No critical health alerts were raised for the current farm records."})

    return JsonResponse({
        "summary": {
            "healthy_flocks": healthy_flocks,
            "active_disease_cases": active_disease_cases,
            "vaccinations_due": vaccinations_due,
            "mortality_rate": mortality_rate,
            "total_flocks": total_flocks,
            "total_birds": total_birds,
        },
        "alerts": alerts,
    })


@require_http_methods(["GET", "POST"])
def api_health_records(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        record_date = str(data.get("record_date") or "").strip()
        if not record_date:
            return JsonResponse({"error": "Record date is required."}, status=400)

        temp = data.get("body_temperature")
        try:
            body_temperature = float(temp) if temp not in (None, "") else None
        except (TypeError, ValueError):
            return JsonResponse({"error": "Body temperature must be numeric."}, status=400)

        record = HealthRecord.objects.create(
            flock=flock,
            record_date=record_date,
            status=str(data.get("status") or HealthRecord.Status.HEALTHY),
            body_temperature=body_temperature,
            condition_score=str(data.get("condition_score") or "").strip(),
            observed_by=str(data.get("observed_by") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_health_record(record), status=201)

    records = HealthRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_health_record(record) for record in records]})


@require_http_methods(["GET", "POST"])
def api_health_vaccinations(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        vaccine_name = str(data.get("vaccine_name") or "").strip()
        if not vaccine_name:
            return JsonResponse({"error": "Vaccine name is required."}, status=400)

        plan = VaccinationPlan.objects.create(
            flock=flock,
            vaccine_name=vaccine_name,
            scheduled_date=data.get("scheduled_date") or timezone.now().date().isoformat(),
            due_date=data.get("due_date") or timezone.now().date().isoformat(),
            status=str(data.get("status") or VaccinationPlan.Status.PENDING),
            administered_by=str(data.get("administered_by") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )

        if data.get("administered_date"):
            VaccinationRecord.objects.create(
                flock=flock,
                vaccine_name=vaccine_name,
                administered_date=data.get("administered_date"),
                batch_number=str(data.get("batch_number") or "").strip(),
                administered_by=str(data.get("administered_by") or "").strip(),
                notes=str(data.get("notes") or "").strip(),
                plan=plan,
            )

        return JsonResponse(_serialize_vaccination_plan(plan), status=201)

    plans = VaccinationPlan.objects.filter(flock__farm__owner=request.user).select_related("flock")
    records = VaccinationRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({
        "plans": [_serialize_vaccination_plan(plan) for plan in plans],
        "records": [_serialize_vaccination_record(record) for record in records],
    })


@require_http_methods(["GET", "POST"])
def api_health_diseases(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        disease_name = str(data.get("disease_name") or "").strip()
        if not disease_name:
            return JsonResponse({"error": "Disease name is required."}, status=400)

        record = DiseaseCase.objects.create(
            flock=flock,
            disease_name=disease_name,
            diagnosis_date=data.get("diagnosis_date") or timezone.now().date().isoformat(),
            severity=str(data.get("severity") or DiseaseCase.Severity.MILD),
            status=str(data.get("status") or DiseaseCase.Status.OPEN),
            symptoms=str(data.get("symptoms") or "").strip(),
            diagnosis=str(data.get("diagnosis") or "").strip(),
            treatment_plan=str(data.get("treatment_plan") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_disease_case(record), status=201)

    cases = DiseaseCase.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"cases": [_serialize_disease_case(case) for case in cases]})


@require_http_methods(["GET", "POST"])
def api_health_treatments(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        treatment_name = str(data.get("treatment_name") or "").strip()
        if not treatment_name:
            return JsonResponse({"error": "Treatment name is required."}, status=400)

        disease_case = None
        disease_case_id = data.get("disease_case_id")
        if disease_case_id:
            try:
                disease_case = DiseaseCase.objects.get(id=disease_case_id, flock__farm__owner=request.user)
            except DiseaseCase.DoesNotExist:
                return JsonResponse({"error": "Disease case not found."}, status=404)

        record = TreatmentRecord.objects.create(
            flock=flock,
            disease_case=disease_case,
            treatment_name=treatment_name,
            medication=str(data.get("medication") or "").strip(),
            dosage=str(data.get("dosage") or "").strip(),
            start_date=data.get("start_date") or timezone.now().date().isoformat(),
            end_date=data.get("end_date") or None,
            status=str(data.get("status") or TreatmentRecord.Status.PENDING),
            veterinarian=str(data.get("veterinarian") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_treatment_record(record), status=201)

    records = TreatmentRecord.objects.filter(flock__farm__owner=request.user).select_related("flock", "disease_case")
    return JsonResponse({"records": [_serialize_treatment_record(record) for record in records]})


@require_http_methods(["GET", "POST"])
def api_health_mortality(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        try:
            deaths = int(data.get("deaths", 0) or 0)
            culls = int(data.get("culls", 0) or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Deaths and culls must be numeric."}, status=400)

        record = MortalityRecord.objects.create(
            flock=flock,
            record_date=data.get("record_date") or timezone.now().date().isoformat(),
            deaths=deaths,
            culls=culls,
            cause=str(data.get("cause") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_mortality_record(record), status=201)

    records = MortalityRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_mortality_record(record) for record in records]})


@require_http_methods(["GET", "POST"])
def api_health_schedules(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        record = HealthSchedule.objects.create(
            flock=flock,
            title=str(data.get("title") or "").strip(),
            category=str(data.get("category") or HealthSchedule.Category.CHECKUP),
            scheduled_for=data.get("scheduled_for") or timezone.now().date().isoformat(),
            status=str(data.get("status") or HealthSchedule.Status.PENDING),
            assigned_to=str(data.get("assigned_to") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_health_schedule(record), status=201)

    records = HealthSchedule.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_health_schedule(record) for record in records]})


@require_http_methods(["GET", "POST"])
def api_health_veterinary_visits(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

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

        veterinarian_name = str(data.get("veterinarian_name") or "").strip()
        if not veterinarian_name:
            return JsonResponse({"error": "Veterinarian name is required."}, status=400)

        record = VeterinaryVisit.objects.create(
            flock=flock,
            visit_date=data.get("visit_date") or timezone.now().date().isoformat(),
            veterinarian_name=veterinarian_name,
            purpose=str(data.get("purpose") or "").strip(),
            findings=str(data.get("findings") or "").strip(),
            recommendations=str(data.get("recommendations") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_veterinary_visit(record), status=201)

    records = VeterinaryVisit.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_veterinary_visit(record) for record in records]})


@require_GET
def api_health_reports(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    flocks = Flock.objects.filter(farm__owner=request.user).select_related("farm")
    records = HealthRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")
    cases = DiseaseCase.objects.filter(flock__farm__owner=request.user).select_related("flock")
    schedules = HealthSchedule.objects.filter(flock__farm__owner=request.user).select_related("flock")

    report = {
        "total_flocks": flocks.count(),
        "healthy_flocks": records.filter(status=HealthRecord.Status.HEALTHY).values_list("flock_id", flat=True).distinct().count(),
        "total_cases": cases.count(),
        "open_cases": cases.filter(status=DiseaseCase.Status.OPEN).count(),
        "scheduled_checks": schedules.filter(status=HealthSchedule.Status.PENDING).count(),
        "status_distribution": {
            "healthy": records.filter(status=HealthRecord.Status.HEALTHY).count(),
            "watch": records.filter(status=HealthRecord.Status.WATCH).count(),
            "sick": records.filter(status=HealthRecord.Status.SICK).count(),
            "critical": records.filter(status=HealthRecord.Status.CRITICAL).count(),
        },
    }
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
