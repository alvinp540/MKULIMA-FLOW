from django.contrib import admin

from .models import EggProduction, Farm, FeedItem, FeedMovement, Flock


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


@admin.register(EggProduction)
class EggProductionAdmin(admin.ModelAdmin):
    list_display = (
        "flock",
        "collection_date",
        "eggs_collected",
        "broken_eggs",
        "quality_grade",
    )
    list_filter = ("quality_grade", "collection_date", "flock__farm")
    search_fields = ("flock__name", "flock__farm__name", "notes")


@admin.register(FeedItem)
class FeedItemAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "category", "current_stock", "minimum_stock", "supplier", "expiry_date")
    list_filter = ("category", "supplier", "expiry_date")
    search_fields = ("name", "brand", "supplier")


@admin.register(FeedMovement)
class FeedMovementAdmin(admin.ModelAdmin):
    list_display = ("feed_item", "movement_type", "quantity", "movement_date", "flock", "reference")
    list_filter = ("movement_type", "movement_date", "feed_item__category")
    search_fields = ("feed_item__name", "reference", "notes", "flock__name")