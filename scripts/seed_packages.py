from __future__ import annotations

import asyncio
import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, init_db
from app.models.course import Course
from app.models.language import Language
from app.models.package import Package, PackageCourse


PACKAGE_CONFIG = {
    "en": ("giao-tiep-anh", "Gói tiếng Anh mở rộng"),
    "ja": ("nhat-n5", "Gói tiếng Nhật N5 mở rộng"),
    "ko": ("han-topik1", "Gói tiếng Hàn TOPIK 1 mở rộng"),
    "zh": ("trung-hsk1", "Gói tiếng Trung HSK 1 mở rộng"),
    "de": ("duc-a1", "Gói tiếng Đức A1 mở rộng"),
}


async def ensure_package(
    session,
    *,
    language_code: str,
    code: str,
    name: str,
    is_free: bool,
    price_vnd: int,
    duration_days: int | None,
) -> Package:
    result = await session.execute(select(Package).where(Package.code == code))
    package = result.scalar_one_or_none()
    if package is not None:
        return package

    package = Package(
        language_code=language_code,
        code=code,
        name=name,
        description="Gói học được sinh tự động từ seed ban đầu.",
        price_vnd=price_vnd,
        duration_days=duration_days,
        is_free=is_free,
        is_active=True,
    )
    session.add(package)
    await session.flush()
    return package


async def seed(selected_languages: set[str] | None = None) -> None:
    inserted = 0

    await init_db()

    async with AsyncSessionLocal() as session:
        language_result = await session.execute(select(Language))
        languages = language_result.scalars().all()

        for language in languages:
            if selected_languages and language.code not in selected_languages:
                continue
            slug, paid_name = PACKAGE_CONFIG[language.code]

            free_package = await ensure_package(
                session,
                language_code=language.code,
                code=f"{language.code}-free",
                name=f"Gói free {language.name}",
                is_free=True,
                price_vnd=0,
                duration_days=None,
            )
            paid_package = await ensure_package(
                session,
                language_code=language.code,
                code=f"{language.code}-{slug}",
                name=paid_name,
                is_free=False,
                price_vnd=99000,
                duration_days=90,
            )

            course_result = await session.execute(
                select(Course)
                .where(Course.language_code == language.code)
                .order_by(Course.is_free.desc(), Course.id.asc())
            )
            courses = course_result.scalars().all()
            for course in courses:
                target_package = free_package if course.is_free else paid_package
                exists = await session.execute(
                    select(PackageCourse).where(
                        PackageCourse.package_id == target_package.id,
                        PackageCourse.course_id == course.id,
                    )
                )
                if exists.scalar_one_or_none() is None:
                    session.add(PackageCourse(package_id=target_package.id, course_id=course.id))
                    inserted += 1

        await session.commit()

    print(f"Seeded packages and links, inserted {inserted} package-course rows")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Chi seed cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()
    selected_languages = set(args.languages) if args.languages else None
    asyncio.run(seed(selected_languages=selected_languages))


if __name__ == "__main__":
    main()
