from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import MultipleObjectsReturned
from django.db.models import Q

from .roles import ROLE_CHOICES


class RoleAuthenticationBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, role=None, **kwargs):
        if username is None or password is None:
            return None

        if role is None:
            return super().authenticate(
                request, username=username, password=password, **kwargs
            )

        if role not in dict(ROLE_CHOICES):
            return None

        user_model = get_user_model()
        try:
            user = user_model._default_manager.get(
                Q(username=username) | Q(email__iexact=username)
            )
        except (user_model.DoesNotExist, MultipleObjectsReturned):
            user = None

        if user is None:
            user_model().set_password(password)
            return None

        if (
            user.check_password(password)
            and self.user_can_authenticate(user)
            and user.groups.filter(name=role).exists()
        ):
            return user
        return None
