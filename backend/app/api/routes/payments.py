from __future__ import annotations

import json
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps.auth import get_current_user
from app.core.security import utcnow
from app.db.session import AsyncSessionLocal
from app.models.package import Package, PaymentTransaction
from app.models.user import User
from app.schemas.payment import CreatePaymentInput, PaymentCreateOut
from app.services.entitlement import grant_entitlement
from app.services.momo import create_momo_payment, verify_ipn_signature
from app.services.realtime import send_user_event

router = APIRouter(prefix="/v1", tags=["payments"])


@router.post("/payments/momo/create", response_model=PaymentCreateOut)
async def create_momo_transaction(
    payload: CreatePaymentInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        package_result = await session.execute(select(Package).where(Package.id == payload.package_id))
        package = package_result.scalar_one_or_none()
        if package is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gói không tồn tại")
        if not package.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gói học đang tạm dừng thanh toán")
        if package.is_free:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gói free không cần thanh toán MoMo")

        order_id = f"VMORA-{current_user.id}-{secrets.token_hex(6)}"
        request_id = f"REQ-{secrets.token_hex(8)}"
        momo_result = create_momo_payment(
            order_id=order_id,
            request_id=request_id,
            amount_vnd=package.price_vnd,
            order_info=f"Thanh toán {package.name}",
        )

        transaction = PaymentTransaction(
            user_id=current_user.id,
            package_id=package.id,
            provider="momo",
            order_id=order_id,
            request_id=request_id,
            amount_vnd=package.price_vnd,
            status=momo_result.status,
            pay_url=momo_result.pay_url,
            deeplink=momo_result.deeplink,
            qr_code_url=momo_result.qr_code_url,
            provider_response=momo_result.provider_response,
            confirmed_at=utcnow() if momo_result.status == "succeeded" else None,
        )
        session.add(transaction)
        await session.flush()

        if momo_result.status == "succeeded":
            entitlement = await grant_entitlement(session, user_id=current_user.id, package=package)

        await session.commit()
        if momo_result.status == "succeeded":
            await send_user_event(
                current_user.id,
                "payment:succeeded",
                {
                    "transaction_id": transaction.id,
                    "package_id": package.id,
                    "language_code": package.language_code,
                    "entitlement_id": entitlement.id,
                },
            )

        return PaymentCreateOut(
            transaction_id=transaction.id,
            order_id=transaction.order_id,
            status=transaction.status,
            is_mock=momo_result.is_mock,
            pay_url=transaction.pay_url,
            deeplink=transaction.deeplink,
            qr_code_url=transaction.qr_code_url,
        )


@router.post("/payments/momo/ipn")
async def momo_ipn(request: Request):
    payload = await request.json()

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(PaymentTransaction, Package)
            .join(Package, Package.id == PaymentTransaction.package_id)
            .where(PaymentTransaction.order_id == payload.get("orderId"))
        )
        row = result.first()
        if row is None:
            return {"resultCode": 1, "message": "Order not found"}

        transaction, package = row
        provider_response = json.dumps(payload, ensure_ascii=False)
        signature_valid = verify_ipn_signature(payload)

        transaction.provider_response = provider_response
        if signature_valid and str(payload.get("resultCode")) == "0":
            transaction.status = "succeeded"
            transaction.confirmed_at = utcnow()
            entitlement = await grant_entitlement(session, user_id=transaction.user_id, package=package)
        elif not signature_valid:
            transaction.status = "invalid_signature"
        else:
            transaction.status = "failed"

        await session.commit()
        if transaction.status == "succeeded":
            await send_user_event(
                transaction.user_id,
                "payment:succeeded",
                {
                    "transaction_id": transaction.id,
                    "package_id": package.id,
                    "language_code": package.language_code,
                    "entitlement_id": entitlement.id,
                },
            )

    return {"resultCode": 0, "message": "Success"}
