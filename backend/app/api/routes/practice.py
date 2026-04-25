from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps.auth import get_current_user
from app.db.session import AsyncSessionLocal
from app.models.practice import PracticeActivity, PracticeAttempt
from app.models.user import User
from app.schemas.practice import PracticeActivityOut, PracticeSubmitInput, PracticeSubmitOut
from app.services.features import award_pet_experience, create_notification
from app.services.practice_access import can_access_practice, get_practice_access, resolve_practice_skill
from app.services.progress import mark_lesson_completed
from app.services.realtime import broadcast_event, send_user_event

router = APIRouter(prefix="/v1", tags=["practice"])


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().casefold().split())


def _score_boolean(value: bool, success_message: str, failure_message: str) -> tuple[bool, int, str]:
    if value:
        return True, 100, success_message
    return False, 0, failure_message


def evaluate_activity(activity: PracticeActivity, answers: Any) -> tuple[bool | None, int, str, Any | None]:
    payload = activity.payload or {}
    activity_type = activity.activity_type

    if activity_type == "flashcard":
        revealed = False
        if isinstance(answers, dict):
            revealed = bool(answers.get("revealed"))
        return _score_boolean(
            revealed,
            "Da xem xong flashcard.",
            "Hay mo flashcard de xem nghia va tu.",
        ) + (None,)

    if activity_type in {"quiz", "image"}:
        selected = None
        if isinstance(answers, dict):
            selected = answers.get("option_id")
        correct_option = payload.get("correct_option_id")
        is_correct = selected == correct_option
        return (
            is_correct,
            100 if is_correct else 0,
            "Chinh xac." if is_correct else "Chua dung, thu lai mot dap an khac.",
            correct_option,
        )

    if activity_type == "matching":
        submitted_pairs: dict[str, str] = {}
        if isinstance(answers, dict):
            raw_pairs = answers.get("pairs")
            if isinstance(raw_pairs, dict):
                submitted_pairs = {str(key): str(value) for key, value in raw_pairs.items()}
            elif isinstance(raw_pairs, list):
                for item in raw_pairs:
                    if isinstance(item, dict) and item.get("left_id") and item.get("right_id"):
                        submitted_pairs[str(item["left_id"])] = str(item["right_id"])
        correct_pairs = {str(key): str(value) for key, value in (payload.get("correct_pairs") or {}).items()}
        total = len(correct_pairs)
        if total == 0:
            return None, 0, "Chua co du lieu ghep cap.", None
        matched = sum(1 for key, value in correct_pairs.items() if submitted_pairs.get(key) == value)
        score = round((matched / total) * 100)
        is_correct = matched == total
        return (
            is_correct,
            score,
            f"Ban ghep dung {matched}/{total} cap.",
            correct_pairs,
        )

    if activity_type in {"typing", "audio", "voice"}:
        answer_text = ""
        if isinstance(answers, dict):
            answer_text = _normalize_text(answers.get("text"))
        elif isinstance(answers, str):
            answer_text = _normalize_text(answers)
        accepted_answers = [_normalize_text(item) for item in payload.get("accepted_answers", []) if item]
        is_correct = answer_text in accepted_answers
        expected = payload.get("display_answer") or payload.get("accepted_answers")
        return (
            is_correct,
            100 if is_correct else 0,
            "Dung roi." if is_correct else "Chua dung, ban co the thu lai.",
            expected,
        )

    if activity_type == "video":
        completed = False
        if isinstance(answers, dict):
            completed = bool(answers.get("completed"))
        return _score_boolean(
            completed,
            "Da danh dau xem xong video.",
            "Hay xem video va bam hoan thanh.",
        ) + (None,)

    if activity_type == "mixed":
        submitted_items: dict[str, Any] = {}
        if isinstance(answers, dict):
            raw_items = answers.get("items")
            if isinstance(raw_items, dict):
                submitted_items = raw_items
            elif isinstance(raw_items, list):
                for item in raw_items:
                    if isinstance(item, dict) and item.get("id"):
                        submitted_items[str(item["id"])] = item.get("value")

        questions = payload.get("questions") or []
        if not questions:
            return None, 0, "Chua co cau hoi tong hop.", None

        correct_count = 0
        expected_answers: dict[str, Any] = {}
        for question in questions:
            question_id = str(question.get("id"))
            answer_value = submitted_items.get(question_id)
            expected_answers[question_id] = question.get("correct_option_id") or question.get("display_answer")

            if question.get("type") in {"quiz", "image"}:
                if answer_value == question.get("correct_option_id"):
                    correct_count += 1
                continue

            normalized_answer = _normalize_text(answer_value)
            accepted_answers = [_normalize_text(item) for item in question.get("accepted_answers", []) if item]
            if normalized_answer in accepted_answers:
                correct_count += 1

        total = len(questions)
        score = round((correct_count / total) * 100)
        return (
            correct_count == total,
            score,
            f"Ban dung {correct_count}/{total} cau trong bai tong hop.",
            expected_answers,
        )

    return None, 0, "Loai hoat dong nay chua duoc ho tro cham diem.", None


def to_activity_out(activity: PracticeActivity) -> PracticeActivityOut:
    payload = activity.payload or {}
    return PracticeActivityOut(
        id=activity.id,
        language_code=activity.language_code,
        lesson_id=activity.lesson_id,
        code=activity.code,
        topic=payload.get("topic"),
        practice_skill=resolve_practice_skill(activity),
        activity_type=activity.activity_type,
        title=activity.title,
        description=activity.description,
        prompt=activity.prompt,
        payload=payload,
        order_index=activity.order_index,
        is_free=activity.is_free,
    )


@router.get("/practice/activities", response_model=list[PracticeActivityOut])
async def get_practice_activities(
    language_code: str = Query(..., min_length=2, max_length=10),
    practice_skill: str | None = Query(default=None, min_length=2, max_length=40),
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        access = await get_practice_access(session, user_id=current_user.id, language_code=language_code)
        result = await session.execute(
            select(PracticeActivity)
            .where(
                PracticeActivity.language_code == language_code,
                PracticeActivity.is_active.is_(True),
            )
            .order_by(PracticeActivity.order_index.asc(), PracticeActivity.id.asc())
        )
        activities = result.scalars().all()
        allowed_activities = [activity for activity in activities if can_access_practice(activity, access)]
        if practice_skill:
            allowed_activities = [
                activity for activity in allowed_activities if resolve_practice_skill(activity) == practice_skill
            ]
        return [to_activity_out(activity) for activity in allowed_activities]


@router.get("/practice/activities/{activity_id}", response_model=PracticeActivityOut)
async def get_practice_activity_detail(
    activity_id: int,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PracticeActivity).where(PracticeActivity.id == activity_id))
        activity = result.scalar_one_or_none()
        if activity is None or not activity.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hoat dong khong ton tai")
        access = await get_practice_access(session, user_id=current_user.id, language_code=activity.language_code)
        if not can_access_practice(activity, access):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ban can mo goi hoc phu hop de on luyen")
        return to_activity_out(activity)


@router.post("/practice/activities/{activity_id}/submit", response_model=PracticeSubmitOut)
async def submit_practice_activity(
    activity_id: int,
    payload: PracticeSubmitInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PracticeActivity).where(PracticeActivity.id == activity_id))
        activity = result.scalar_one_or_none()
        if activity is None or not activity.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hoat dong khong ton tai")
        access = await get_practice_access(session, user_id=current_user.id, language_code=activity.language_code)
        if not can_access_practice(activity, access):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ban can mo goi hoc phu hop de on luyen")

        is_correct, score_percent, feedback, expected_answer = evaluate_activity(activity, payload.answers)

        attempt = PracticeAttempt(
            activity_id=activity.id,
            user_id=current_user.id,
            answers=payload.answers,
            score_percent=score_percent,
            is_correct=is_correct,
            feedback=feedback,
        )
        session.add(attempt)

        if current_user is not None:
            await award_pet_experience(session, user_id=current_user.id, points=15 if score_percent >= 60 else 6)
            await create_notification(
                session,
                user_id=current_user.id,
                title="Đã hoàn thành một bài luyện tập",
                content=f"{activity.title}: {feedback} ({score_percent}%).",
                notification_type="practice",
            )
            if activity.lesson_id is not None and score_percent >= 60:
                await mark_lesson_completed(session, user_id=current_user.id, lesson_id=activity.lesson_id)

        await session.commit()
        await session.refresh(attempt)
        await send_user_event(
            current_user.id,
            "practice:submitted",
            {"language_code": activity.language_code, "activity_id": activity.id, "attempt_id": attempt.id},
        )
        if activity.lesson_id is not None and score_percent >= 60:
            await send_user_event(
                current_user.id,
                "progress:update",
                {"language_code": activity.language_code, "lesson_id": activity.lesson_id},
            )
            await broadcast_event("leaderboard:update", {"language_code": activity.language_code})

        return PracticeSubmitOut(
            activity_id=activity.id,
            attempt_id=attempt.id,
            is_correct=is_correct,
            score_percent=score_percent,
            feedback=feedback,
            expected_answer=expected_answer,
        )
