from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps.auth import get_current_user, get_optional_current_user
from app.db.session import AsyncSessionLocal
from app.models.course import Course, CourseSection, Lesson
from app.models.language import Language
from app.models.level import Level
from app.models.roadmap import Roadmap, RoadmapStage
from app.models.user import User
from app.schemas.learning import (
    CourseOut,
    CourseSectionOut,
    LessonCompleteOut,
    LessonDetailOut,
    LearningOverviewOut,
    LessonOut,
    LevelOut,
    RoadmapOut,
    RoadmapStageOut,
)
from app.services.course_access import get_accessible_course_ids
from app.services.features import award_pet_experience, create_notification
from app.services.progress import get_completed_lesson_ids, get_next_lesson_id, mark_lesson_completed
from app.services.realtime import broadcast_event, send_user_event

router = APIRouter(prefix="/v1", tags=["learning"])


def to_level_out(level: Level | None) -> LevelOut | None:
    if level is None:
        return None

    return LevelOut(
        id=level.id,
        code=level.code,
        title=level.title,
        description=level.description,
    )


@router.get("/learning/overview", response_model=LearningOverviewOut)
async def get_learning_overview(
    language_code: str = Query(..., min_length=2, max_length=10),
    current_user: User | None = Depends(get_optional_current_user),
):
    async with AsyncSessionLocal() as session:
        language_result = await session.execute(select(Language).where(Language.code == language_code))
        language = language_result.scalar_one_or_none()
        if language is None:
            raise HTTPException(status_code=404, detail="Ngôn ngữ không tồn tại")

        levels_result = await session.execute(
            select(Level).where(Level.language_code == language_code).order_by(Level.order_index.asc())
        )
        levels = levels_result.scalars().all()
        levels_by_id = {level.id: level for level in levels}

        roadmap_result = await session.execute(
            select(Roadmap).where(Roadmap.language_code == language_code).order_by(Roadmap.id.asc()).limit(1)
        )
        roadmap = roadmap_result.scalar_one_or_none()
        stages: list[RoadmapStage] = []
        if roadmap is not None:
            stages_result = await session.execute(
                select(RoadmapStage)
                .where(RoadmapStage.roadmap_id == roadmap.id)
                .order_by(RoadmapStage.order_index.asc(), RoadmapStage.id.asc())
            )
            stages = stages_result.scalars().all()

        courses_result = await session.execute(
            select(Course)
            .where(Course.language_code == language_code, Course.is_published.is_(True))
            .order_by(Course.order_index.asc(), Course.id.asc())
        )
        courses = courses_result.scalars().all()
        course_ids = [course.id for course in courses]
        accessible_course_ids = await get_accessible_course_ids(
            session,
            language_code=language_code,
            user=current_user,
        )

        sections_by_course_id: dict[int, list[CourseSection]] = defaultdict(list)
        lessons_by_section_id: dict[int, list[Lesson]] = defaultdict(list)
        lessons_by_course_id: dict[int, list[Lesson]] = defaultdict(list)

        if course_ids:
            sections_result = await session.execute(
                select(CourseSection)
                .where(CourseSection.course_id.in_(course_ids), CourseSection.is_published.is_(True))
                .order_by(CourseSection.order_index.asc(), CourseSection.id.asc())
            )
            sections = sections_result.scalars().all()
            for section in sections:
                sections_by_course_id[section.course_id].append(section)

            section_ids = [section.id for section in sections]
            if section_ids:
                lessons_result = await session.execute(
                    select(Lesson)
                    .where(Lesson.section_id.in_(section_ids), Lesson.is_published.is_(True))
                    .order_by(Lesson.order_index.asc(), Lesson.id.asc())
                )
                lessons = lessons_result.scalars().all()
                for lesson in lessons:
                    lessons_by_section_id[lesson.section_id].append(lesson)
                for section in sections:
                    lessons_by_course_id[section.course_id].extend(lessons_by_section_id.get(section.id, []))

        all_lesson_ids = [lesson.id for items in lessons_by_course_id.values() for lesson in items]
        completed_lesson_ids = await get_completed_lesson_ids(
            session,
            user_id=current_user.id if current_user else None,
            lesson_ids=all_lesson_ids,
        )

        roadmap_out = None
        if roadmap is not None:
            roadmap_out = RoadmapOut(
                id=roadmap.id,
                title=roadmap.title,
                description=roadmap.description,
                level=to_level_out(levels_by_id.get(roadmap.level_id)) if roadmap.level_id else None,
                stages=[
                    RoadmapStageOut(
                        id=stage.id,
                        title=stage.title,
                        description=stage.description,
                        order_index=stage.order_index,
                    )
                    for stage in stages
                ],
            )

        course_out_list = []
        for course in courses:
            has_access = course.id in accessible_course_ids
            course_lessons = lessons_by_course_id.get(course.id, [])
            total_lessons = len(course_lessons)
            completed_lessons = sum(1 for lesson in course_lessons if lesson.id in completed_lesson_ids)
            progress_percent = round((completed_lessons / total_lessons) * 100) if total_lessons else 0
            next_lesson_id = get_next_lesson_id(course_lessons, completed_lesson_ids) if has_access else None

            section_out_list = []
            for section in sections_by_course_id.get(course.id, []):
                lesson_out_list = [
                    LessonOut(
                        id=lesson.id,
                        title=lesson.title,
                        summary=lesson.summary,
                        content=lesson.content if has_access or lesson.is_free_preview else None,
                        order_index=lesson.order_index,
                        estimated_minutes=lesson.estimated_minutes,
                        is_free_preview=lesson.is_free_preview,
                        is_locked=not (has_access or lesson.is_free_preview),
                        is_completed=lesson.id in completed_lesson_ids,
                        stage_id=lesson.stage_id,
                    )
                    for lesson in lessons_by_section_id.get(section.id, [])
                ]
                section_out_list.append(
                    CourseSectionOut(
                        id=section.id,
                        title=section.title,
                        description=section.description,
                        order_index=section.order_index,
                        lessons=lesson_out_list,
                    )
                )

            course_out_list.append(
                CourseOut(
                    id=course.id,
                    title=course.title,
                    description=course.description,
                    is_free=course.is_free,
                    has_access=has_access,
                    completed_lessons=completed_lessons,
                    total_lessons=total_lessons,
                    progress_percent=progress_percent,
                    next_lesson_id=next_lesson_id,
                    order_index=course.order_index,
                    level=to_level_out(levels_by_id.get(course.level_id)) if course.level_id else None,
                    sections=section_out_list,
                )
            )

        return LearningOverviewOut(
            language_code=language.code,
            level_count=len(levels),
            course_count=len(courses),
            roadmap=roadmap_out,
            courses=course_out_list,
        )


@router.get("/lessons/{lesson_id}", response_model=LessonDetailOut)
async def get_lesson_detail(
    lesson_id: int,
    current_user: User | None = Depends(get_optional_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Lesson, Course)
            .join(CourseSection, CourseSection.id == Lesson.section_id)
            .join(Course, Course.id == CourseSection.course_id)
            .where(Lesson.id == lesson_id, Lesson.is_published.is_(True), CourseSection.is_published.is_(True), Course.is_published.is_(True))
        )
        row = result.first()
        if row is None:
            raise HTTPException(status_code=404, detail="Bài học không tồn tại")

        lesson, course = row
        accessible_course_ids = await get_accessible_course_ids(
            session,
            language_code=course.language_code,
            user=current_user,
        )
        has_access = course.id in accessible_course_ids
        can_view = has_access or lesson.is_free_preview
        completed_lesson_ids = await get_completed_lesson_ids(
            session,
            user_id=current_user.id if current_user else None,
            lesson_ids=[lesson.id],
        )

        return LessonDetailOut(
            id=lesson.id,
            title=lesson.title,
            summary=lesson.summary,
            content=lesson.content if can_view else None,
            estimated_minutes=lesson.estimated_minutes,
            is_locked=not can_view,
            locked_reason=None if can_view else "Bài học này cần quyền học để mở khóa",
            is_completed=lesson.id in completed_lesson_ids,
        )


@router.post("/lessons/{lesson_id}/complete", response_model=LessonCompleteOut)
async def complete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Lesson, Course)
            .join(CourseSection, CourseSection.id == Lesson.section_id)
            .join(Course, Course.id == CourseSection.course_id)
            .where(Lesson.id == lesson_id, Lesson.is_published.is_(True), CourseSection.is_published.is_(True), Course.is_published.is_(True))
        )
        row = result.first()
        if row is None:
            raise HTTPException(status_code=404, detail="Bài học không tồn tại")

        lesson, course = row
        accessible_course_ids = await get_accessible_course_ids(
            session,
            language_code=course.language_code,
            user=current_user,
        )
        has_access = course.id in accessible_course_ids
        if not has_access:
            raise HTTPException(status_code=403, detail="Bạn cần mở gói học để hoàn thành bài này")

        await mark_lesson_completed(session, user_id=current_user.id, lesson_id=lesson.id)
        await award_pet_experience(session, user_id=current_user.id, points=20)
        await create_notification(
            session,
            user_id=current_user.id,
            title="Đã hoàn thành bài học",
            content=f"Bạn đã hoàn thành bài: {lesson.title}.",
            notification_type="lesson",
        )

        lessons_result = await session.execute(
            select(Lesson)
            .join(CourseSection, CourseSection.id == Lesson.section_id)
            .where(CourseSection.course_id == course.id, CourseSection.is_published.is_(True), Lesson.is_published.is_(True))
            .order_by(Lesson.order_index.asc(), Lesson.id.asc())
        )
        course_lessons = lessons_result.scalars().all()
        completed_ids = await get_completed_lesson_ids(
            session,
            user_id=current_user.id,
            lesson_ids=[item.id for item in course_lessons],
        )
        completed_ids.add(lesson.id)
        next_lesson_id = get_next_lesson_id(course_lessons, completed_ids)

        await session.commit()
        await send_user_event(
            current_user.id,
            "progress:update",
            {"language_code": course.language_code, "lesson_id": lesson.id},
        )
        await broadcast_event("leaderboard:update", {"language_code": course.language_code})

        return LessonCompleteOut(
            lesson_id=lesson.id,
            completed=True,
            next_lesson_id=next_lesson_id,
        )
