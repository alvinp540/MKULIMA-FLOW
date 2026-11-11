from django.contrib import admin

from .models import Farm, Flock


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "location", "created_at")
    search_fields = ("name", "owner__username", "location")


@admin.register(Flock)
class FlockAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "farm",
        "poultry_type",
        "breed",
        "initial_quantity",
        "acquisition_date",
        "status",
    )
    list_filter = ("status", "poultry_type", "purpose", "farm")
    search_fields = ("name", "breed", "supplier", "farm__name")