from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Lesson
from app.models.progress import LessonProgress


async def get_completed_lesson_ids(
    session: AsyncSession,
    *,
    user_id: int | None,
    lesson_ids: list[int],
) -> set[int]:
    if user_id is None or not lesson_ids:
        return set()

    result = await session.execute(
        select(LessonProgress.lesson_id).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(lesson_ids),
        )
    )
    return set(result.scalars().all())


async def mark_lesson_completed(
    session: AsyncSession,
    *,
    user_id: int,
    lesson_id: int,
) -> LessonProgress:
    result = await session.execute(
        select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    progress = result.scalar_one_or_none()
    if progress is not None:
        return progress

    progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
    session.add(progress)
    await session.flush()
    return progress


def get_next_lesson_id(lessons: list[Lesson], completed_ids: set[int]) -> int | None:
    for lesson in lessons:
        if lesson.id not in completed_ids:
            return lesson.id
    return None
