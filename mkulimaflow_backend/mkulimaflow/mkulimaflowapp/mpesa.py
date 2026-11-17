import base64
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from django.conf import settings


SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

EAST_AFRICA_TIME = timezone(timedelta(hours=3))


class MpesaError(Exception):
    """Raised when Safaricom Daraja cannot complete a request."""


def base_url():
    if settings.MPESA_ENV == "production":
        return PRODUCTION_BASE_URL
    return SANDBOX_BASE_URL


def is_configured():
    return all(
        (
            settings.MPESA_CONSUMER_KEY,
            settings.MPESA_CONSUMER_SECRET,
            settings.MPESA_SHORTCODE,
            settings.MPESA_PASSKEY,
        )
    )


def normalize_phone(raw):
    """Return a Safaricom number in the 2547XXXXXXXX format."""
    digits = re.sub(r"\D", "", str(raw or ""))

    if digits.startswith("254"):
        number = digits
    elif digits.startswith("0"):
        number = f"254{digits[1:]}"
    elif digits.startswith(("7", "1")):
        number = f"254{digits}"
    else:
        number = digits

    if not re.fullmatch(r"254(?:7\d{8}|1\d{8})", number):
        raise ValueError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    return number


def _timestamp():
    return datetime.now(EAST_AFRICA_TIME).strftime("%Y%m%d%H%M%S")


def _password(timestamp):
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode("utf-8")).decode("ascii")


def _request_json(url, *, payload=None, token=None):
    headers = {"Accept": "application/json"}
    data = None

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="POST" if data is not None else "GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise MpesaError(
            f"Safaricom returned HTTP {error.code}: {detail[:400]}"
        ) from error
    except urllib.error.URLError as error:
        raise MpesaError(f"Could not reach Safaricom: {error.reason}") from error
    except TimeoutError as error:
        raise MpesaError("Safaricom did not respond in time.") from error

    try:
        return json.loads(body)
    except json.JSONDecodeError as error:
        raise MpesaError("Safaricom returned an unexpected response.") from error


def get_access_token():
    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode(
            "utf-8"
        )
    ).decode("ascii")

    request = urllib.request.Request(
        f"{base_url()}/oauth/v1/generate?grant_type=client_credentials",
        headers={
            "Accept": "application/json",
            "Authorization": f"Basic {credentials}",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise MpesaError(
            f"Safaricom rejected the credentials (HTTP {error.code}): {detail[:300]}"
        ) from error
    except urllib.error.URLError as error:
        raise MpesaError(f"Could not reach Safaricom: {error.reason}") from error

    token = data.get("access_token")
    if not token:
        raise MpesaError("Safaricom did not return an access token.")
    return token


def stk_push(*, phone, amount, account_reference, description, callback_url):
    """Send an STK Push prompt to the customer's phone."""
    token = get_access_token()
    timestamp = _timestamp()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": _password(timestamp),
        "Timestamp": timestamp,
        "TransactionType": settings.MPESA_TRANSACTION_TYPE,
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": account_reference[:12],
        "TransactionDesc": description[:100],
    }

    return _request_json(
        f"{base_url()}/mpesa/stkpush/v1/processrequest",
        payload=payload,
        token=token,
    )


def query_status(checkout_request_id):
    """Ask Daraja for the latest state of an STK Push request."""
    token = get_access_token()
    timestamp = _timestamp()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": _password(timestamp),
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    return _request_json(
        f"{base_url()}/mpesa/stkpushquery/v1/query",
        payload=payload,
        token=token,
    )
