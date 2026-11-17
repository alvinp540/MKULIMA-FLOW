from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings


PLAN_CATALOG = {
    "simple-monthly": {
        "name": "Simple",
        "billing": "monthly",
        "period": "per month",
        "usd": Decimal("20.00"),
        "description": "MkulimaFlow Simple monthly",
    },
    "pro-monthly": {
        "name": "Pro",
        "billing": "monthly",
        "period": "per month",
        "usd": Decimal("30.00"),
        "description": "MkulimaFlow Pro monthly",
    },
    "simple-yearly": {
        "name": "Simple",
        "billing": "yearly",
        "period": "per year",
        "usd": Decimal("168.00"),
        "description": "MkulimaFlow Simple annual",
    },
    "pro-yearly": {
        "name": "Pro",
        "billing": "yearly",
        "period": "per year",
        "usd": Decimal("252.00"),
        "description": "MkulimaFlow Pro annual",
    },
}


def exchange_rate():
    try:
        rate = Decimal(str(settings.MPESA_USD_TO_KES_RATE))
    except (InvalidOperation, TypeError, ValueError):
        rate = Decimal("130")
    return rate if rate > 0 else Decimal("130")


def usd_to_kes(amount_usd):
    """Convert USD to whole KES, rounded to the nearest 10 shillings."""
    amount = Decimal(amount_usd) * exchange_rate()
    return int(amount.quantize(Decimal("10"), rounding=ROUND_HALF_UP))


def plan_payload(key):
    plan = PLAN_CATALOG[key]
    return {
        "key": key,
        "name": plan["name"],
        "billing": plan["billing"],
        "period": plan["period"],
        "amount_usd": f"{plan['usd']:.2f}",
        "amount_kes": usd_to_kes(plan["usd"]),
        "description": plan["description"],
    }


def plan_list():
    return [plan_payload(key) for key in PLAN_CATALOG]
