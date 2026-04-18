from __future__ import annotations

import hashlib
import hmac
import json
import urllib.request
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class MomoCreateResult:
    order_id: str
    request_id: str
    status: str
    is_mock: bool
    pay_url: str | None
    deeplink: str | None
    qr_code_url: str | None
    provider_response: str


def _sign(raw_signature: str) -> str:
    return hmac.new(
        settings.momo_secret_key.encode("utf-8"),
        raw_signature.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _build_create_signature(
    *,
    access_key: str,
    amount: int,
    extra_data: str,
    ipn_url: str,
    order_id: str,
    order_info: str,
    partner_code: str,
    redirect_url: str,
    request_id: str,
    request_type: str,
) -> str:
    raw_signature = (
        f"accessKey={access_key}&amount={amount}&extraData={extra_data}"
        f"&ipnUrl={ipn_url}&orderId={order_id}&orderInfo={order_info}"
        f"&partnerCode={partner_code}&redirectUrl={redirect_url}"
        f"&requestId={request_id}&requestType={request_type}"
    )
    return _sign(raw_signature)


def verify_ipn_signature(payload: dict) -> bool:
    signature = payload.get("signature")
    if not signature or not settings.momo_secret_key:
        return False

    raw_signature = (
        f"accessKey={settings.momo_access_key}&amount={payload.get('amount','')}"
        f"&extraData={payload.get('extraData','')}&message={payload.get('message','')}"
        f"&orderId={payload.get('orderId','')}&orderInfo={payload.get('orderInfo','')}"
        f"&orderType={payload.get('orderType','')}&partnerCode={payload.get('partnerCode','')}"
        f"&payType={payload.get('payType','')}&requestId={payload.get('requestId','')}"
        f"&responseTime={payload.get('responseTime','')}&resultCode={payload.get('resultCode','')}"
        f"&transId={payload.get('transId','')}"
    )
    return hmac.compare_digest(signature, _sign(raw_signature))


def create_momo_payment(
    *,
    order_id: str,
    request_id: str,
    amount_vnd: int,
    order_info: str,
    extra_data: str = "",
) -> MomoCreateResult:
    if (
        settings.momo_mock
        or not settings.momo_partner_code
        or not settings.momo_access_key
        or not settings.momo_secret_key
    ):
        payload = {
            "mock": True,
            "orderId": order_id,
            "requestId": request_id,
            "amount": amount_vnd,
            "message": "MoMo mock mode",
        }
        return MomoCreateResult(
            order_id=order_id,
            request_id=request_id,
            status="succeeded",
            is_mock=True,
            pay_url=None,
            deeplink=None,
            qr_code_url=None,
            provider_response=json.dumps(payload, ensure_ascii=False),
        )

    request_type = "captureWallet"
    signature = _build_create_signature(
        access_key=settings.momo_access_key,
        amount=amount_vnd,
        extra_data=extra_data,
        ipn_url=settings.momo_ipn_url,
        order_id=order_id,
        order_info=order_info,
        partner_code=settings.momo_partner_code,
        redirect_url=settings.momo_redirect_url,
        request_id=request_id,
        request_type=request_type,
    )

    payload = {
        "partnerCode": settings.momo_partner_code,
        "partnerName": settings.momo_partner_name,
        "storeId": settings.momo_store_id,
        "requestId": request_id,
        "amount": amount_vnd,
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": settings.momo_redirect_url,
        "ipnUrl": settings.momo_ipn_url,
        "lang": "vi",
        "requestType": request_type,
        "autoCapture": True,
        "extraData": extra_data,
        "signature": signature,
    }

    request = urllib.request.Request(
        settings.momo_endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    status = "pending"
    if response_payload.get("resultCode") == 0:
        status = "pending"
    else:
        status = "failed"

    return MomoCreateResult(
        order_id=order_id,
        request_id=request_id,
        status=status,
        is_mock=False,
        pay_url=response_payload.get("payUrl"),
        deeplink=response_payload.get("deeplink"),
        qr_code_url=response_payload.get("qrCodeUrl"),
        provider_response=json.dumps(response_payload, ensure_ascii=False),
    )
