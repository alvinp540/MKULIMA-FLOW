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


class EggProduction(models.Model):
    class QualityGrade(models.TextChoices):
        GRADE_A = "A", "Grade A"
        GRADE_B = "B", "Grade B"
        GRADE_C = "C", "Grade C"
        CRACKED = "cracked", "Cracked"

    flock = models.ForeignKey(
        Flock,
        on_delete=models.CASCADE,
        related_name="egg_production_records",
    )
    collection_date = models.DateField()
    eggs_collected = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    broken_eggs = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    quality_grade = models.CharField(
        max_length=16,
        choices=QualityGrade.choices,
        default=QualityGrade.GRADE_A,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-collection_date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(eggs_collected__gte=0),
                name="egg_production_eggs_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(broken_eggs__lte=models.F("eggs_collected")),
                name="egg_production_broken_eggs_within_total",
            ),
        ]

    def __str__(self):
        return f"{self.flock.name} · {self.collection_date}"


class FeedItem(models.Model):
    class Category(models.TextChoices):
        BROILER_STARTER = "broiler_starter", "Broiler Starter"
        BROILER_GROWER = "broiler_grower", "Broiler Grower"
        BROILER_FINISHER = "broiler_finisher", "Broiler Finisher"
        LAYER_MASH = "layer_mash", "Layer Mash"
        CHICK_MASH = "chick_mash", "Chick Mash"
        GROWER_MASH = "grower_mash", "Grower Mash"
        KIENYEJI_FEED = "kienyeji_feed", "Kienyeji Feed"
        CONCENTRATE = "concentrate", "Concentrate"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feed_items",
    )
    name = models.CharField(max_length=160)
    category = models.CharField(max_length=32, choices=Category.choices)
    brand = models.CharField(max_length=160, blank=True)
    unit = models.CharField(max_length=32, default="kg")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier = models.CharField(max_length=200, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_feed_name_per_owner",
            ),
            models.CheckConstraint(
                condition=models.Q(current_stock__gte=0),
                name="feed_item_stock_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(minimum_stock__gte=0),
                name="feed_item_minimum_stock_non_negative",
            ),
        ]

    def __str__(self):
        return self.name


class FeedMovement(models.Model):
    class MovementType(models.TextChoices):
        STOCK_IN = "stock_in", "Stock in"
        STOCK_OUT = "stock_out", "Stock out"
        CONSUMPTION = "consumption", "Consumption"
        ADJUSTMENT = "adjustment", "Adjustment"

    feed_item = models.ForeignKey(
        FeedItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    flock = models.ForeignKey(
        Flock,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feed_movements",
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    movement_date = models.DateField()
    reference = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-movement_date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="feed_movement_quantity_positive",
            ),
        ]

    def __str__(self):
        return f"{self.feed_item.name} · {self.movement_type} · {self.quantity} {self.feed_item.unit}"