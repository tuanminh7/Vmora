from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.package import Package, PackageCourse, UserEntitlement
from app.models.user import User
from app.services.entitlement import build_active_entitlement_filters


async def get_accessible_course_ids(
    session: AsyncSession,
    *,
    language_code: str,
    user: User | None,
) -> set[int]:
    if user is None:
        return set()

    entitlement_result = await session.execute(
        select(PackageCourse.course_id)
        .join(UserEntitlement, UserEntitlement.package_id == PackageCourse.package_id)
        .join(Package, Package.id == PackageCourse.package_id)
        .where(
            UserEntitlement.user_id == user.id,
            Package.language_code == language_code,
            *build_active_entitlement_filters(),
        )
    )
    return set(entitlement_result.scalars().all())
