from django.apps import AppConfig
from django.conf import settings


class MkulimaflowappConfig(AppConfig):
    name = 'mkulimaflowapp'
    default_auto_field = 'django.db.models.BigAutoField'


    def ready(self):
        from django.contrib.auth.models import Group
        from django.db.models.signals import post_migrate, post_save

        from .roles import ROLE_CHOICES

        def add_to_default_group(sender, **kwargs):
            user = kwargs["instance"]
            if kwargs['created']:
                group, ok = Group.objects.get_or_create(name="default")
                group.user_set.add(user)

        post_save.connect(add_to_default_group,
                          sender=settings.AUTH_USER_MODEL)

        def create_role_groups(sender, **kwargs):
            for role, _ in ROLE_CHOICES:
                Group.objects.get_or_create(name=role)

        post_migrate.connect(
            create_role_groups,
            sender=self,
            dispatch_uid="mkulimaflowapp.create_role_groups",
        )
