from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Farm(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="farms",
    )
    name = models.CharField(max_length=120)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_farm_name_per_owner",
            ),
        ]

    def __str__(self):
        return self.name


class Flock(models.Model):
    class PoultryType(models.TextChoices):
        BROILER = "broiler", "Broiler"
        LAYER = "layer", "Layer"
        KIENYEJI = "kienyeji", "Kienyeji"
        IMPROVED_KIENYEJI = "improved_kienyeji", "Improved Kienyeji"

    class Purpose(models.TextChoices):
        MEAT = "meat", "Meat"
        EGGS = "eggs", "Eggs"
        BREEDING = "breeding", "Breeding"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name="flocks",
    )
    name = models.CharField(max_length=120)
    poultry_type = models.CharField(max_length=32, choices=PoultryType.choices)
    breed = models.CharField(max_length=120)
    initial_quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    acquisition_date = models.DateField()
    supplier = models.CharField(max_length=200, blank=True)
    housing_unit = models.CharField(max_length=120, blank=True)
    purpose = models.CharField(max_length=16, choices=Purpose.choices)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-acquisition_date", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["farm", "name"],
                name="unique_flock_name_per_farm",
            ),
            models.CheckConstraint(
                condition=models.Q(initial_quantity__gt=0),
                name="flock_initial_quantity_positive",
            ),
        ]

    def __str__(self):
        return self.name