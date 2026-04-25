from __future__ import annotations

from datetime import timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import utcnow
from app.models.package import Package, UserEntitlement


def build_active_entitlement_filters(*, now=None):
    current_time = now or utcnow()
    return (
        UserEntitlement.status == "active",
        or_(UserEntitlement.expires_at.is_(None), UserEntitlement.expires_at > current_time),
    )


def is_entitlement_active(entitlement: UserEntitlement, *, now=None) -> bool:
    current_time = now or utcnow()
    return entitlement.status == "active" and (
        entitlement.expires_at is None or entitlement.expires_at > current_time
    )


def effective_entitlement_status(entitlement: UserEntitlement, *, now=None) -> str:
    current_time = now or utcnow()
    if entitlement.status != "active":
        return entitlement.status
    if entitlement.expires_at is not None and entitlement.expires_at <= current_time:
        return "expired"
    return "active"


async def grant_entitlement(
    session: AsyncSession,
    *,
    user_id: int,
    package: Package,
) -> UserEntitlement:
    existing_result = await session.execute(
        select(UserEntitlement).where(
            UserEntitlement.user_id == user_id,
            UserEntitlement.package_id == package.id,
            *build_active_entitlement_filters(),
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        return existing

    now = utcnow()
    expires_at = None
    if package.duration_days:
        expires_at = now + timedelta(days=package.duration_days)

    entitlement = UserEntitlement(
        user_id=user_id,
        package_id=package.id,
        status="active",
        expires_at=expires_at,
    )
    session.add(entitlement)
    await session.flush()
    return entitlement
