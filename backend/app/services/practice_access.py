from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.package import Package, UserEntitlement
from app.models.practice import PracticeActivity


PRACTICE_SKILL_FALLBACK = {
    "flashcard": "vocabulary",
    "quiz": "vocabulary",
    "matching": "vocabulary",
    "image": "vocabulary",
    "typing": "writing",
    "audio": "listening",
    "video": "listening",
    "voice": "speaking",
    "mixed": "grammar",
}


@dataclass(frozen=True)
class PracticeAccess:
    has_any_package: bool
    has_paid_package: bool
    package_codes: set[str]


def resolve_practice_skill(activity: PracticeActivity) -> str:
    payload = activity.payload or {}
    skill = payload.get("practice_skill")
    if isinstance(skill, str) and skill:
        return skill
    return PRACTICE_SKILL_FALLBACK.get(activity.activity_type, "vocabulary")


async def get_practice_access(
    session: AsyncSession,
    *,
    user_id: int,
    language_code: str,
) -> PracticeAccess:
    result = await session.execute(
        select(Package)
        .join(UserEntitlement, UserEntitlement.package_id == Package.id)
        .where(
            UserEntitlement.user_id == user_id,
            UserEntitlement.status == "active",
            Package.language_code == language_code,
            Package.is_active.is_(True),
        )
    )
    packages = result.scalars().all()
    return PracticeAccess(
        has_any_package=bool(packages),
        has_paid_package=any(not package.is_free for package in packages),
        package_codes={package.code for package in packages},
    )


def can_access_practice(activity: PracticeActivity, access: PracticeAccess) -> bool:
    if activity.is_free:
        return access.has_any_package

    payload = activity.payload or {}
    required_packages = payload.get("package_codes")
    if isinstance(required_packages, list) and required_packages:
        return bool(set(str(item) for item in required_packages) & access.package_codes)

    return access.has_paid_package
