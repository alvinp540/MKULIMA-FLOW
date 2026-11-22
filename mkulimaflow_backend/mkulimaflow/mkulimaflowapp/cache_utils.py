"""User-scoped response caching and cache invalidation helpers.

All application data is scoped to the owner of a farm, so cached responses are
namespaced by user id and a per-user version.  Writes to any model that feeds a
cached endpoint bump that version, which avoids serving stale data without
having to enumerate every possible cache key.
"""

from functools import wraps
from hashlib import sha256

from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse

VERSION_KEY = "mkl:version:user:{user_id}"
RESPONSE_KEY = "mkl:resp:{namespace}:u{user_id}:v{version}:{digest}"

# Models whose changes can affect a cached, owner-scoped response.
CACHE_MODELS = (
    "Farm",
    "UserSettings",
    "Flock",
    "EggProduction",
    "FeedItem",
    "FeedMovement",
    "HealthRecord",
    "VaccinationPlan",
    "VaccinationRecord",
    "DiseaseCase",
    "TreatmentRecord",
    "MortalityRecord",
    "VeterinaryVisit",
    "HealthSchedule",
)


def cache_version(user_id):
    """Return the current cache generation for a user."""
    return cache.get_or_set(VERSION_KEY.format(user_id=user_id), 1, None)


def bump_user_cache(user_id):
    """Invalidate every cached response belonging to a user."""
    if user_id is None:
        return
    key = VERSION_KEY.format(user_id=user_id)
    try:
        cache.incr(key)
    except (TypeError, ValueError):
        # The key can be evicted between reads; recreate it at the next version.
        cache.set(key, 2, None)


def cached_user_view(namespace, timeout=None):
    """Cache a successful GET response for the authenticated user.

    Query parameters and URL arguments are part of the key, and every key is
    tied to the user's cache version.  Non-GET requests, anonymous requests and
    responses that set cookies are never cached.
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, "user", None)
            if request.method != "GET" or user is None or not user.is_authenticated:
                return view_func(request, *args, **kwargs)

            params = "&".join(
                f"{key}={value}"
                for key in sorted(request.GET)
                for value in request.GET.getlist(key)
            )
            route = repr((args, sorted(kwargs.items())))
            digest = sha256(f"{params}|{route}".encode("utf-8")).hexdigest()[:20]
            key = RESPONSE_KEY.format(
                namespace=namespace,
                user_id=user.pk,
                version=cache_version(user.pk),
                digest=digest,
            )

            cached = cache.get(key)
            if cached is not None:
                status, content, content_type = cached
                return HttpResponse(content, status=status, content_type=content_type)

            response = view_func(request, *args, **kwargs)
            if (
                response.status_code == 200
                and not response.cookies
                and "Set-Cookie" not in response.headers
            ):
                cache.set(
                    key,
                    (
                        response.status_code,
                        response.content,
                        response.headers.get("Content-Type", "application/json"),
                    ),
                    timeout if timeout is not None else settings.CACHE_TIMEOUT,
                )
            return response

        return wrapper

    return decorator


def _model(model_name):
    return apps.get_model("mkulimaflowapp", model_name)


def _farm_owner_id(farm_id):
    if not farm_id:
        return None
    return (
        _model("Farm")
        .objects.filter(pk=farm_id)
        .values_list("owner_id", flat=True)
        .first()
    )


def _feed_item_owner_id(feed_item_id):
    if not feed_item_id:
        return None
    return (
        _model("FeedItem")
        .objects.filter(pk=feed_item_id)
        .values_list("owner_id", flat=True)
        .first()
    )


def _flock_owner_id(flock_id):
    if not flock_id:
        return None
    return (
        _model("Flock")
        .objects.filter(pk=flock_id)
        .values_list("farm__owner_id", flat=True)
        .first()
    )


def _owner_id(instance, *, stored=False):
    """Resolve the user whose cached data is affected by this instance."""
    model = instance.__class__
    if stored:
        if not instance.pk:
            return None
        row = model.objects.filter(pk=instance.pk).first()
        if row is None:
            return None
        instance = row

    owner_id = getattr(instance, "owner_id", None)
    if owner_id:
        return owner_id

    if instance._meta.model_name == "flock":
        return _farm_owner_id(instance.farm_id)

    feed_item_id = getattr(instance, "feed_item_id", None)
    if feed_item_id:
        return _feed_item_owner_id(feed_item_id)

    flock_id = getattr(instance, "flock_id", None)
    if flock_id:
        return _flock_owner_id(flock_id)

    return None


def _remember_owner(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    instance._mkulimaflow_previous_owner_id = (
        _owner_id(instance, stored=True) if instance.pk else None
    )


def _invalidate_owner(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    owner_ids = {
        getattr(instance, "_mkulimaflow_previous_owner_id", None),
        _owner_id(instance),
    }
    for owner_id in owner_ids:
        bump_user_cache(owner_id)


def _invalidate_user(sender, instance, **kwargs):
    if not kwargs.get("raw"):
        bump_user_cache(instance.pk)


def _invalidate_group_membership(sender, instance, action, pk_set, **kwargs):
    if action in {"post_add", "post_remove", "post_clear"}:
        bump_user_cache(instance.pk)


def connect_cache_signals():
    """Connect invalidation signals once the app registry is ready."""
    from django.contrib.auth import get_user_model
    from django.db.models.signals import m2m_changed, post_delete, post_save, pre_save

    user_model = get_user_model()
    post_save.connect(
        _invalidate_user,
        sender=user_model,
        dispatch_uid="mkulimaflow.cache.user.post_save",
    )
    post_delete.connect(
        _invalidate_user,
        sender=user_model,
        dispatch_uid="mkulimaflow.cache.user.post_delete",
    )
    m2m_changed.connect(
        _invalidate_group_membership,
        sender=user_model.groups.through,
        dispatch_uid="mkulimaflow.cache.user.groups",
    )

    for model_name in CACHE_MODELS:
        model = _model(model_name)
        pre_save.connect(
            _remember_owner,
            sender=model,
            dispatch_uid=f"mkulimaflow.cache.{model_name}.pre_save",
        )
        post_save.connect(
            _invalidate_owner,
            sender=model,
            dispatch_uid=f"mkulimaflow.cache.{model_name}.post_save",
        )
        post_delete.connect(
            _invalidate_owner,
            sender=model,
            dispatch_uid=f"mkulimaflow.cache.{model_name}.post_delete",
        )
