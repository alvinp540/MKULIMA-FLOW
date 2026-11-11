import json

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .forms import RegisterForm
from .models import Farm, Flock
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
