from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import utcnow
from app.models.package import Package, UserEntitlement


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
            UserEntitlement.status == "active",
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
