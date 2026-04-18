from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.package import PackageCourse, UserEntitlement
from app.models.user import User


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
        .where(
            UserEntitlement.user_id == user.id,
            UserEntitlement.status == "active",
        )
    )
    return set(entitlement_result.scalars().all())
