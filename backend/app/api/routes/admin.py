from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select

from app.api.deps.auth import get_admin_user
from app.db.session import AsyncSessionLocal
from app.models.course import Course, CourseSection, Lesson
from app.models.feature import (
    AdminGrant,
    Exam,
    ExamQuestion,
    Notification,
    SupportTicket,
)
from app.models.language import Language
from app.models.level import Level
from app.models.package import Package
from app.models.practice import PracticeActivity
from app.models.roadmap import Roadmap, RoadmapStage
from app.models.user import User
from app.models.vocabulary import VocabularyEntry
from app.schemas.feature import (
    AdminDashboardOut,
    CourseAdminInput,
    CourseSectionAdminInput,
    LanguageAdminInput,
    LessonAdminInput,
    LevelAdminInput,
    PackageAdminInput,
    PracticeAdminInput,
    RoadmapAdminInput,
    RoadmapStageAdminInput,
    SimpleStatusOut,
    VocabularyAdminInput,
)
from app.services.realtime import broadcast_event, send_user_event

router = APIRouter(prefix="/v1/admin", tags=["admin"])


def model_to_dict(model, fields: list[str]):
    return {field: getattr(model, field) for field in fields}


async def notify_admin_clients(*, tab: str) -> None:
    async with AsyncSessionLocal() as session:
        admin_ids = list((await session.execute(select(AdminGrant.user_id))).scalars().all())
    for admin_id in admin_ids:
        await send_user_event(admin_id, "admin:refresh", {"tab": tab})


async def notify_content_clients(*, tab: str, language_code: str | None = None) -> None:
    await broadcast_event("content:update", {"tab": tab, "language_code": language_code})


async def exam_to_admin_out(session, exam: Exam):
    question_result = await session.execute(
        select(ExamQuestion).where(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_index.asc())
    )
    return {
        **model_to_dict(
            exam,
            ["id", "language_code", "title", "description", "level_code", "duration_minutes", "passing_score", "is_active"],
        ),
        "questions": [
            model_to_dict(
                question,
                ["id", "question_type", "prompt", "payload", "correct_answer", "points", "order_index"],
            )
            for question in question_result.scalars().all()
        ],
    }


@router.get("/dashboard", response_model=AdminDashboardOut)
async def get_admin_dashboard(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        return AdminDashboardOut(
            user_count=(await session.execute(select(func.count(User.id)))).scalar_one(),
            language_count=(await session.execute(select(func.count(Language.code)))).scalar_one(),
            course_count=(await session.execute(select(func.count(Course.id)))).scalar_one(),
            lesson_count=(await session.execute(select(func.count(Lesson.id)))).scalar_one(),
            vocabulary_count=(await session.execute(select(func.count(VocabularyEntry.id)))).scalar_one(),
            practice_count=(await session.execute(select(func.count(PracticeActivity.id)))).scalar_one(),
            exam_count=(await session.execute(select(func.count(Exam.id)))).scalar_one(),
            ticket_count=(await session.execute(select(func.count(SupportTicket.id)))).scalar_one(),
        )


@router.get("/users")
async def list_users(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        users = (await session.execute(select(User).order_by(User.created_at.desc()))).scalars().all()
        admin_ids = set((await session.execute(select(AdminGrant.user_id))).scalars().all())
        return [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "learning_language_code": user.learning_language_code,
                "is_admin": user.id in admin_ids,
                "created_at": user.created_at.isoformat(),
            }
            for user in users
        ]


@router.post("/users/{user_id}/grant-admin", response_model=SimpleStatusOut)
async def grant_admin(user_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
        existing = (await session.execute(select(AdminGrant).where(AdminGrant.user_id == user_id))).scalar_one_or_none()
        if existing is None:
            session.add(AdminGrant(user_id=user_id))
            await session.commit()
            await notify_admin_clients(tab="users")
        return SimpleStatusOut(ok=True, message="Đã cấp quyền admin")


@router.get("/tickets")
async def list_tickets(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                select(SupportTicket, User).join(User, User.id == SupportTicket.user_id).order_by(SupportTicket.updated_at.desc())
            )
        ).all()
        return [
            {
                "id": ticket.id,
                "title": ticket.title,
                "content": ticket.content,
                "status": ticket.status,
                "admin_reply": ticket.admin_reply,
                "user_name": user.full_name or user.email,
                "updated_at": ticket.updated_at.isoformat(),
            }
            for ticket, user in rows
        ]


@router.patch("/tickets/{ticket_id}")
async def reply_ticket(ticket_id: int, payload: dict, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        ticket = (
            await session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ).scalar_one_or_none()
        if ticket is None:
            raise HTTPException(status_code=404, detail="Ticket không tồn tại")
        ticket.status = payload.get("status", ticket.status)
        ticket.admin_reply = payload.get("admin_reply", ticket.admin_reply)
        from app.models.feature import utc_now

        ticket.updated_at = utc_now()
        await session.commit()
        await session.refresh(ticket)
        ticket_out = {
            "id": ticket.id,
            "title": ticket.title,
            "content": ticket.content,
            "status": ticket.status,
            "admin_reply": ticket.admin_reply,
            "created_at": ticket.created_at.isoformat(),
            "updated_at": ticket.updated_at.isoformat(),
        }
        await send_user_event(ticket.user_id, "ticket:update", {"ticket": ticket_out})
        await notify_admin_clients(tab="tickets")
        return ticket_out


@router.get("/languages")
async def admin_list_languages(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Language).order_by(Language.name.asc()))).scalars().all()
        return [model_to_dict(item, ["code", "name"]) for item in items]


@router.post("/languages")
async def admin_create_language(payload: LanguageAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = Language(**payload.model_dump())
        session.add(item)
        await session.commit()
        await notify_admin_clients(tab="languages")
        await notify_content_clients(tab="languages", language_code=item.code)
        return model_to_dict(item, ["code", "name"])


@router.patch("/languages/{code}")
async def admin_update_language(code: str, payload: LanguageAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Language).where(Language.code == code))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ngôn ngữ không tồn tại")
        item.name = payload.name
        await session.commit()
        await notify_admin_clients(tab="languages")
        await notify_content_clients(tab="languages", language_code=item.code)
        return model_to_dict(item, ["code", "name"])


@router.delete("/languages/{code}", response_model=SimpleStatusOut)
async def admin_delete_language(code: str, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Language).where(Language.code == code))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ngôn ngữ không tồn tại")
        language_code = item.code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="languages")
        await notify_content_clients(tab="languages", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa ngôn ngữ")


@router.get("/levels")
async def admin_list_levels(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Level).order_by(Level.language_code.asc(), Level.order_index.asc()))).scalars().all()
        return [
            model_to_dict(item, ["id", "language_code", "code", "title", "description", "order_index"])
            for item in items
        ]


@router.post("/levels")
async def admin_create_level(payload: LevelAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = Level(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="levels")
        await notify_content_clients(tab="levels", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "code", "title", "description", "order_index"])


@router.patch("/levels/{level_id}")
async def admin_update_level(level_id: int, payload: LevelAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Level).where(Level.id == level_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Cấp độ không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="levels")
        await notify_content_clients(tab="levels", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "code", "title", "description", "order_index"])


@router.delete("/levels/{level_id}", response_model=SimpleStatusOut)
async def admin_delete_level(level_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Level).where(Level.id == level_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Cấp độ không tồn tại")
        language_code = item.language_code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="levels")
        await notify_content_clients(tab="levels", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa cấp độ")


@router.get("/roadmaps")
async def admin_list_roadmaps(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Roadmap).order_by(Roadmap.language_code.asc(), Roadmap.id.asc()))).scalars().all()
        return [model_to_dict(item, ["id", "language_code", "level_id", "title", "description"]) for item in items]


@router.post("/roadmaps")
async def admin_create_roadmap(payload: RoadmapAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = Roadmap(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="roadmaps")
        await notify_content_clients(tab="roadmaps", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "level_id", "title", "description"])


@router.patch("/roadmaps/{roadmap_id}")
async def admin_update_roadmap(roadmap_id: int, payload: RoadmapAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Roadmap).where(Roadmap.id == roadmap_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Lộ trình không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="roadmaps")
        await notify_content_clients(tab="roadmaps", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "level_id", "title", "description"])


@router.delete("/roadmaps/{roadmap_id}", response_model=SimpleStatusOut)
async def admin_delete_roadmap(roadmap_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Roadmap).where(Roadmap.id == roadmap_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Lộ trình không tồn tại")
        language_code = item.language_code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="roadmaps")
        await notify_content_clients(tab="roadmaps", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa lộ trình")


@router.get("/stages")
async def admin_list_stages(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(RoadmapStage).order_by(RoadmapStage.roadmap_id.asc(), RoadmapStage.order_index.asc()))).scalars().all()
        return [model_to_dict(item, ["id", "roadmap_id", "title", "description", "order_index"]) for item in items]


@router.post("/stages")
async def admin_create_stage(payload: RoadmapStageAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = RoadmapStage(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="stages")
        roadmap = (await session.execute(select(Roadmap).where(Roadmap.id == item.roadmap_id))).scalar_one_or_none()
        await notify_content_clients(tab="stages", language_code=roadmap.language_code if roadmap else None)
        return model_to_dict(item, ["id", "roadmap_id", "title", "description", "order_index"])


@router.patch("/stages/{stage_id}")
async def admin_update_stage(stage_id: int, payload: RoadmapStageAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(RoadmapStage).where(RoadmapStage.id == stage_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Chặng không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="stages")
        roadmap = (await session.execute(select(Roadmap).where(Roadmap.id == item.roadmap_id))).scalar_one_or_none()
        await notify_content_clients(tab="stages", language_code=roadmap.language_code if roadmap else None)
        return model_to_dict(item, ["id", "roadmap_id", "title", "description", "order_index"])


@router.delete("/stages/{stage_id}", response_model=SimpleStatusOut)
async def admin_delete_stage(stage_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(RoadmapStage).where(RoadmapStage.id == stage_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Chặng không tồn tại")
        roadmap = (await session.execute(select(Roadmap).where(Roadmap.id == item.roadmap_id))).scalar_one_or_none()
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="stages")
        await notify_content_clients(tab="stages", language_code=roadmap.language_code if roadmap else None)
        return SimpleStatusOut(ok=True, message="Đã xóa chặng")


@router.get("/courses")
async def admin_list_courses(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Course).order_by(Course.language_code.asc(), Course.order_index.asc()))).scalars().all()
        return [
            model_to_dict(item, ["id", "language_code", "level_id", "roadmap_id", "title", "description", "is_free", "is_published", "order_index"])
            for item in items
        ]


@router.post("/courses")
async def admin_create_course(payload: CourseAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = Course(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="courses")
        await notify_content_clients(tab="courses", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "level_id", "roadmap_id", "title", "description", "is_free", "is_published", "order_index"])


@router.patch("/courses/{course_id}")
async def admin_update_course(course_id: int, payload: CourseAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="courses")
        await notify_content_clients(tab="courses", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "level_id", "roadmap_id", "title", "description", "is_free", "is_published", "order_index"])


@router.delete("/courses/{course_id}", response_model=SimpleStatusOut)
async def admin_delete_course(course_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Khóa học không tồn tại")
        language_code = item.language_code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="courses")
        await notify_content_clients(tab="courses", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa khóa học")


@router.get("/sections")
async def admin_list_sections(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(CourseSection).order_by(CourseSection.course_id.asc(), CourseSection.order_index.asc()))).scalars().all()
        return [model_to_dict(item, ["id", "course_id", "title", "description", "is_published", "order_index"]) for item in items]


@router.post("/sections")
async def admin_create_section(payload: CourseSectionAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = CourseSection(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="sections")
        course = (await session.execute(select(Course).where(Course.id == item.course_id))).scalar_one_or_none()
        await notify_content_clients(tab="sections", language_code=course.language_code if course else None)
        return model_to_dict(item, ["id", "course_id", "title", "description", "is_published", "order_index"])


@router.patch("/sections/{section_id}")
async def admin_update_section(section_id: int, payload: CourseSectionAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(CourseSection).where(CourseSection.id == section_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Chương không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="sections")
        course = (await session.execute(select(Course).where(Course.id == item.course_id))).scalar_one_or_none()
        await notify_content_clients(tab="sections", language_code=course.language_code if course else None)
        return model_to_dict(item, ["id", "course_id", "title", "description", "is_published", "order_index"])


@router.delete("/sections/{section_id}", response_model=SimpleStatusOut)
async def admin_delete_section(section_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(CourseSection).where(CourseSection.id == section_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Chương không tồn tại")
        course = (await session.execute(select(Course).where(Course.id == item.course_id))).scalar_one_or_none()
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="sections")
        await notify_content_clients(tab="sections", language_code=course.language_code if course else None)
        return SimpleStatusOut(ok=True, message="Đã xóa chương")


@router.get("/lessons")
async def admin_list_lessons(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Lesson).order_by(Lesson.section_id.asc(), Lesson.order_index.asc()))).scalars().all()
        return [
            model_to_dict(item, ["id", "section_id", "stage_id", "title", "summary", "content", "order_index", "estimated_minutes", "is_free_preview", "is_published"])
            for item in items
        ]


@router.post("/lessons")
async def admin_create_lesson(payload: LessonAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = Lesson(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="lessons")
        course = (
            await session.execute(select(Course).join(CourseSection, CourseSection.course_id == Course.id).where(CourseSection.id == item.section_id))
        ).scalar_one_or_none()
        await notify_content_clients(tab="lessons", language_code=course.language_code if course else None)
        return model_to_dict(item, ["id", "section_id", "stage_id", "title", "summary", "content", "order_index", "estimated_minutes", "is_free_preview", "is_published"])


@router.patch("/lessons/{lesson_id}")
async def admin_update_lesson(lesson_id: int, payload: LessonAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Bài học không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="lessons")
        course = (
            await session.execute(select(Course).join(CourseSection, CourseSection.course_id == Course.id).where(CourseSection.id == item.section_id))
        ).scalar_one_or_none()
        await notify_content_clients(tab="lessons", language_code=course.language_code if course else None)
        return model_to_dict(item, ["id", "section_id", "stage_id", "title", "summary", "content", "order_index", "estimated_minutes", "is_free_preview", "is_published"])


@router.delete("/lessons/{lesson_id}", response_model=SimpleStatusOut)
async def admin_delete_lesson(lesson_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Lesson).where(Lesson.id == lesson_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Bài học không tồn tại")
        course = (
            await session.execute(select(Course).join(CourseSection, CourseSection.course_id == Course.id).where(CourseSection.id == item.section_id))
        ).scalar_one_or_none()
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="lessons")
        await notify_content_clients(tab="lessons", language_code=course.language_code if course else None)
        return SimpleStatusOut(ok=True, message="Đã xóa bài học")


@router.get("/vocabulary")
async def admin_list_vocabulary(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(VocabularyEntry).order_by(VocabularyEntry.id.desc()).limit(200))).scalars().all()
        return [
            model_to_dict(item, ["id", "language_code", "word", "reading", "part_of_speech", "meaning_en", "meaning_vi", "source_name", "source_url", "is_active"])
            for item in items
        ]


@router.post("/vocabulary")
async def admin_create_vocabulary(payload: VocabularyAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = VocabularyEntry(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="vocabulary")
        await notify_content_clients(tab="vocabulary", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "word", "reading", "part_of_speech", "meaning_en", "meaning_vi", "source_name", "source_url", "is_active"])


@router.patch("/vocabulary/{entry_id}")
async def admin_update_vocabulary(entry_id: int, payload: VocabularyAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(VocabularyEntry).where(VocabularyEntry.id == entry_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Từ vựng không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="vocabulary")
        await notify_content_clients(tab="vocabulary", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "word", "reading", "part_of_speech", "meaning_en", "meaning_vi", "source_name", "source_url", "is_active"])


@router.delete("/vocabulary/{entry_id}", response_model=SimpleStatusOut)
async def admin_delete_vocabulary(entry_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(VocabularyEntry).where(VocabularyEntry.id == entry_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Từ vựng không tồn tại")
        language_code = item.language_code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="vocabulary")
        await notify_content_clients(tab="vocabulary", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa từ vựng")


@router.get("/practice")
async def admin_list_practice(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(PracticeActivity).order_by(PracticeActivity.id.desc()).limit(200))).scalars().all()
        return [
            model_to_dict(item, ["id", "language_code", "lesson_id", "code", "activity_type", "title", "description", "prompt", "payload", "order_index", "is_free", "is_active"])
            for item in items
        ]


@router.post("/practice")
async def admin_create_practice(payload: PracticeAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = PracticeActivity(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="practice")
        await notify_content_clients(tab="practice", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "lesson_id", "code", "activity_type", "title", "description", "prompt", "payload", "order_index", "is_free", "is_active"])


@router.patch("/practice/{activity_id}")
async def admin_update_practice(activity_id: int, payload: PracticeAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(PracticeActivity).where(PracticeActivity.id == activity_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Bài luyện tập không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="practice")
        await notify_content_clients(tab="practice", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "lesson_id", "code", "activity_type", "title", "description", "prompt", "payload", "order_index", "is_free", "is_active"])


@router.delete("/practice/{activity_id}", response_model=SimpleStatusOut)
async def admin_delete_practice(activity_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(PracticeActivity).where(PracticeActivity.id == activity_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Bài luyện tập không tồn tại")
        language_code = item.language_code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="practice")
        await notify_content_clients(tab="practice", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa bài luyện tập")


@router.get("/packages")
async def admin_list_packages(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Package).order_by(Package.language_code.asc(), Package.price_vnd.asc()))).scalars().all()
        return [
            model_to_dict(item, ["id", "language_code", "code", "name", "description", "price_vnd", "duration_days", "is_free", "is_active"])
            for item in items
        ]


@router.post("/packages")
async def admin_create_package(payload: PackageAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = Package(**payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="packages")
        await notify_content_clients(tab="packages", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "code", "name", "description", "price_vnd", "duration_days", "is_free", "is_active"])


@router.patch("/packages/{package_id}")
async def admin_update_package(package_id: int, payload: PackageAdminInput, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Package).where(Package.id == package_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Gói không tồn tại")
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        await session.commit()
        await notify_admin_clients(tab="packages")
        await notify_content_clients(tab="packages", language_code=item.language_code)
        return model_to_dict(item, ["id", "language_code", "code", "name", "description", "price_vnd", "duration_days", "is_free", "is_active"])


@router.delete("/packages/{package_id}", response_model=SimpleStatusOut)
async def admin_delete_package(package_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(Package).where(Package.id == package_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Gói không tồn tại")
        language_code = item.language_code
        await session.delete(item)
        await session.commit()
        await notify_admin_clients(tab="packages")
        await notify_content_clients(tab="packages", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa gói")


@router.get("/exams")
async def admin_list_exams(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        items = (await session.execute(select(Exam).order_by(Exam.language_code.asc(), Exam.id.asc()))).scalars().all()
        return [await exam_to_admin_out(session, item) for item in items]


@router.post("/exams")
async def admin_create_exam(payload: dict, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        exam = Exam(
            language_code=payload["language_code"],
            title=payload["title"],
            description=payload.get("description"),
            level_code=payload.get("level_code"),
            duration_minutes=payload.get("duration_minutes", 20),
            passing_score=payload.get("passing_score", 70),
            is_active=payload.get("is_active", True),
        )
        session.add(exam)
        await session.flush()
        for index, question in enumerate(payload.get("questions", []), start=1):
            session.add(
                ExamQuestion(
                    exam_id=exam.id,
                    question_type=question.get("question_type", "quiz"),
                    prompt=question["prompt"],
                    payload=question.get("payload", {}),
                    correct_answer=question.get("correct_answer"),
                    points=question.get("points", 1),
                    order_index=question.get("order_index", index),
                )
            )
        await session.commit()
        await session.refresh(exam)
        await notify_admin_clients(tab="exams")
        await notify_content_clients(tab="exams", language_code=exam.language_code)
        return await exam_to_admin_out(session, exam)


@router.patch("/exams/{exam_id}")
async def admin_update_exam(exam_id: int, payload: dict, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        exam = (await session.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
        if exam is None:
            raise HTTPException(status_code=404, detail="Đề thi không tồn tại")

        exam.language_code = payload["language_code"]
        exam.title = payload["title"]
        exam.description = payload.get("description")
        exam.level_code = payload.get("level_code")
        exam.duration_minutes = payload.get("duration_minutes", 20)
        exam.passing_score = payload.get("passing_score", 70)
        exam.is_active = payload.get("is_active", True)

        await session.execute(delete(ExamQuestion).where(ExamQuestion.exam_id == exam.id))
        await session.flush()

        for index, question in enumerate(payload.get("questions", []), start=1):
            session.add(
                ExamQuestion(
                    exam_id=exam.id,
                    question_type=question.get("question_type", "quiz"),
                    prompt=question["prompt"],
                    payload=question.get("payload", {}),
                    correct_answer=question.get("correct_answer"),
                    points=question.get("points", 1),
                    order_index=question.get("order_index", index),
                )
            )

        await session.commit()
        await session.refresh(exam)
        await notify_admin_clients(tab="exams")
        await notify_content_clients(tab="exams", language_code=exam.language_code)
        return await exam_to_admin_out(session, exam)


@router.delete("/exams/{exam_id}", response_model=SimpleStatusOut)
async def admin_delete_exam(exam_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        exam = (await session.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
        if exam is None:
            raise HTTPException(status_code=404, detail="Đề thi không tồn tại")
        language_code = exam.language_code
        await session.execute(delete(ExamQuestion).where(ExamQuestion.exam_id == exam.id))
        await session.delete(exam)
        await session.commit()
        await notify_admin_clients(tab="exams")
        await notify_content_clients(tab="exams", language_code=language_code)
        return SimpleStatusOut(ok=True, message="Đã xóa đề thi")


@router.post("/notifications/broadcast", response_model=SimpleStatusOut)
async def admin_broadcast_notification(payload: dict, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        session.add(
            Notification(
                user_id=payload.get("user_id"),
                title=payload["title"],
                content=payload["content"],
                notification_type=payload.get("notification_type", "admin"),
            )
        )
        await session.commit()
        await notify_admin_clients(tab="tickets")
        if payload.get("user_id"):
            await send_user_event(payload["user_id"], "system:broadcast", {"title": payload["title"], "content": payload["content"]})
        else:
            await broadcast_event("system:broadcast", {"title": payload["title"], "content": payload["content"]})
        return SimpleStatusOut(ok=True, message="Đã gửi thông báo")
