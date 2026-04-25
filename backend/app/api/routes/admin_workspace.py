from __future__ import annotations

import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select

from app.api.deps.auth import get_admin_user
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.course import Course, CourseSection, Lesson
from app.models.feature import (
    AdminAuditLog,
    AdminGrant,
    CommunityPost,
    CommunityReport,
    Exam,
    ExamAttempt,
    ExamQuestion,
    FeatureFlag,
    FriendLink,
    GroupRoom,
    GroupRoomMember,
    Notification,
    QuestionBankItem,
    SupportTicket,
    SystemSetting,
    Tournament,
    TournamentAttempt,
    utc_now,
)
from app.models.level import Level
from app.models.package import Package, PackageCourse, PaymentTransaction, UserEntitlement
from app.models.practice import PracticeActivity, PracticeAttempt
from app.models.progress import LessonProgress
from app.models.roadmap import Roadmap, RoadmapStage
from app.models.session_token import SessionToken
from app.models.user import User
from app.models.vocabulary import VocabularyEntry
from app.services.entitlement import (
    build_active_entitlement_filters,
    effective_entitlement_status,
    grant_entitlement,
    is_entitlement_active,
)
from app.services.realtime import broadcast_event, send_user_event

router = APIRouter(prefix="/v1/admin", tags=["admin"])

DEFAULT_FEATURE_FLAGS = [
    {
        "code": "realtime_notifications",
        "name": "Realtime thông báo",
        "description": "Bật cập nhật thông báo realtime cho toàn hệ thống.",
        "is_enabled": True,
    },
    {
        "code": "community_groups",
        "name": "Nhóm chat cộng đồng",
        "description": "Cho phép người dùng tạo và tham gia nhóm riêng.",
        "is_enabled": True,
    },
    {
        "code": "ai_pet_voice",
        "name": "Voice với pet",
        "description": "Bật tính năng trò chuyện với pet.",
        "is_enabled": True,
    },
]

DEFAULT_SYSTEM_SETTINGS = [
    {
        "key": "global_runtime",
        "category": "general",
        "value": {
            "app_name": "Vmora",
            "target_concurrency": 20000,
            "realtime_mode": True,
        },
    },
    {
        "key": "ai_provider",
        "category": "ai",
        "value": {
            "provider": "gemini",
            "status": "configured_by_user",
            "note": "Admin rà soát khóa API và trạng thái kết nối tại đây.",
        },
    },
]


def iso(value) -> str | None:
    return value.isoformat() if value else None


def to_public_user_id(user_id: int) -> str:
    return str(user_id).zfill(5)


def parse_public_user_id(raw_value: object) -> int:
    value = str(raw_value or "").strip()
    if not value:
        raise HTTPException(status_code=422, detail="Thiếu user_id người nhận")
    if not value.isdigit() or len(value) < 5:
        raise HTTPException(status_code=422, detail="user_id phải là chuỗi số gồm ít nhất 5 chữ số")
    return int(value)


def points_from_counts(*, completed_lessons: int, exam_attempts: int, tournament_attempts: int) -> int:
    return completed_lessons + exam_attempts * 10 + tournament_attempts * 10


def get_active_entitlement_row(entitlement_rows: list[tuple[UserEntitlement, Package]]):
    for entitlement, package in entitlement_rows:
        if is_entitlement_active(entitlement):
            return entitlement, package
    return None


async def notify_admin_clients(*, tab: str) -> None:
    async with AsyncSessionLocal() as session:
        admin_ids = list((await session.execute(select(AdminGrant.user_id))).scalars().all())
    for admin_id in admin_ids:
        await send_user_event(admin_id, "admin:refresh", {"tab": tab})


async def notify_content_clients(*, tab: str, language_code: str | None = None) -> None:
    await broadcast_event("content:update", {"tab": tab, "language_code": language_code})


async def record_admin_action(
    session,
    *,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: str | None,
    detail: dict,
) -> None:
    session.add(
        AdminAuditLog(
            admin_user_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )


async def ensure_system_defaults(session) -> None:
    for item in DEFAULT_FEATURE_FLAGS:
        result = await session.execute(select(FeatureFlag).where(FeatureFlag.code == item["code"]))
        if result.scalar_one_or_none() is None:
            session.add(FeatureFlag(**item))

    for item in DEFAULT_SYSTEM_SETTINGS:
        result = await session.execute(select(SystemSetting).where(SystemSetting.key == item["key"]))
        if result.scalar_one_or_none() is None:
            session.add(SystemSetting(**item))

    await session.flush()


async def build_user_snapshot(session, user: User, admin_ids: set[int]) -> dict:
    completed_lessons = (
        await session.execute(select(func.count(LessonProgress.id)).where(LessonProgress.user_id == user.id))
    ).scalar_one()
    practice_attempts = (
        await session.execute(select(func.count(PracticeAttempt.id)).where(PracticeAttempt.user_id == user.id))
    ).scalar_one()
    exam_attempts = (await session.execute(select(func.count(ExamAttempt.id)).where(ExamAttempt.user_id == user.id))).scalar_one()
    tournament_attempts = (
        await session.execute(select(func.count(TournamentAttempt.id)).where(TournamentAttempt.user_id == user.id))
    ).scalar_one()

    entitlement_rows = (
        await session.execute(
            select(UserEntitlement, Package)
            .join(Package, Package.id == UserEntitlement.package_id)
            .where(UserEntitlement.user_id == user.id)
            .order_by(UserEntitlement.created_at.desc())
        )
    ).all()

    latest_ticket = (
        await session.execute(
            select(SupportTicket).where(SupportTicket.user_id == user.id).order_by(SupportTicket.updated_at.desc()).limit(1)
        )
    ).scalar_one_or_none()
    active_entitlement_row = get_active_entitlement_row(entitlement_rows)

    return {
        "id": user.id,
        "public_user_id": to_public_user_id(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "learning_language_code": user.learning_language_code,
        "is_admin": user.id in admin_ids,
        "is_locked": user.is_locked,
        "is_verified": user.is_verified,
        "created_at": iso(user.created_at),
        "completed_lessons": completed_lessons,
        "practice_attempts": practice_attempts,
        "exam_attempts": exam_attempts,
        "tournament_attempts": tournament_attempts,
        "estimated_points": points_from_counts(
            completed_lessons=completed_lessons,
            exam_attempts=exam_attempts,
            tournament_attempts=tournament_attempts,
        ),
        "active_package_name": active_entitlement_row[1].name if active_entitlement_row else None,
        "active_package_expires_at": iso(active_entitlement_row[0].expires_at) if active_entitlement_row else None,
        "latest_ticket_status": latest_ticket.status if latest_ticket else None,
    }


@router.get("/workspace/dashboard")
async def get_admin_dashboard_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        user_count = (await session.execute(select(func.count(User.id)))).scalar_one()
        course_count = (await session.execute(select(func.count(Course.id)))).scalar_one()
        lesson_count = (await session.execute(select(func.count(Lesson.id)))).scalar_one()
        package_count = (await session.execute(select(func.count(Package.id)))).scalar_one()
        payment_count = (await session.execute(select(func.count(PaymentTransaction.id)))).scalar_one()
        open_ticket_count = (
            await session.execute(select(func.count(SupportTicket.id)).where(SupportTicket.status != "closed"))
        ).scalar_one()
        report_count = (
            await session.execute(select(func.count(CommunityReport.id)).where(CommunityReport.status != "resolved"))
        ).scalar_one()

        admin_ids = set((await session.execute(select(AdminGrant.user_id))).scalars().all())
        users = (await session.execute(select(User).order_by(User.created_at.desc()).limit(5))).scalars().all()
        tickets = (await session.execute(select(SupportTicket).order_by(SupportTicket.updated_at.desc()).limit(5))).scalars().all()
        payments = (
            await session.execute(select(PaymentTransaction).order_by(PaymentTransaction.created_at.desc()).limit(5))
        ).scalars().all()

        return {
            "metrics": {
                "user_count": user_count,
                "course_count": course_count,
                "lesson_count": lesson_count,
                "package_count": package_count,
                "payment_count": payment_count,
                "open_ticket_count": open_ticket_count,
                "report_count": report_count,
            },
            "quick_users": [await build_user_snapshot(session, user, admin_ids) for user in users],
            "quick_tickets": [
                {"id": item.id, "title": item.title, "status": item.status, "updated_at": iso(item.updated_at)}
                for item in tickets
            ],
            "quick_payments": [
                {
                    "id": item.id,
                    "order_id": item.order_id,
                    "status": item.status,
                    "amount_vnd": item.amount_vnd,
                    "created_at": iso(item.created_at),
                }
                for item in payments
            ],
        }


@router.get("/workspace/users")
async def get_admin_users_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        admin_ids = set((await session.execute(select(AdminGrant.user_id))).scalars().all())
        users = (await session.execute(select(User).order_by(User.created_at.desc()).limit(100))).scalars().all()
        return {"users": [await build_user_snapshot(session, user, admin_ids) for user in users]}


@router.get("/users/{user_id}/detail")
async def get_admin_user_detail(user_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

        admin_ids = set((await session.execute(select(AdminGrant.user_id))).scalars().all())
        profile = await build_user_snapshot(session, user, admin_ids)
        entitlements = (
            await session.execute(
                select(UserEntitlement, Package)
                .join(Package, Package.id == UserEntitlement.package_id)
                .where(UserEntitlement.user_id == user.id)
                .order_by(UserEntitlement.created_at.desc())
            )
        ).all()
        course_progress = (
            await session.execute(
                select(Course, func.count(LessonProgress.id))
                .join(CourseSection, CourseSection.course_id == Course.id)
                .join(Lesson, Lesson.section_id == CourseSection.id)
                .outerjoin(
                    LessonProgress,
                    (LessonProgress.lesson_id == Lesson.id) & (LessonProgress.user_id == user.id),
                )
                .group_by(Course.id)
                .order_by(Course.order_index.asc(), Course.id.asc())
            )
        ).all()
        practice_history = (
            await session.execute(
                select(PracticeAttempt, PracticeActivity)
                .join(PracticeActivity, PracticeActivity.id == PracticeAttempt.activity_id)
                .where(PracticeAttempt.user_id == user.id)
                .order_by(PracticeAttempt.created_at.desc())
                .limit(10)
            )
        ).all()
        exam_history = (
            await session.execute(
                select(ExamAttempt, Exam)
                .join(Exam, Exam.id == ExamAttempt.exam_id)
                .where(ExamAttempt.user_id == user.id)
                .order_by(ExamAttempt.created_at.desc())
                .limit(10)
            )
        ).all()
        tournament_history = (
            await session.execute(
                select(TournamentAttempt, Tournament)
                .join(Tournament, Tournament.id == TournamentAttempt.tournament_id)
                .where(TournamentAttempt.user_id == user.id)
                .order_by(TournamentAttempt.created_at.desc())
                .limit(10)
            )
        ).all()
        tickets = (
            await session.execute(
                select(SupportTicket).where(SupportTicket.user_id == user.id).order_by(SupportTicket.updated_at.desc()).limit(20)
            )
        ).scalars().all()

        return {
            "profile": profile,
            "entitlements": [
                {
                    "id": entitlement.id,
                    "package_id": package.id,
                    "package_name": package.name,
                    "status": effective_entitlement_status(entitlement),
                    "is_free": package.is_free,
                    "expires_at": iso(entitlement.expires_at),
                    "created_at": iso(entitlement.created_at),
                }
                for entitlement, package in entitlements
            ],
            "progress": [
                {"course_id": course.id, "course_title": course.title, "completed_lessons": completed_count}
                for course, completed_count in course_progress
            ],
            "practice_history": [
                {
                    "attempt_id": attempt.id,
                    "title": activity.title,
                    "activity_type": activity.activity_type,
                    "score_percent": attempt.score_percent,
                    "created_at": iso(attempt.created_at),
                }
                for attempt, activity in practice_history
            ],
            "exam_history": [
                {
                    "attempt_id": attempt.id,
                    "title": exam.title,
                    "score_percent": attempt.score_percent,
                    "passed": attempt.passed,
                    "created_at": iso(attempt.created_at),
                }
                for attempt, exam in exam_history
            ],
            "tournament_history": [
                {
                    "attempt_id": attempt.id,
                    "title": tournament.title,
                    "score_percent": attempt.score_percent,
                    "passed": attempt.passed,
                    "created_at": iso(attempt.created_at),
                }
                for attempt, tournament in tournament_history
            ],
            "tickets": [
                {
                    "id": item.id,
                    "title": item.title,
                    "status": item.status,
                    "admin_reply": item.admin_reply,
                    "updated_at": iso(item.updated_at),
                }
                for item in tickets
            ],
        }


async def update_user_status(
    *,
    user_id: int,
    admin: User,
    is_locked: bool | None = None,
    is_verified: bool | None = None,
) -> dict:
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

        if is_locked is not None:
            user.is_locked = is_locked
        if is_verified is not None:
            user.is_verified = is_verified

        await record_admin_action(
            session,
            admin_id=admin.id,
            action="user_status_update",
            target_type="user",
            target_id=str(user.id),
            detail={"is_locked": user.is_locked, "is_verified": user.is_verified},
        )
        await session.commit()
        await notify_admin_clients(tab="users")
        return {"ok": True, "message": "Đã cập nhật trạng thái người dùng"}


@router.post("/users/{user_id}/lock")
async def lock_user(user_id: int, admin: User = Depends(get_admin_user)):
    result = await update_user_status(user_id=user_id, admin=admin, is_locked=True)
    await send_user_event(user_id, "system:broadcast", {"title": "Tài khoản", "content": "Tài khoản của bạn đã bị khóa bởi admin."})
    return result


@router.post("/users/{user_id}/unlock")
async def unlock_user(user_id: int, admin: User = Depends(get_admin_user)):
    result = await update_user_status(user_id=user_id, admin=admin, is_locked=False)
    await send_user_event(user_id, "system:broadcast", {"title": "Tài khoản", "content": "Tài khoản của bạn đã được mở khóa."})
    return result


@router.post("/users/{user_id}/verify")
async def verify_user(user_id: int, admin: User = Depends(get_admin_user)):
    result = await update_user_status(user_id=user_id, admin=admin, is_verified=True)
    await send_user_event(user_id, "system:broadcast", {"title": "Xác minh", "content": "Tài khoản của bạn đã được xác minh."})
    return result


@router.post("/users/{user_id}/reset-password")
async def admin_reset_user_password(user_id: int, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

        temp_password = f"Vmora@{secrets.token_hex(4)}"
        user.password_hash = hash_password(temp_password)
        await session.execute(delete(SessionToken).where(SessionToken.user_id == user.id))
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="user_reset_password",
            target_type="user",
            target_id=str(user.id),
            detail={"email": user.email},
        )
        await session.commit()
        await notify_admin_clients(tab="users")
        return {"ok": True, "message": "Đã reset mật khẩu", "temporary_password": temp_password}


@router.get("/workspace/learning-content")
async def get_admin_learning_content_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        course_language_codes = (await session.execute(select(Course.language_code).distinct())).scalars().all()
        vocabulary_language_codes = (await session.execute(select(VocabularyEntry.language_code).distinct())).scalars().all()
        return {
            "workflow": [
                "Chọn ngôn ngữ",
                "Tạo cấp độ",
                "Tạo lộ trình",
                "Tạo khóa học",
                "Tạo chương",
                "Tạo bài học",
                "Thêm nội dung",
                "Xem trước",
                "Xuất bản",
            ],
            "languages": sorted({*course_language_codes, *vocabulary_language_codes}),
            "levels": [
                {
                    "id": item.id,
                    "language_code": item.language_code,
                    "code": item.code,
                    "title": item.title,
                    "order_index": item.order_index,
                }
                for item in (await session.execute(select(Level).order_by(Level.language_code.asc(), Level.order_index.asc()))).scalars().all()
            ],
            "roadmaps": [
                {"id": item.id, "language_code": item.language_code, "level_id": item.level_id, "title": item.title}
                for item in (await session.execute(select(Roadmap).order_by(Roadmap.language_code.asc(), Roadmap.id.asc()))).scalars().all()
            ],
            "stages": [
                {"id": item.id, "roadmap_id": item.roadmap_id, "title": item.title, "order_index": item.order_index}
                for item in (await session.execute(select(RoadmapStage).order_by(RoadmapStage.roadmap_id.asc(), RoadmapStage.order_index.asc()))).scalars().all()
            ],
            "courses": [
                {
                    "id": item.id,
                    "language_code": item.language_code,
                    "roadmap_id": item.roadmap_id,
                    "title": item.title,
                    "is_free": item.is_free,
                    "is_published": item.is_published,
                    "order_index": item.order_index,
                }
                for item in (await session.execute(select(Course).order_by(Course.language_code.asc(), Course.order_index.asc()))).scalars().all()
            ],
            "sections": [
                {"id": item.id, "course_id": item.course_id, "title": item.title, "is_published": item.is_published, "order_index": item.order_index}
                for item in (await session.execute(select(CourseSection).order_by(CourseSection.course_id.asc(), CourseSection.order_index.asc()))).scalars().all()
            ],
            "lessons": [
                {
                    "id": item.id,
                    "section_id": item.section_id,
                    "stage_id": item.stage_id,
                    "title": item.title,
                    "summary": item.summary,
                    "content": item.content,
                    "estimated_minutes": item.estimated_minutes,
                    "is_free_preview": item.is_free_preview,
                    "is_published": item.is_published,
                }
                for item in (await session.execute(select(Lesson).order_by(Lesson.section_id.asc(), Lesson.order_index.asc()))).scalars().all()
            ],
            "summary": {
                "language_count": len({*course_language_codes, *vocabulary_language_codes}),
                "course_count": (await session.execute(select(func.count(Course.id)))).scalar_one(),
                "lesson_count": (await session.execute(select(func.count(Lesson.id)))).scalar_one(),
            },
        }


@router.get("/learning-content/lessons/{lesson_id}/preview")
async def preview_learning_lesson(lesson_id: int, _admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        row = (
            await session.execute(
                select(Lesson, CourseSection, Course)
                .join(CourseSection, CourseSection.id == Lesson.section_id)
                .join(Course, Course.id == CourseSection.course_id)
                .where(Lesson.id == lesson_id)
            )
        ).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Bài học không tồn tại")
        lesson, section, course = row
        return {
            "lesson_id": lesson.id,
            "title": lesson.title,
            "summary": lesson.summary,
            "content": lesson.content,
            "estimated_minutes": lesson.estimated_minutes,
            "is_free_preview": lesson.is_free_preview,
            "is_published": lesson.is_published,
            "section_title": section.title,
            "course_title": course.title,
            "language_code": course.language_code,
        }


@router.patch("/learning-content/{item_type}/{item_id}/publish")
async def publish_learning_content(item_type: str, item_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    model_map = {"courses": Course, "sections": CourseSection, "lessons": Lesson}
    model = model_map.get(item_type)
    if model is None:
        raise HTTPException(status_code=404, detail="Loại học liệu không hỗ trợ")

    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(model).where(model.id == item_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Học liệu không tồn tại")
        item.is_published = bool(payload.get("is_published", True))

        language_code = None
        if item_type == "courses":
            language_code = item.language_code
        elif item_type == "sections":
            course = (await session.execute(select(Course).where(Course.id == item.course_id))).scalar_one_or_none()
            language_code = course.language_code if course else None
        elif item_type == "lessons":
            course = (
                await session.execute(
                    select(Course).join(CourseSection, CourseSection.course_id == Course.id).where(CourseSection.id == item.section_id)
                )
            ).scalar_one_or_none()
            language_code = course.language_code if course else None

        await record_admin_action(
            session,
            admin_id=admin.id,
            action="learning_content_publish",
            target_type=item_type,
            target_id=str(item_id),
            detail={"is_published": item.is_published},
        )
        await session.commit()
        await notify_admin_clients(tab=item_type)
        await notify_admin_clients(tab="learning-content")
        await notify_content_clients(tab=item_type, language_code=language_code)
        return {"ok": True, "message": "Đã cập nhật trạng thái xuất bản"}


@router.get("/workspace/practice-exams")
async def get_admin_practice_exam_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        exam_question_counts = {
            exam_id: count
            for exam_id, count in (
                await session.execute(select(ExamQuestion.exam_id, func.count(ExamQuestion.id)).group_by(ExamQuestion.exam_id))
            ).all()
        }
        return {
            "workflow": [
                "Tạo câu hỏi",
                "Chọn dạng bài",
                "Nhập đáp án đúng",
                "Gắn âm thanh / hình ảnh",
                "Gắn cấp độ & chủ đề",
                "Tạo bộ ôn luyện hoặc đề thi",
                "Mở cho người dùng làm",
                "Xem kết quả & điểm số",
            ],
            "practice": [
                {
                    "id": item.id,
                    "title": item.title,
                    "activity_type": item.activity_type,
                    "language_code": item.language_code,
                    "lesson_id": item.lesson_id,
                    "is_active": item.is_active,
                }
                for item in (await session.execute(select(PracticeActivity).order_by(PracticeActivity.id.desc()).limit(100))).scalars().all()
            ],
            "question_bank": [
                {
                    "id": item.id,
                    "language_code": item.language_code,
                    "level_code": item.level_code,
                    "topic": item.topic,
                    "question_type": item.question_type,
                    "prompt": item.prompt,
                    "payload": item.payload,
                    "correct_answer": item.correct_answer,
                    "media_url": item.media_url,
                    "explanation": item.explanation,
                    "is_active": item.is_active,
                    "created_at": iso(item.created_at),
                }
                for item in (
                    await session.execute(select(QuestionBankItem).order_by(QuestionBankItem.created_at.desc()).limit(100))
                ).scalars().all()
            ],
            "exams": [
                {
                    "id": item.id,
                    "title": item.title,
                    "language_code": item.language_code,
                    "level_code": item.level_code,
                    "question_count": exam_question_counts.get(item.id, 0),
                    "is_active": item.is_active,
                }
                for item in (await session.execute(select(Exam).order_by(Exam.id.desc()).limit(50))).scalars().all()
            ],
            "exam_results": [
                {
                    "attempt_id": attempt.id,
                    "exam_title": exam.title,
                    "user_id": attempt.user_id,
                    "score_percent": attempt.score_percent,
                    "passed": attempt.passed,
                    "created_at": iso(attempt.created_at),
                }
                for attempt, exam in (
                    await session.execute(
                        select(ExamAttempt, Exam).join(Exam, Exam.id == ExamAttempt.exam_id).order_by(ExamAttempt.created_at.desc()).limit(30)
                    )
                ).all()
            ],
            "tournaments": [
                {
                    "id": item.id,
                    "title": item.title,
                    "language_code": item.language_code,
                    "is_active": item.is_active,
                    "reward_title": item.reward_title,
                }
                for item in (await session.execute(select(Tournament).order_by(Tournament.created_at.desc()).limit(20))).scalars().all()
            ],
        }


def question_bank_item_to_dict(item: QuestionBankItem) -> dict:
    return {
        "id": item.id,
        "language_code": item.language_code,
        "level_code": item.level_code,
        "topic": item.topic,
        "question_type": item.question_type,
        "prompt": item.prompt,
        "payload": item.payload,
        "correct_answer": item.correct_answer,
        "media_url": item.media_url,
        "explanation": item.explanation,
        "is_active": item.is_active,
        "created_at": iso(item.created_at),
    }


@router.post("/question-bank")
async def create_question_bank_item(payload: dict, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = QuestionBankItem(
            language_code=payload["language_code"],
            level_code=payload.get("level_code"),
            topic=payload.get("topic"),
            question_type=payload.get("question_type", "quiz"),
            prompt=payload["prompt"],
            payload=payload.get("payload", {}),
            correct_answer=payload.get("correct_answer"),
            media_url=payload.get("media_url"),
            explanation=payload.get("explanation"),
            is_active=payload.get("is_active", True),
        )
        session.add(item)
        await session.flush()
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="question_bank_create",
            target_type="question_bank_item",
            target_id=str(item.id),
            detail={"language_code": item.language_code, "question_type": item.question_type},
        )
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="practice-exams")
        return question_bank_item_to_dict(item)


@router.patch("/question-bank/{item_id}")
async def update_question_bank_item(item_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(QuestionBankItem).where(QuestionBankItem.id == item_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")
        for key in ["language_code", "level_code", "topic", "question_type", "prompt", "payload", "correct_answer", "media_url", "explanation", "is_active"]:
            if key in payload:
                setattr(item, key, payload[key])
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="question_bank_update",
            target_type="question_bank_item",
            target_id=str(item.id),
            detail={"is_active": item.is_active},
        )
        await session.commit()
        await session.refresh(item)
        await notify_admin_clients(tab="practice-exams")
        return question_bank_item_to_dict(item)


@router.delete("/question-bank/{item_id}")
async def delete_question_bank_item(item_id: int, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        item = (await session.execute(select(QuestionBankItem).where(QuestionBankItem.id == item_id))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")
        await session.delete(item)
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="question_bank_delete",
            target_type="question_bank_item",
            target_id=str(item_id),
            detail={},
        )
        await session.commit()
        await notify_admin_clients(tab="practice-exams")
        return {"ok": True, "message": "Đã xóa câu hỏi"}


async def get_question_bank_items(session, question_ids: list[int]) -> list[QuestionBankItem]:
    items = (
        await session.execute(
            select(QuestionBankItem)
            .where(QuestionBankItem.id.in_(question_ids), QuestionBankItem.is_active.is_(True))
            .order_by(QuestionBankItem.id.asc())
        )
    ).scalars().all()
    if len(items) != len(set(question_ids)):
        raise HTTPException(status_code=400, detail="Một số câu hỏi không tồn tại hoặc đã tắt")
    return items


@router.post("/question-bank/build-practice")
async def build_practice_from_question_bank(payload: dict, admin: User = Depends(get_admin_user)):
    question_ids = [int(item) for item in payload.get("question_ids", [])]
    if not question_ids:
        raise HTTPException(status_code=422, detail="Cần chọn câu hỏi")

    async with AsyncSessionLocal() as session:
        questions = await get_question_bank_items(session, question_ids)
        first = questions[0]
        activity = PracticeActivity(
            language_code=payload.get("language_code") or first.language_code,
            lesson_id=payload.get("lesson_id"),
            code=payload.get("code") or f"bank-practice-{secrets.token_hex(4)}",
            activity_type=payload.get("activity_type", "mixed"),
            title=payload.get("title") or "Bộ ôn luyện từ ngân hàng câu hỏi",
            description=payload.get("description"),
            prompt=payload.get("prompt") or "Hoàn thành các câu hỏi trong bộ ôn luyện.",
            payload={
                "source": "question_bank",
                "question_ids": question_ids,
                "items": [question_bank_item_to_dict(item) for item in questions],
            },
            order_index=payload.get("order_index", 1),
            is_free=payload.get("is_free", True),
            is_active=payload.get("is_active", True),
        )
        session.add(activity)
        await session.flush()
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="question_bank_build_practice",
            target_type="practice_activity",
            target_id=str(activity.id),
            detail={"question_ids": question_ids},
        )
        await session.commit()
        await notify_admin_clients(tab="practice")
        await notify_admin_clients(tab="practice-exams")
        await notify_content_clients(tab="practice", language_code=activity.language_code)
        return {"ok": True, "message": "Đã tạo bộ ôn luyện từ ngân hàng câu hỏi", "practice_id": activity.id}


@router.post("/question-bank/build-exam")
async def build_exam_from_question_bank(payload: dict, admin: User = Depends(get_admin_user)):
    question_ids = [int(item) for item in payload.get("question_ids", [])]
    if not question_ids:
        raise HTTPException(status_code=422, detail="Cần chọn câu hỏi")

    async with AsyncSessionLocal() as session:
        questions = await get_question_bank_items(session, question_ids)
        first = questions[0]
        exam = Exam(
            language_code=payload.get("language_code") or first.language_code,
            title=payload.get("title") or "Đề thi từ ngân hàng câu hỏi",
            description=payload.get("description"),
            level_code=payload.get("level_code") or first.level_code,
            duration_minutes=payload.get("duration_minutes", 20),
            passing_score=payload.get("passing_score", 70),
            is_active=payload.get("is_active", True),
        )
        session.add(exam)
        await session.flush()
        for index, question in enumerate(questions, start=1):
            session.add(
                ExamQuestion(
                    exam_id=exam.id,
                    question_type=question.question_type,
                    prompt=question.prompt,
                    payload={**(question.payload or {}), "media_url": question.media_url, "explanation": question.explanation},
                    correct_answer=question.correct_answer,
                    points=1,
                    order_index=index,
                )
            )
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="question_bank_build_exam",
            target_type="exam",
            target_id=str(exam.id),
            detail={"question_ids": question_ids},
        )
        await session.commit()
        await notify_admin_clients(tab="exams")
        await notify_admin_clients(tab="practice-exams")
        await notify_content_clients(tab="exams", language_code=exam.language_code)
        return {"ok": True, "message": "Đã tạo đề thi từ ngân hàng câu hỏi", "exam_id": exam.id}


@router.get("/workspace/payments")
async def get_admin_payment_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        package_course_rows = (await session.execute(select(PackageCourse.package_id, PackageCourse.course_id))).all()
        course_map: dict[int, list[int]] = {}
        for package_id, course_id in package_course_rows:
            course_map.setdefault(package_id, []).append(course_id)

        return {
            "packages": [
                {
                    "id": item.id,
                    "code": item.code,
                    "name": item.name,
                    "language_code": item.language_code,
                    "price_vnd": item.price_vnd,
                    "duration_days": item.duration_days,
                    "is_free": item.is_free,
                    "is_active": item.is_active,
                    "course_ids": course_map.get(item.id, []),
                }
                for item in (await session.execute(select(Package).order_by(Package.language_code.asc(), Package.price_vnd.asc()))).scalars().all()
            ],
            "courses": [
                {"id": item.id, "title": item.title, "language_code": item.language_code, "is_free": item.is_free}
                for item in (await session.execute(select(Course).order_by(Course.language_code.asc(), Course.order_index.asc()))).scalars().all()
            ],
            "transactions": [
                {
                    "id": item.id,
                    "user_id": item.user_id,
                    "package_id": item.package_id,
                    "provider": item.provider,
                    "order_id": item.order_id,
                    "amount_vnd": item.amount_vnd,
                    "status": item.status,
                    "created_at": iso(item.created_at),
                    "confirmed_at": iso(item.confirmed_at),
                }
                for item in (await session.execute(select(PaymentTransaction).order_by(PaymentTransaction.created_at.desc()).limit(50))).scalars().all()
            ],
            "entitlements": [
                {
                    "id": item.id,
                    "user_id": item.user_id,
                    "package_id": item.package_id,
                    "status": item.status,
                    "created_at": iso(item.created_at),
                    "expires_at": iso(item.expires_at),
                }
                for item in (await session.execute(select(UserEntitlement).order_by(UserEntitlement.created_at.desc()).limit(100))).scalars().all()
            ],
        }


@router.put("/packages/{package_id}/courses")
async def replace_package_courses(package_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    course_ids = list({int(item) for item in payload.get("course_ids", [])})
    async with AsyncSessionLocal() as session:
        package = (await session.execute(select(Package).where(Package.id == package_id))).scalar_one_or_none()
        if package is None:
            raise HTTPException(status_code=404, detail="Gói không tồn tại")

        await session.execute(delete(PackageCourse).where(PackageCourse.package_id == package_id))
        for course_id in course_ids:
            session.add(PackageCourse(package_id=package_id, course_id=course_id))

        await record_admin_action(
            session,
            admin_id=admin.id,
            action="package_course_replace",
            target_type="package",
            target_id=str(package_id),
            detail={"course_ids": course_ids},
        )
        await session.commit()
        await notify_admin_clients(tab="packages")
        await broadcast_event("content:update", {"tab": "packages", "language_code": package.language_code})
        return {"ok": True, "message": "Đã cập nhật khóa học cho gói"}


@router.post("/payments/{payment_id}/confirm")
async def confirm_payment(payment_id: int, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        row = (
            await session.execute(
                select(PaymentTransaction, Package)
                .join(Package, Package.id == PaymentTransaction.package_id)
                .where(PaymentTransaction.id == payment_id)
            )
        ).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Giao dịch không tồn tại")

        payment, package = row
        payment.status = "succeeded"
        payment.confirmed_at = utc_now()
        entitlement = await grant_entitlement(session, user_id=payment.user_id, package=package)
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="payment_confirm",
            target_type="payment",
            target_id=str(payment.id),
            detail={"package_id": package.id, "user_id": payment.user_id},
        )
        await session.commit()
        await notify_admin_clients(tab="packages")
        await send_user_event(
            payment.user_id,
            "payment:succeeded",
            {
                "transaction_id": payment.id,
                "package_id": package.id,
                "language_code": package.language_code,
                "entitlement_id": entitlement.id,
            },
        )
        return {"ok": True, "message": "Đã xác nhận thanh toán"}


async def set_payment_status(*, payment_id: int, admin: User, status_value: str) -> dict:
    async with AsyncSessionLocal() as session:
        payment = (await session.execute(select(PaymentTransaction).where(PaymentTransaction.id == payment_id))).scalar_one_or_none()
        if payment is None:
            raise HTTPException(status_code=404, detail="Giao dịch không tồn tại")
        payment.status = status_value
        await record_admin_action(
            session,
            admin_id=admin.id,
            action=f"payment_{status_value}",
            target_type="payment",
            target_id=str(payment.id),
            detail={"user_id": payment.user_id, "package_id": payment.package_id},
        )
        if status_value in {"cancelled", "refunded"}:
            entitlement_rows = (
                await session.execute(
                    select(UserEntitlement).where(
                        UserEntitlement.user_id == payment.user_id,
                        UserEntitlement.package_id == payment.package_id,
                        *build_active_entitlement_filters(),
                    )
                )
            ).scalars().all()
            for entitlement in entitlement_rows:
                entitlement.status = status_value
        await session.commit()
        await notify_admin_clients(tab="packages")
        return {"ok": True, "message": "Đã cập nhật giao dịch"}


@router.post("/payments/{payment_id}/cancel")
async def cancel_payment(payment_id: int, admin: User = Depends(get_admin_user)):
    return await set_payment_status(payment_id=payment_id, admin=admin, status_value="cancelled")


@router.post("/payments/{payment_id}/refund")
async def refund_payment(payment_id: int, admin: User = Depends(get_admin_user)):
    return await set_payment_status(payment_id=payment_id, admin=admin, status_value="refunded")


@router.post("/entitlements/manual")
async def create_manual_entitlement(payload: dict, admin: User = Depends(get_admin_user)):
    user_id = payload.get("user_id")
    package_id = payload.get("package_id")
    if not user_id or not package_id:
        raise HTTPException(status_code=422, detail="Thiếu user_id hoặc package_id")

    async with AsyncSessionLocal() as session:
        package = (await session.execute(select(Package).where(Package.id == int(package_id)))).scalar_one_or_none()
        if package is None:
            raise HTTPException(status_code=404, detail="Gói không tồn tại")
        if not package.is_active:
            raise HTTPException(status_code=400, detail="Gói học đang tạm dừng kích hoạt")
        entitlement = await grant_entitlement(session, user_id=int(user_id), package=package)
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="entitlement_manual_create",
            target_type="entitlement",
            target_id=str(entitlement.id),
            detail={"user_id": user_id, "package_id": package_id},
        )
        await session.commit()
        await notify_admin_clients(tab="packages")
        await send_user_event(int(user_id), "entitlement:update", {"entitlement_id": entitlement.id})
        return {"ok": True, "message": "Đã kích hoạt quyền học thủ công"}


@router.post("/entitlements/{entitlement_id}/extend")
async def extend_entitlement(entitlement_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    extend_days = int(payload.get("extend_days", 30))
    async with AsyncSessionLocal() as session:
        entitlement = (await session.execute(select(UserEntitlement).where(UserEntitlement.id == entitlement_id))).scalar_one_or_none()
        if entitlement is None:
            raise HTTPException(status_code=404, detail="Quyền học không tồn tại")

        current_time = utc_now()
        base_time = entitlement.expires_at if entitlement.expires_at and entitlement.expires_at > current_time else current_time
        entitlement.expires_at = base_time + timedelta(days=extend_days)
        entitlement.status = "active"
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="entitlement_extend",
            target_type="entitlement",
            target_id=str(entitlement.id),
            detail={"extend_days": extend_days},
        )
        await session.commit()
        await notify_admin_clients(tab="packages")
        await send_user_event(entitlement.user_id, "entitlement:update", {"entitlement_id": entitlement.id})
        return {"ok": True, "message": "Đã gia hạn quyền học"}


@router.get("/workspace/support")
async def get_admin_support_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        notifications = (await session.execute(select(Notification).order_by(Notification.created_at.desc()).limit(20))).scalars().all()
        tickets = (
            await session.execute(
                select(SupportTicket, User).join(User, User.id == SupportTicket.user_id).order_by(SupportTicket.updated_at.desc()).limit(50)
            )
        ).all()
        admins = (await session.execute(select(User).where(User.id.in_(select(AdminGrant.user_id))))).scalars().all()
        admin_map = {item.id: item.full_name or item.email for item in admins}
        return {
            "admins": [
                {
                    "id": item.id,
                    "name": item.full_name or item.email,
                    "email": item.email,
                }
                for item in admins
            ],
            "languages": sorted(
                {
                    item
                    for item in (await session.execute(select(User.learning_language_code))).scalars().all()
                    if item
                }
            ),
            "notifications": [
                {
                    "id": item.id,
                    "title": item.title,
                    "content": item.content,
                    "notification_type": item.notification_type,
                    "user_id": item.user_id,
                    "public_user_id": to_public_user_id(item.user_id) if item.user_id else None,
                    "created_at": iso(item.created_at),
                }
                for item in notifications
            ],
            "tickets": [
                {
                    "id": ticket.id,
                    "title": ticket.title,
                    "content": ticket.content,
                    "status": ticket.status,
                    "user_id": ticket.user_id,
                    "public_user_id": to_public_user_id(ticket.user_id),
                    "user_name": user.full_name or user.email,
                    "admin_reply": ticket.admin_reply,
                    "assigned_admin_id": ticket.assigned_admin_id,
                    "assigned_admin_name": admin_map.get(ticket.assigned_admin_id),
                    "updated_at": iso(ticket.updated_at),
                }
                for ticket, user in tickets
            ],
        }


@router.post("/notifications/send")
async def send_notification_with_target(payload: dict, admin: User = Depends(get_admin_user)):
    title = str(payload.get("title", "")).strip()
    content = str(payload.get("content", "")).strip()
    if not title or not content:
        raise HTTPException(status_code=422, detail="Thiếu tiêu đề hoặc nội dung")

    target_type = payload.get("target_type", "all")
    target_value = payload.get("target_value")
    notification_type = payload.get("notification_type", "admin")

    async with AsyncSessionLocal() as session:
        users: list[User] = []
        if target_type == "all":
            users = (await session.execute(select(User))).scalars().all()
        elif target_type == "user":
            if not target_value:
                raise HTTPException(status_code=422, detail="Thiếu user nhận")
            user_id = parse_public_user_id(target_value)
            user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            if user is None:
                raise HTTPException(status_code=404, detail="Người nhận không tồn tại")
            users = [user]
        elif target_type == "language":
            if not target_value:
                raise HTTPException(status_code=422, detail="Thiếu nhóm ngôn ngữ")
            users = (
                await session.execute(select(User).where(User.learning_language_code == str(target_value)))
            ).scalars().all()
        elif target_type == "admins":
            users = (
                await session.execute(select(User).where(User.id.in_(select(AdminGrant.user_id))))
            ).scalars().all()
        else:
            raise HTTPException(status_code=422, detail="Nhóm người nhận không hợp lệ")

        if target_type == "all":
            session.add(
                Notification(
                    user_id=None,
                    title=title,
                    content=content,
                    notification_type=notification_type,
                )
            )
        else:
            for user in users:
                session.add(Notification(user_id=user.id, title=title, content=content, notification_type=notification_type))

        await record_admin_action(
            session,
            admin_id=admin.id,
            action="notification_send_targeted",
            target_type="notification",
            target_id=target_type,
            detail={"target_type": target_type, "target_value": target_value, "user_count": len(users)},
        )
        await session.commit()

    if target_type == "all":
        await broadcast_event("system:broadcast", {"title": title, "content": content})
    else:
        for user in users:
            await send_user_event(user.id, "system:broadcast", {"title": title, "content": content})

    await notify_admin_clients(tab="support")
    return {"ok": True, "message": f"Đã gửi thông báo cho {len(users) if target_type != 'all' else 'toàn hệ thống'}"}


@router.patch("/tickets/{ticket_id}/workflow")
async def update_ticket_workflow(ticket_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        ticket = (await session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))).scalar_one_or_none()
        if ticket is None:
            raise HTTPException(status_code=404, detail="Ticket không tồn tại")

        if "status" in payload:
            ticket.status = payload["status"]
        if "admin_reply" in payload:
            ticket.admin_reply = payload["admin_reply"]
        if "assigned_admin_id" in payload:
            assigned_admin_id = payload["assigned_admin_id"]
            if assigned_admin_id in ("", 0):
                assigned_admin_id = None
            if assigned_admin_id is not None:
                admin_exists = (
                    await session.execute(
                        select(AdminGrant.id).where(AdminGrant.user_id == int(assigned_admin_id))
                    )
                ).scalar_one_or_none()
                if admin_exists is None:
                    raise HTTPException(status_code=404, detail="Admin phụ trách không tồn tại")
                assigned_admin_id = int(assigned_admin_id)
            ticket.assigned_admin_id = assigned_admin_id
        ticket.updated_at = utc_now()

        await record_admin_action(
            session,
            admin_id=admin.id,
            action="ticket_workflow_update",
            target_type="ticket",
            target_id=str(ticket.id),
            detail={"status": ticket.status, "assigned_admin_id": ticket.assigned_admin_id},
        )
        await session.commit()
        await send_user_event(
            ticket.user_id,
            "ticket:update",
            {
                "ticket": {
                    "id": ticket.id,
                    "title": ticket.title,
                    "content": ticket.content,
                    "status": ticket.status,
                    "admin_reply": ticket.admin_reply,
                    "created_at": iso(ticket.created_at),
                    "updated_at": iso(ticket.updated_at),
                }
            },
        )
        await notify_admin_clients(tab="tickets")
        return {"ok": True, "message": "Đã cập nhật luồng hỗ trợ"}


@router.get("/workspace/community")
async def get_admin_community_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        users = (await session.execute(select(User).order_by(User.id.asc()))).scalars().all()
        user_map = {item.id: item.full_name or item.email for item in users}
        posts = (
            await session.execute(
                select(CommunityPost, User).join(User, User.id == CommunityPost.user_id).order_by(CommunityPost.created_at.desc()).limit(50)
            )
        ).all()
        reports = (await session.execute(select(CommunityReport).order_by(CommunityReport.updated_at.desc()).limit(50))).scalars().all()
        post_title_map = {post.id: post.title for post, _user in posts}
        groups = (
            await session.execute(
                select(GroupRoom.id, GroupRoom.name, func.count(GroupRoomMember.id))
                .join(GroupRoomMember, GroupRoomMember.room_id == GroupRoom.id)
                .group_by(GroupRoom.id)
                .order_by(GroupRoom.created_at.desc())
                .limit(20)
            )
        ).all()

        leaderboard = []
        for user in users:
            completed_lessons = (
                await session.execute(select(func.count(LessonProgress.id)).where(LessonProgress.user_id == user.id))
            ).scalar_one()
            exam_attempts = (await session.execute(select(func.count(ExamAttempt.id)).where(ExamAttempt.user_id == user.id))).scalar_one()
            tournament_attempts = (
                await session.execute(select(func.count(TournamentAttempt.id)).where(TournamentAttempt.user_id == user.id))
            ).scalar_one()
            leaderboard.append(
                {
                    "user_id": user.id,
                    "user_name": user.full_name or user.email,
                    "score": points_from_counts(
                        completed_lessons=completed_lessons,
                        exam_attempts=exam_attempts,
                        tournament_attempts=tournament_attempts,
                    ),
                }
            )

        return {
            "posts": [
                {
                    "id": post.id,
                    "user_id": post.user_id,
                    "user_name": user.full_name or user.email,
                    "title": post.title,
                    "language_code": post.language_code,
                    "is_active": post.is_active,
                    "created_at": iso(post.created_at),
                }
                for post, user in posts
            ],
            "reports": [
                {
                    "id": item.id,
                    "reporter_user_id": item.reporter_user_id,
                    "reporter_name": user_map.get(item.reporter_user_id),
                    "target_user_id": item.target_user_id,
                    "target_user_name": user_map.get(item.target_user_id),
                    "post_id": item.post_id,
                    "post_title": post_title_map.get(item.post_id),
                    "reason": item.reason,
                    "status": item.status,
                    "admin_note": item.admin_note,
                    "updated_at": iso(item.updated_at),
                }
                for item in reports
            ],
            "leaderboard": sorted(leaderboard, key=lambda item: item["score"], reverse=True)[:20],
            "groups": [{"id": group_id, "name": name, "member_count": member_count} for group_id, name, member_count in groups],
            "friend_link_count": (await session.execute(select(func.count(FriendLink.id)))).scalar_one(),
        }


@router.post("/community/posts/{post_id}/moderate")
async def moderate_community_post(post_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    action = payload.get("action", "warn")
    async with AsyncSessionLocal() as session:
        post = (await session.execute(select(CommunityPost).where(CommunityPost.id == post_id))).scalar_one_or_none()
        if post is None:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

        target_user = (await session.execute(select(User).where(User.id == post.user_id))).scalar_one_or_none()
        if action == "delete":
            post.is_active = False
        if action == "warn" and target_user is not None:
            session.add(
                Notification(
                    user_id=target_user.id,
                    title="Cảnh báo cộng đồng",
                    content=payload.get("message") or "Nội dung của bạn đã bị admin nhắc nhở.",
                    notification_type="community_warning",
                )
            )
        if action == "lock_user" and target_user is not None:
            target_user.is_locked = True

        await record_admin_action(
            session,
            admin_id=admin.id,
            action=f"community_post_{action}",
            target_type="community_post",
            target_id=str(post.id),
            detail={"user_id": post.user_id},
        )
        await session.commit()
        await notify_admin_clients(tab="community")
        if action == "delete":
            await broadcast_event("community:post:removed", {"language_code": post.language_code, "post_id": post.id})
        if target_user is not None:
            await send_user_event(target_user.id, "system:broadcast", {"title": "Cộng đồng", "content": "Nội dung của bạn đã được admin xử lý."})
        return {"ok": True, "message": "Đã xử lý nội dung cộng đồng"}


@router.post("/community/reports/{report_id}/resolve")
async def resolve_community_report(report_id: int, payload: dict, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        report = (await session.execute(select(CommunityReport).where(CommunityReport.id == report_id))).scalar_one_or_none()
        if report is None:
            raise HTTPException(status_code=404, detail="Báo cáo không tồn tại")
        report.status = payload.get("status", "resolved")
        report.admin_note = payload.get("admin_note")
        report.updated_at = utc_now()
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="community_report_resolve",
            target_type="community_report",
            target_id=str(report.id),
            detail={"status": report.status},
        )
        await session.commit()
        await notify_admin_clients(tab="community")
        return {"ok": True, "message": "Đã cập nhật báo cáo"}


@router.get("/workspace/system")
async def get_admin_system_workspace(_admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        await ensure_system_defaults(session)
        await session.commit()
        flags = (await session.execute(select(FeatureFlag).order_by(FeatureFlag.code.asc()))).scalars().all()
        settings = (await session.execute(select(SystemSetting).order_by(SystemSetting.category.asc(), SystemSetting.key.asc()))).scalars().all()
        audits = (await session.execute(select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(50))).scalars().all()
        return {
            "feature_flags": [
                {
                    "code": item.code,
                    "name": item.name,
                    "description": item.description,
                    "is_enabled": item.is_enabled,
                    "updated_at": iso(item.updated_at),
                }
                for item in flags
            ],
            "settings": [
                {
                    "key": item.key,
                    "category": item.category,
                    "value": item.value,
                    "updated_at": iso(item.updated_at),
                }
                for item in settings
            ],
            "audit_logs": [
                {
                    "id": item.id,
                    "admin_user_id": item.admin_user_id,
                    "action": item.action,
                    "target_type": item.target_type,
                    "target_id": item.target_id,
                    "detail": item.detail,
                    "created_at": iso(item.created_at),
                }
                for item in audits
            ],
        }


@router.patch("/system/flags/{code}")
async def update_feature_flag(code: str, payload: dict, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        await ensure_system_defaults(session)
        item = (await session.execute(select(FeatureFlag).where(FeatureFlag.code == code))).scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Cờ tính năng không tồn tại")
        item.is_enabled = bool(payload.get("is_enabled", item.is_enabled))
        item.updated_at = utc_now()
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="feature_flag_update",
            target_type="feature_flag",
            target_id=item.code,
            detail={"is_enabled": item.is_enabled},
        )
        await session.commit()
        await notify_admin_clients(tab="system")
        return {"ok": True, "message": "Đã cập nhật cờ tính năng"}


@router.put("/system/settings/{key}")
async def update_system_setting(key: str, payload: dict, admin: User = Depends(get_admin_user)):
    async with AsyncSessionLocal() as session:
        await ensure_system_defaults(session)
        item = (await session.execute(select(SystemSetting).where(SystemSetting.key == key))).scalar_one_or_none()
        if item is None:
            item = SystemSetting(key=key, category=payload.get("category", "general"), value=payload.get("value", {}))
            session.add(item)
        else:
            item.category = payload.get("category", item.category)
            item.value = payload.get("value", item.value)
            item.updated_at = utc_now()
        await record_admin_action(
            session,
            admin_id=admin.id,
            action="system_setting_update",
            target_type="system_setting",
            target_id=key,
            detail={"category": item.category},
        )
        await session.commit()
        await notify_admin_clients(tab="system")
        return {"ok": True, "message": "Đã cập nhật cài đặt hệ thống"}
