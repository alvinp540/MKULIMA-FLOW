from django.contrib import admin

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
    VaccinationPlan,
    VaccinationRecord,
    VeterinaryVisit,
)


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


@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ("flock", "record_date", "status", "body_temperature", "observed_by")
    list_filter = ("status", "record_date", "flock__farm")
    search_fields = ("flock__name", "condition_score", "notes", "observed_by")


@admin.register(VaccinationPlan)
class VaccinationPlanAdmin(admin.ModelAdmin):
    list_display = ("flock", "vaccine_name", "scheduled_date", "due_date", "status")
    list_filter = ("status", "scheduled_date", "flock__farm")
    search_fields = ("flock__name", "vaccine_name", "notes")


@admin.register(VaccinationRecord)
class VaccinationRecordAdmin(admin.ModelAdmin):
    list_display = ("flock", "vaccine_name", "administered_date", "batch_number", "administered_by")
    list_filter = ("administered_date", "flock__farm")
    search_fields = ("flock__name", "vaccine_name", "batch_number", "administered_by")


@admin.register(DiseaseCase)
class DiseaseCaseAdmin(admin.ModelAdmin):
    list_display = ("flock", "disease_name", "diagnosis_date", "severity", "status")
    list_filter = ("severity", "status", "diagnosis_date")
    search_fields = ("flock__name", "disease_name", "diagnosis", "symptoms")


@admin.register(TreatmentRecord)
class TreatmentRecordAdmin(admin.ModelAdmin):
    list_display = ("flock", "treatment_name", "medication", "start_date", "status", "veterinarian")
    list_filter = ("status", "start_date", "flock__farm")
    search_fields = ("flock__name", "treatment_name", "medication", "notes")


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "stock_quantity", "unit", "supplier", "expiry_date")
    list_filter = ("category", "supplier", "expiry_date")
    search_fields = ("name", "supplier", "notes")


@admin.register(MortalityRecord)
class MortalityRecordAdmin(admin.ModelAdmin):
    list_display = ("flock", "record_date", "deaths", "culls", "cause")
    list_filter = ("record_date", "flock__farm")
    search_fields = ("flock__name", "cause", "notes")


@admin.register(VeterinaryVisit)
class VeterinaryVisitAdmin(admin.ModelAdmin):
    list_display = ("flock", "visit_date", "veterinarian_name", "purpose")
    list_filter = ("visit_date", "flock__farm")
    search_fields = ("flock__name", "veterinarian_name", "purpose", "findings")


@admin.register(HealthSchedule)
class HealthScheduleAdmin(admin.ModelAdmin):
    list_display = ("flock", "title", "category", "scheduled_for", "status", "assigned_to")
    list_filter = ("status", "category", "scheduled_for")
    search_fields = ("flock__name", "title", "assigned_to", "notes")