import json

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .forms import RegisterForm
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
