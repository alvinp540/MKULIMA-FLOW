import json
import re
import secrets
from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, connection, transaction
from django.db.models import F, Sum
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.dateparse import parse_date
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from . import mpesa
from .cache_utils import cached_user_view
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
    MpesaPayment,
    OnlinePayment,
    TreatmentRecord,
    UserSettings,
    VaccinationPlan,
    VaccinationRecord,
    VeterinaryVisit,
)
from .plans import exchange_rate, plan_list, plan_payload
from .roles import ROLE_CHOICES


def _request_data(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _read_date(data, field, label, *, required=False):
    """Return (date, error_response) for a request field.

    Parsing dates before saving keeps the in-memory model instance storing a
    real ``date`` object, so serializers can safely call ``isoformat()`` on the
    response.  It also turns malformed dates into a 400 instead of a 500.
    """
    raw = data.get(field)
    if raw in (None, ""):
        if required:
            return None, JsonResponse({"error": f"{label} is required."}, status=400)
        return None, None

    parsed = parse_date(str(raw).strip())
    if parsed is None:
        return None, JsonResponse(
            {"error": f"{label} must be a valid date (YYYY-MM-DD)."},
            status=400,
        )
    return parsed, None


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


@require_POST
def api_change_password(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    current_password = str(data.get("current_password") or "")
    new_password = str(data.get("new_password") or "")
    confirm_password = str(data.get("confirm_password") or "")

    if not all((current_password, new_password, confirm_password)):
        return JsonResponse({"error": "Current password, new password, and confirmation are required."}, status=400)

    if not request.user.check_password(current_password):
        return JsonResponse({"error": "Current password is incorrect."}, status=400)

    if new_password != confirm_password:
        return JsonResponse({"error": "New password and confirmation do not match."}, status=400)

    if len(new_password) < 8:
        return JsonResponse({"error": "New password must be at least 8 characters long."}, status=400)

    if current_password == new_password:
        return JsonResponse({"error": "New password must be different from the current password."}, status=400)

    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    return JsonResponse({"success": True, "message": "Password updated successfully."})


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


@cached_user_view("farms")
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


@cached_user_view("flocks")
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

        acquisition_date, date_error = _read_date(
            data, "acquisition_date", "Acquisition date", required=True
        )
        if date_error is not None:
            return date_error

        payload = {
            "name": str(data.get("name") or "").strip(),
            "poultry_type": str(data.get("poultry_type") or Flock.PoultryType.LAYER),
            "breed": str(data.get("breed") or "").strip(),
            "initial_quantity": data.get("initial_quantity"),
            "acquisition_date": acquisition_date,
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


@cached_user_view("flock_detail")
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
        acquisition_date, date_error = _read_date(
            data, "acquisition_date", "Acquisition date", required=True
        )
        if date_error is not None:
            return date_error
        flock.acquisition_date = acquisition_date

    try:
        flock.full_clean()
        flock.save()
    except ValidationError as exc:
        return JsonResponse({"error": exc.message_dict if hasattr(exc, "message_dict") else str(exc)}, status=400)

    return JsonResponse(_serialize_flock(flock))


@cached_user_view("egg_production")
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

        collection_date, date_error = _read_date(
            data, "collection_date", "Collection date", required=True
        )
        if date_error is not None:
            return date_error

        eggs_collected = data.get("eggs_collected")
        broken_eggs = data.get("broken_eggs")
        quality_grade = str(data.get("quality_grade") or EggProduction.QualityGrade.GRADE_A).strip()
        notes = str(data.get("notes") or "").strip()

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


@cached_user_view("egg_detail")
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
        collection_date, date_error = _read_date(
            data, "collection_date", "Collection date", required=True
        )
        if date_error is not None:
            return date_error
        record.collection_date = collection_date

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


@cached_user_view("feed_items")
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

        expiry_date, date_error = _read_date(data, "expiry_date", "Expiry date")
        if date_error is not None:
            return date_error

        payload = {
            "name": name,
            "category": str(data.get("category") or FeedItem.Category.LAYER_MASH),
            "brand": str(data.get("brand") or "").strip(),
            "unit": str(data.get("unit") or "kg").strip() or "kg",
            "unit_cost": data.get("unit_cost", 0),
            "minimum_stock": data.get("minimum_stock", 0),
            "current_stock": data.get("current_stock", 0),
            "supplier": str(data.get("supplier") or "").strip(),
            "expiry_date": expiry_date,
            "notes": str(data.get("notes") or "").strip(),
        }

        try:
            item = FeedItem.objects.create(owner=request.user, **payload)
        except (IntegrityError, ValidationError) as exc:
            return JsonResponse({"error": str(exc)}, status=400)

        return JsonResponse(_serialize_feed_item(item), status=201)

    return JsonResponse({"items": [_serialize_feed_item(item) for item in items]})


@cached_user_view("feed_stock")
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

        movement_date, date_error = _read_date(data, "movement_date", "Movement date")
        if date_error is not None:
            return date_error
        movement_date = movement_date or timezone.now().date()

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
                movement_date=movement_date,
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

        movement_date, date_error = _read_date(data, "movement_date", "Movement date")
        if date_error is not None:
            return date_error
        movement_date = movement_date or timezone.now().date()

        with transaction.atomic():
            item.current_stock = float(item.current_stock) - quantity
            item.save(update_fields=["current_stock", "updated_at"])

            movement = FeedMovement.objects.create(
                feed_item=item,
                flock=flock,
                movement_type=FeedMovement.MovementType.STOCK_OUT,
                quantity=quantity,
                movement_date=movement_date,
                reference=str(data.get("reference") or "").strip(),
                notes=str(data.get("notes") or "").strip(),
            )

        return JsonResponse(_serialize_feed_movement(movement), status=201)

    return JsonResponse({"movements": []})


@cached_user_view("feed_movements")
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


@cached_user_view("feed_consumption")
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

        movement_date, date_error = _read_date(data, "movement_date", "Movement date")
        if date_error is not None:
            return date_error
        movement_date = movement_date or timezone.now().date()

        with transaction.atomic():
            item.current_stock = float(item.current_stock) - quantity
            item.save(update_fields=["current_stock", "updated_at"])

            movement = FeedMovement.objects.create(
                feed_item=item,
                flock=flock,
                movement_type=FeedMovement.MovementType.CONSUMPTION,
                quantity=quantity,
                movement_date=movement_date,
                reference=str(data.get("reference") or "").strip(),
                notes=str(data.get("notes") or "").strip(),
            )

        return JsonResponse(_serialize_feed_movement(movement), status=201)

    movements = FeedMovement.objects.filter(feed_item__owner=request.user, movement_type=FeedMovement.MovementType.CONSUMPTION).select_related("feed_item", "flock")
    return JsonResponse({"movements": [_serialize_feed_movement(movement) for movement in movements]})


@cached_user_view("feed_low_stock")
@require_GET
def api_feed_low_stock(request):
    response = _ensure_authenticated(request)
    if response is not None:
        return response

    items = FeedItem.objects.filter(owner=request.user, current_stock__lt=F("minimum_stock"))
    return JsonResponse({"items": [_serialize_feed_item(item) for item in items]})


@cached_user_view("feed_reports")
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


@cached_user_view("health_dashboard")
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


@cached_user_view("health_records")
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

        record_date, date_error = _read_date(
            data, "record_date", "Record date", required=True
        )
        if date_error is not None:
            return date_error

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


@cached_user_view("health_vaccinations")
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

        scheduled_date, date_error = _read_date(
            data, "scheduled_date", "Scheduled date"
        )
        if date_error is not None:
            return date_error
        due_date, date_error = _read_date(data, "due_date", "Due date")
        if date_error is not None:
            return date_error
        administered_date, date_error = _read_date(
            data, "administered_date", "Administered date"
        )
        if date_error is not None:
            return date_error

        plan = VaccinationPlan.objects.create(
            flock=flock,
            vaccine_name=vaccine_name,
            scheduled_date=scheduled_date or timezone.now().date(),
            due_date=due_date or timezone.now().date(),
            status=str(data.get("status") or VaccinationPlan.Status.PENDING),
            administered_by=str(data.get("administered_by") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )

        if administered_date:
            VaccinationRecord.objects.create(
                flock=flock,
                vaccine_name=vaccine_name,
                administered_date=administered_date,
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


@cached_user_view("health_diseases")
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

        diagnosis_date, date_error = _read_date(
            data, "diagnosis_date", "Diagnosis date"
        )
        if date_error is not None:
            return date_error

        record = DiseaseCase.objects.create(
            flock=flock,
            disease_name=disease_name,
            diagnosis_date=diagnosis_date or timezone.now().date(),
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


@cached_user_view("health_treatments")
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

        start_date, date_error = _read_date(data, "start_date", "Start date")
        if date_error is not None:
            return date_error
        end_date, date_error = _read_date(data, "end_date", "End date")
        if date_error is not None:
            return date_error

        record = TreatmentRecord.objects.create(
            flock=flock,
            disease_case=disease_case,
            treatment_name=treatment_name,
            medication=str(data.get("medication") or "").strip(),
            dosage=str(data.get("dosage") or "").strip(),
            start_date=start_date or timezone.now().date(),
            end_date=end_date,
            status=str(data.get("status") or TreatmentRecord.Status.PENDING),
            veterinarian=str(data.get("veterinarian") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_treatment_record(record), status=201)

    records = TreatmentRecord.objects.filter(flock__farm__owner=request.user).select_related("flock", "disease_case")
    return JsonResponse({"records": [_serialize_treatment_record(record) for record in records]})


@cached_user_view("health_mortality")
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

        if deaths < 0 or culls < 0:
            return JsonResponse({"error": "Deaths and culls cannot be negative."}, status=400)

        record_date, date_error = _read_date(data, "record_date", "Record date")
        if date_error is not None:
            return date_error

        record = MortalityRecord.objects.create(
            flock=flock,
            record_date=record_date or timezone.now().date(),
            deaths=deaths,
            culls=culls,
            cause=str(data.get("cause") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_mortality_record(record), status=201)

    records = MortalityRecord.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_mortality_record(record) for record in records]})


@cached_user_view("health_schedules")
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

        title = str(data.get("title") or "").strip()
        if not title:
            return JsonResponse({"error": "Schedule title is required."}, status=400)

        scheduled_for, date_error = _read_date(
            data, "scheduled_for", "Scheduled date"
        )
        if date_error is not None:
            return date_error

        record = HealthSchedule.objects.create(
            flock=flock,
            title=title,
            category=str(data.get("category") or HealthSchedule.Category.CHECKUP),
            scheduled_for=scheduled_for or timezone.now().date(),
            status=str(data.get("status") or HealthSchedule.Status.PENDING),
            assigned_to=str(data.get("assigned_to") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_health_schedule(record), status=201)

    records = HealthSchedule.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_health_schedule(record) for record in records]})


@cached_user_view("health_vet_visits")
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

        visit_date, date_error = _read_date(data, "visit_date", "Visit date")
        if date_error is not None:
            return date_error

        record = VeterinaryVisit.objects.create(
            flock=flock,
            visit_date=visit_date or timezone.now().date(),
            veterinarian_name=veterinarian_name,
            purpose=str(data.get("purpose") or "").strip(),
            findings=str(data.get("findings") or "").strip(),
            recommendations=str(data.get("recommendations") or "").strip(),
            notes=str(data.get("notes") or "").strip(),
        )
        return JsonResponse(_serialize_veterinary_visit(record), status=201)

    records = VeterinaryVisit.objects.filter(flock__farm__owner=request.user).select_related("flock")
    return JsonResponse({"records": [_serialize_veterinary_visit(record) for record in records]})


@cached_user_view("health_reports")
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


def _mpesa_payment_payload(payment):
    return {
        "reference": str(payment.reference),
        "provider": "mpesa",
        "plan": payment.plan,
        "amount_usd": f"{float(payment.amount_usd):.2f}",
        "amount_kes": payment.amount_kes,
        "phone_number": payment.phone_number,
        "status": payment.status,
        "demo": payment.demo,
        "mpesa_receipt": payment.mpesa_receipt,
        "result_code": payment.result_code,
        "result_desc": payment.result_desc,
        "account_reference": payment.account_reference,
        "created_at": payment.created_at.isoformat(),
    }


@require_GET
def api_mpesa_config(request):
    configured = mpesa.is_configured()
    demo_mode = bool(settings.PAYMENTS_DEMO_MODE and not configured)

    if configured:
        message = (
            "Pay securely with M-Pesa. You will receive an STK Push prompt on your phone."
        )
    elif demo_mode:
        message = (
            "Demo mode: M-Pesa credentials are not configured, so no money will be charged."
        )
    else:
        message = "M-Pesa payments are not available yet. Please contact support."

    return JsonResponse(
        {
            "provider": "M-Pesa",
            "currency": "KES",
            "environment": settings.MPESA_ENV,
            "usd_to_kes_rate": float(exchange_rate()),
            "configured": configured,
            "demo_mode": demo_mode,
            "enabled": configured or demo_mode,
            "message": message,
            "plans": plan_list(),
        }
    )


@require_POST
def api_mpesa_initiate(request):
    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    plan_key = str(data.get("plan") or "").strip()
    try:
        plan = plan_payload(plan_key)
    except KeyError:
        return JsonResponse({"error": "Choose a valid payment plan."}, status=400)

    try:
        phone = mpesa.normalize_phone(data.get("phone_number"))
    except ValueError as error:
        return JsonResponse({"error": str(error)}, status=400)

    configured = mpesa.is_configured()
    demo_mode = bool(settings.PAYMENTS_DEMO_MODE and not configured)
    if not configured and not demo_mode:
        return JsonResponse(
            {"error": "M-Pesa payments are not available yet. Please contact support."},
            status=503,
        )

    payment = MpesaPayment.objects.create(
        user=request.user if request.user.is_authenticated else None,
        plan=plan_key,
        amount_usd=plan["amount_usd"],
        amount_kes=plan["amount_kes"],
        phone_number=phone,
        account_reference=f"MF{secrets.token_hex(3).upper()}",
        status=MpesaPayment.Status.PENDING,
    )

    if demo_mode:
        payment.demo = True
        payment.status = MpesaPayment.Status.SUCCESS
        payment.mpesa_receipt = f"DEMO{secrets.token_hex(4).upper()}"
        payment.result_code = "0"
        payment.result_desc = "Demo payment completed. No money was moved."
        payment.raw_response = {"demo": True}
        payment.save()
        return JsonResponse(
            {
                **_mpesa_payment_payload(payment),
                "message": payment.result_desc,
            },
            status=201,
        )

    callback_url = settings.MPESA_CALLBACK_URL or request.build_absolute_uri(
        reverse("api_mpesa_callback")
    )
    if settings.MPESA_CALLBACK_SECRET:
        separator = "&" if "?" in callback_url else "?"
        callback_url = (
            f"{callback_url}{separator}token={settings.MPESA_CALLBACK_SECRET}"
        )

    try:
        result = mpesa.stk_push(
            phone=phone,
            amount=plan["amount_kes"],
            account_reference=payment.account_reference,
            description=plan["description"],
            callback_url=callback_url,
        )
    except mpesa.MpesaError as error:
        payment.status = MpesaPayment.Status.FAILED
        payment.result_code = "request-error"
        payment.result_desc = str(error)[:255]
        payment.save()
        return JsonResponse(
            {
                "error": "We could not start the M-Pesa request. Please try again.",
                "detail": str(error)[:400],
                "reference": str(payment.reference),
                "status": payment.status,
            },
            status=502,
        )

    payment.merchant_request_id = str(result.get("MerchantRequestID") or "")
    payment.checkout_request_id = str(result.get("CheckoutRequestID") or "")
    payment.raw_response = result
    if str(result.get("ResponseCode")) == "0":
        payment.result_code = "0"
        payment.result_desc = str(
            result.get("CustomerMessage") or "STK Push sent. Check your phone."
        )[:255]
    else:
        payment.status = MpesaPayment.Status.FAILED
        payment.result_code = str(result.get("ResponseCode") or "")[:16]
        payment.result_desc = str(
            result.get("ResponseDescription") or "M-Pesa request failed."
        )[:255]
    payment.save()

    if payment.status == MpesaPayment.Status.FAILED:
        return JsonResponse(
            {
                "error": payment.result_desc or "M-Pesa could not start the payment.",
                "reference": str(payment.reference),
                "status": payment.status,
            },
            status=502,
        )

    return JsonResponse(
        {
            **_mpesa_payment_payload(payment),
            "message": "Enter your M-Pesa PIN on the prompt sent to your phone.",
        },
        status=201,
    )


@require_GET
def api_mpesa_status(request, reference):
    payment = MpesaPayment.objects.filter(reference=reference).first()
    if payment is None:
        return JsonResponse({"error": "Payment not found."}, status=404)

    should_query = (
        payment.status == MpesaPayment.Status.PENDING
        and not payment.demo
        and payment.checkout_request_id
        and mpesa.is_configured()
        and timezone.now() - payment.updated_at >= timedelta(seconds=5)
    )

    if should_query:
        try:
            result = mpesa.query_status(payment.checkout_request_id)
        except mpesa.MpesaError:
            result = None

        if result:
            payment.raw_response = {**payment.raw_response, "query": result}
            code = result.get("ResultCode")
            if code is not None:
                code = str(code)
                payment.result_code = code[:16]
                payment.result_desc = str(result.get("ResultDesc") or "")[:255]
                if code == "0":
                    payment.status = MpesaPayment.Status.SUCCESS
                elif code == "1032":
                    payment.status = MpesaPayment.Status.CANCELLED
                else:
                    payment.status = MpesaPayment.Status.FAILED
            payment.save()

    return JsonResponse(_mpesa_payment_payload(payment))


@csrf_exempt
@require_POST
def api_mpesa_callback(request):
    if settings.MPESA_CALLBACK_SECRET and (
        request.GET.get("token") != settings.MPESA_CALLBACK_SECRET
    ):
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Invalid callback token."}, status=403
        )

    data = _request_data(request)
    if data is None:
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Invalid callback payload."}, status=400
        )

    callback = (data.get("Body") or {}).get("stkCallback") or {}
    checkout_request_id = str(callback.get("CheckoutRequestID") or "")
    payment = (
        MpesaPayment.objects.filter(checkout_request_id=checkout_request_id).first()
        if checkout_request_id
        else None
    )

    if payment is not None:
        metadata_items = (callback.get("CallbackMetadata") or {}).get("Item") or []
        metadata = {
            str(item.get("Name")): item.get("Value")
            for item in metadata_items
            if isinstance(item, dict)
        }

        code = callback.get("ResultCode")
        receipt = metadata.get("MpesaReceiptNumber")
        payment.raw_callback = data
        payment.result_code = str(code if code is not None else "")[:16]
        payment.result_desc = str(callback.get("ResultDesc") or "")[:255]
        if receipt:
            payment.mpesa_receipt = str(receipt)[:40]

        if str(code) == "0":
            payment.status = MpesaPayment.Status.SUCCESS
        elif str(code) == "1032":
            payment.status = MpesaPayment.Status.CANCELLED
        else:
            payment.status = MpesaPayment.Status.FAILED
        payment.save()

    return JsonResponse({"ResultCode": 0, "ResultDesc": "Callback received."})


def _mpesa_method_payload():
    configured = mpesa.is_configured()
    demo_mode = bool(settings.PAYMENTS_DEMO_MODE and not configured)

    if configured:
        message = (
            "Pay securely with M-Pesa. You will receive an STK Push prompt on your phone."
        )
    elif demo_mode:
        message = (
            "Demo mode: M-Pesa credentials are not configured, so no money will be charged."
        )
    else:
        message = "M-Pesa payments are not available yet. Please contact support."

    return {
        "key": "mpesa",
        "label": "M-Pesa",
        "currency": "KES",
        "enabled": configured or demo_mode,
        "demo_mode": demo_mode,
        "message": message,
    }


def _online_method_payload(key, label):
    demo_mode = bool(settings.PAYMENTS_DEMO_MODE)

    if demo_mode:
        message = f"Demo mode: no real {label} charge will be made."
    else:
        message = f"{label} checkout is not enabled on this server yet."

    return {
        "key": key,
        "label": label,
        "currency": "USD",
        "enabled": demo_mode,
        "demo_mode": demo_mode,
        "message": message,
    }


def _online_payment_payload(payment):
    return {
        "reference": str(payment.reference),
        "provider": payment.provider,
        "plan": payment.plan,
        "amount_usd": f"{float(payment.amount_usd):.2f}",
        "email": payment.email,
        "cardholder_name": payment.cardholder_name,
        "status": payment.status,
        "demo": payment.demo,
        "receipt": payment.receipt,
        "result_desc": payment.result_desc,
        "created_at": payment.created_at.isoformat(),
    }


@require_GET
def api_payment_config(request):
    methods = [
        _mpesa_method_payload(),
        _online_method_payload("visa", "Visa"),
        _online_method_payload("paypal", "PayPal"),
    ]

    return JsonResponse(
        {
            "currency": "KES",
            "usd_to_kes_rate": float(exchange_rate()),
            "demo_mode": any(method["demo_mode"] for method in methods),
            "enabled": any(method["enabled"] for method in methods),
            "plans": plan_list(),
            "methods": methods,
        }
    )


@require_POST
def api_online_payment_initiate(request):
    data = _request_data(request)
    if data is None:
        return JsonResponse({"error": "Expected a JSON object."}, status=400)

    provider = str(data.get("provider") or "").strip().lower()
    if provider not in OnlinePayment.Provider.values:
        return JsonResponse({"error": "Choose a valid card or PayPal option."}, status=400)

    plan_key = str(data.get("plan") or "").strip()
    try:
        plan = plan_payload(plan_key)
    except KeyError:
        return JsonResponse({"error": "Choose a valid payment plan."}, status=400)

    email = str(data.get("email") or "").strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return JsonResponse({"error": "Enter a valid email address for your receipt."}, status=400)

    cardholder_name = str(data.get("cardholder_name") or "").strip()
    if provider == OnlinePayment.Provider.VISA and len(cardholder_name) < 2:
        return JsonResponse({"error": "Enter the cardholder name."}, status=400)

    if not settings.PAYMENTS_DEMO_MODE:
        return JsonResponse(
            {
                "error": "Visa and PayPal checkout are not enabled on this server yet."
            },
            status=503,
        )

    label = "Visa" if provider == OnlinePayment.Provider.VISA else "PayPal"
    payment = OnlinePayment.objects.create(
        user=request.user if request.user.is_authenticated else None,
        provider=provider,
        plan=plan_key,
        amount_usd=plan["amount_usd"],
        email=email,
        cardholder_name=cardholder_name,
        status=OnlinePayment.Status.PENDING,
        demo=True,
    )
    payment.status = OnlinePayment.Status.SUCCESS
    payment.receipt = f"{provider.upper()}{secrets.token_hex(4).upper()}"
    payment.result_desc = f"Demo {label} payment completed. No money was moved."
    payment.raw_response = {"demo": True}
    payment.save()

    return JsonResponse(
        {
            **_online_payment_payload(payment),
            "message": payment.result_desc,
        },
        status=201,
    )


@require_GET
def api_online_payment_status(request, reference):
    payment = OnlinePayment.objects.filter(reference=reference).first()
    if payment is None:
        return JsonResponse({"error": "Payment not found."}, status=404)
    return JsonResponse(_online_payment_payload(payment))


@require_GET
def api_health(request):
    """Lightweight liveness probe; no database or Redis access."""
    return JsonResponse({"status": "ok"})


@require_GET
def api_health_db(request):
    """Database readiness probe; returns 503 when PostgreSQL is unavailable."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return JsonResponse({"status": "error", "database": "unavailable"}, status=503)
    return JsonResponse({"status": "ok", "database": "ok"})


@require_GET
def spa_index(request):
    index_path = settings.FRONTEND_DIST / "index.html"
    if not index_path.is_file():
        return JsonResponse(
            {"error": "Frontend build not found. Run npm run build first."},
            status=404,
        )

    response = HttpResponse(
        index_path.read_text(encoding="utf-8"),
        content_type="text/html",
    )
    response["Cache-Control"] = "no-cache"
    return response


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
