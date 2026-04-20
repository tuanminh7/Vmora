from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps.auth import get_current_user, get_optional_current_user
from app.db.session import AsyncSessionLocal
from app.models.course import Course, CourseSection, Lesson
from app.models.feature import (
    AdminGrant,
    CommunityComment,
    CommunityPost,
    CommunityReport,
    Exam,
    ExamAttempt,
    ExamQuestion,
    FriendLink,
    GroupRoom,
    GroupRoomMember,
    GroupRoomMessage,
    NotebookEntry,
    NotebookReminder,
    Notification,
    PetProfile,
    PetVoiceMessage,
    StudyStreak,
    SupportTicket,
    Tournament,
    TournamentAttempt,
    TournamentRegistration,
    UserSetting,
    UserVocabularyItem,
    utc_now,
)
from app.models.practice import PracticeAttempt
from app.models.progress import LessonProgress
from app.models.user import User
from app.schemas.feature import (
    CommunityCommentInput,
    CommunityCommentOut,
    CommunityPostInput,
    CommunityPostOut,
    CommunityReportInput,
    ExamOut,
    ExamQuestionOut,
    ExamSubmitInput,
    ExamSubmitOut,
    FriendLinkOut,
    GroupRoomInput,
    GroupRoomJoinInput,
    GroupRoomMessageInput,
    GroupRoomMessageOut,
    GroupRoomOut,
    LeaderboardItemOut,
    NotebookEntryInput,
    NotebookEntryOut,
    NotebookReminderInput,
    NotebookReminderOut,
    NotificationOut,
    PetProfileInput,
    PetProfileOut,
    PetVoiceInput,
    PetVoiceMessageOut,
    SimpleStatusOut,
    StudyStreakOut,
    SupportTicketInput,
    SupportTicketOut,
    TournamentLeaderboardItemOut,
    TournamentOut,
    TournamentQuestionOut,
    TournamentRegisterOut,
    TournamentSubmitInput,
    TournamentSubmitOut,
    UserStatsOut,
    UserSettingInput,
    UserSettingOut,
    VocabularyBankPracticeInput,
    VocabularyBankSelectionInput,
    UserVocabularyInput,
    UserVocabularyOut,
)
from app.services.features import (
    award_pet_experience,
    build_pet_reply,
    check_in_streak,
    create_notification,
    generate_group_room_code,
    get_or_create_pet,
    get_or_create_streak,
    hash_group_passcode,
    store_pet_exchange,
)
from app.services.realtime import broadcast_event, send_user_event

router = APIRouter(prefix="/v1", tags=["features"])


async def notify_admin_tab_refresh(tab: str) -> None:
    async with AsyncSessionLocal() as session:
        admin_ids = list((await session.execute(select(AdminGrant.user_id))).scalars().all())
    for admin_id in admin_ids:
        await send_user_event(admin_id, "admin:refresh", {"tab": tab})


async def notify_admin_community_refresh() -> None:
    await notify_admin_tab_refresh("community")


def normalize_answer(value: Any) -> str:
    return " ".join(str(value or "").strip().casefold().split())


def question_to_out(question: ExamQuestion, *, include_answer: bool = False) -> ExamQuestionOut:
    payload = dict(question.payload or {})
    if not include_answer:
        payload.pop("correct_answer", None)
        payload.pop("accepted_answers", None)

    return ExamQuestionOut(
        id=question.id,
        question_type=question.question_type,
        prompt=question.prompt,
        payload=payload,
        points=question.points,
        order_index=question.order_index,
    )


def exam_to_out(exam: Exam, questions: list[ExamQuestion] | None = None) -> ExamOut:
    return ExamOut(
        id=exam.id,
        language_code=exam.language_code,
        title=exam.title,
        description=exam.description,
        level_code=exam.level_code,
        certificate_code=exam.level_code,
        duration_minutes=exam.duration_minutes,
        passing_score=exam.passing_score,
        is_active=exam.is_active,
        questions=[question_to_out(question) for question in (questions or [])],
    )


def notebook_to_out(item: NotebookEntry) -> NotebookEntryOut:
    return NotebookEntryOut(
        id=item.id,
        title=item.title,
        content=item.content,
        tag=item.tag,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )


def reminder_to_out(item: NotebookReminder) -> NotebookReminderOut:
    return NotebookReminderOut(
        id=item.id,
        title=item.title,
        remind_at=item.remind_at.isoformat(),
        is_active=item.is_active,
        created_at=item.created_at.isoformat(),
    )


def streak_to_out(item: StudyStreak) -> StudyStreakOut:
    return StudyStreakOut(
        current_streak=item.current_streak,
        longest_streak=item.longest_streak,
        last_check_in_at=item.last_check_in_at.isoformat() if item.last_check_in_at else None,
        updated_at=item.updated_at.isoformat(),
    )


def vocabulary_item_to_out(item: UserVocabularyItem) -> UserVocabularyOut:
    return UserVocabularyOut(
        id=item.id,
        vocabulary_entry_id=item.vocabulary_entry_id,
        language_code=item.language_code,
        word=item.word,
        meaning=item.meaning,
        note=item.note,
        level_code=item.level_code,
        is_selected=item.is_selected,
        is_in_practice=item.is_in_practice,
        created_at=item.created_at.isoformat(),
    )


def notification_to_out(item: Notification) -> NotificationOut:
    return NotificationOut(
        id=item.id,
        title=item.title,
        content=item.content,
        notification_type=item.notification_type,
        is_read=item.is_read,
        created_at=item.created_at.isoformat(),
    )


def ticket_to_out(item: SupportTicket) -> SupportTicketOut:
    return SupportTicketOut(
        id=item.id,
        title=item.title,
        content=item.content,
        status=item.status,
        admin_reply=item.admin_reply,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )


def user_setting_to_out(item: UserSetting) -> UserSettingOut:
    return UserSettingOut(
        id=item.id,
        theme_mode=item.theme_mode,
        background_code=item.background_code,
        updated_at=item.updated_at.isoformat(),
    )


def pet_to_out(item: PetProfile) -> PetProfileOut:
    return PetProfileOut(
        id=item.id,
        name=item.name,
        pet_type=item.pet_type,
        level=item.level,
        experience=item.experience,
        mood=item.mood,
        color_theme=item.color_theme,
        voice_code=item.voice_code,
        updated_at=item.updated_at.isoformat(),
    )


def pet_voice_to_out(item: PetVoiceMessage) -> PetVoiceMessageOut:
    return PetVoiceMessageOut(
        id=item.id,
        role=item.role,
        content=item.content,
        created_at=item.created_at.isoformat(),
    )


async def get_or_create_user_setting(session, *, user_id: int) -> UserSetting:
    result = await session.execute(select(UserSetting).where(UserSetting.user_id == user_id))
    item = result.scalar_one_or_none()
    if item is not None:
        return item

    item = UserSetting(user_id=user_id)
    session.add(item)
    await session.flush()
    return item


def parse_reminder_datetime(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Thời gian nhắc nhở không hợp lệ") from exc

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def group_room_to_out(item: GroupRoom, *, current_user_id: int, member_count: int) -> GroupRoomOut:
    return GroupRoomOut(
        id=item.id,
        name=item.name,
        room_code=item.room_code,
        is_private=item.is_private,
        is_owner=item.owner_user_id == current_user_id,
        member_count=member_count,
        created_at=item.created_at.isoformat(),
    )


def group_message_to_out(item: GroupRoomMessage, *, user_name: str | None) -> GroupRoomMessageOut:
    return GroupRoomMessageOut(
        id=item.id,
        room_id=item.room_id,
        user_id=item.user_id,
        user_name=user_name,
        content=item.content,
        created_at=item.created_at.isoformat(),
    )


def tournament_question_to_out(question: dict[str, Any]) -> TournamentQuestionOut:
    return TournamentQuestionOut(
        id=int(question.get("id", 0)),
        prompt=str(question.get("prompt", "")),
        options=list(question.get("options") or []),
        order_index=int(question.get("order_index", 1)),
    )


def tournament_to_out(tournament: Tournament, *, is_registered: bool = False, include_questions: bool = False) -> TournamentOut:
    return TournamentOut(
        id=tournament.id,
        language_code=tournament.language_code,
        title=tournament.title,
        description=tournament.description,
        duration_minutes=tournament.duration_minutes,
        passing_score=tournament.passing_score,
        reward_title=tournament.reward_title,
        reward_description=tournament.reward_description,
        is_active=tournament.is_active,
        is_registered=is_registered,
        questions=[tournament_question_to_out(item) for item in (tournament.questions if include_questions else [])],
    )


def evaluate_tournament_question(question: dict[str, Any], answer: Any) -> bool:
    correct_answer = question.get("correct_answer")
    if isinstance(correct_answer, list):
        return normalize_answer(answer) in {normalize_answer(item) for item in correct_answer}
    if isinstance(correct_answer, dict):
        return answer == correct_answer.get("value") or answer == correct_answer.get("option_id")
    return normalize_answer(answer) == normalize_answer(correct_answer)


async def ensure_sample_tournament(session: Any, *, language_code: str) -> Tournament:
    result = await session.execute(
        select(Tournament)
        .where(Tournament.language_code == language_code, Tournament.is_active.is_(True))
        .order_by(Tournament.id.asc())
        .limit(1)
    )
    tournament = result.scalar_one_or_none()
    if tournament is not None:
        return tournament

    tournament = Tournament(
        language_code=language_code,
        title=f"Giải đấu {language_code.upper()} tuần này",
        description="Bài thi hỗn hợp để tranh bảng xếp hạng giải đấu.",
        duration_minutes=20,
        passing_score=60,
        reward_title="Huy hiệu Top giải đấu",
        reward_description="Top đầu nhận huy hiệu và điểm thưởng trong giải đấu.",
        questions=[
            {
                "id": 1,
                "prompt": "Chọn đáp án đúng.",
                "options": [
                    {"id": "a", "text": "Đáp án A"},
                    {"id": "b", "text": "Đáp án B"},
                    {"id": "c", "text": "Đáp án C"},
                ],
                "correct_answer": "a",
                "order_index": 1,
            },
            {
                "id": 2,
                "prompt": "Điền từ còn thiếu.",
                "options": [],
                "correct_answer": "sample",
                "order_index": 2,
            },
            {
                "id": 3,
                "prompt": "Chọn nghĩa gần đúng nhất.",
                "options": [
                    {"id": "1", "text": "Nghĩa 1"},
                    {"id": "2", "text": "Nghĩa 2"},
                    {"id": "3", "text": "Nghĩa 3"},
                ],
                "correct_answer": "2",
                "order_index": 3,
            },
        ],
        is_active=True,
    )
    session.add(tournament)
    await session.flush()
    return tournament


@router.get("/exams", response_model=list[ExamOut])
async def list_exams(
    language_code: str = Query(..., min_length=2, max_length=10),
    certificate_code: str | None = Query(default=None, max_length=40),
):
    async with AsyncSessionLocal() as session:
        query = select(Exam).where(Exam.language_code == language_code, Exam.is_active.is_(True))
        if certificate_code:
            query = query.where(Exam.level_code == certificate_code)
        result = await session.execute(query.order_by(Exam.level_code.asc().nulls_last(), Exam.id.asc()))
        return [exam_to_out(exam) for exam in result.scalars().all()]


@router.get("/exams/{exam_id}", response_model=ExamOut)
async def get_exam(exam_id: int):
    async with AsyncSessionLocal() as session:
        exam_result = await session.execute(select(Exam).where(Exam.id == exam_id, Exam.is_active.is_(True)))
        exam = exam_result.scalar_one_or_none()
        if exam is None:
            raise HTTPException(status_code=404, detail="Đề thi không tồn tại")

        question_result = await session.execute(
            select(ExamQuestion).where(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_index.asc())
        )
        return exam_to_out(exam, question_result.scalars().all())


@router.post("/exams/{exam_id}/submit", response_model=ExamSubmitOut)
async def submit_exam(
    exam_id: int,
    payload: ExamSubmitInput,
    current_user: User | None = Depends(get_optional_current_user),
):
    async with AsyncSessionLocal() as session:
        exam_result = await session.execute(select(Exam).where(Exam.id == exam_id, Exam.is_active.is_(True)))
        exam = exam_result.scalar_one_or_none()
        if exam is None:
            raise HTTPException(status_code=404, detail="Đề thi không tồn tại")

        question_result = await session.execute(
            select(ExamQuestion).where(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_index.asc())
        )
        questions = question_result.scalars().all()
        if not questions:
            raise HTTPException(status_code=400, detail="Đề thi chưa có câu hỏi")

        correct_count = 0
        for question in questions:
            answer = payload.answers.get(str(question.id))
            correct_answer = question.correct_answer
            is_correct = False
            if isinstance(correct_answer, list):
                is_correct = normalize_answer(answer) in {normalize_answer(item) for item in correct_answer}
            elif isinstance(correct_answer, dict):
                is_correct = answer == correct_answer.get("value") or answer == correct_answer.get("option_id")
            else:
                is_correct = normalize_answer(answer) == normalize_answer(correct_answer)
            correct_count += int(is_correct)

        score_percent = round((correct_count / len(questions)) * 100)
        passed = score_percent >= exam.passing_score
        attempt = ExamAttempt(
            exam_id=exam.id,
            user_id=current_user.id if current_user else None,
            answers=payload.answers,
            score_percent=score_percent,
            correct_count=correct_count,
            total_questions=len(questions),
            passed=passed,
        )
        session.add(attempt)

        if current_user is not None:
            await award_pet_experience(session, user_id=current_user.id, points=30 if passed else 12)
            await create_notification(
                session,
                user_id=current_user.id,
                title="Đã nộp bài thi",
                content=f"Bạn đạt {score_percent}% trong đề {exam.title}.",
                notification_type="exam",
            )

        await session.commit()
        await session.refresh(attempt)
        if current_user is not None:
            await send_user_event(current_user.id, "exam:submitted", {"exam_id": exam.id, "attempt_id": attempt.id})
            await broadcast_event("leaderboard:update", {"language_code": exam.language_code})
        return ExamSubmitOut(
            attempt_id=attempt.id,
            exam_id=exam.id,
            correct_count=correct_count,
            total_questions=len(questions),
            score_percent=score_percent,
            passed=passed,
            feedback="Đạt yêu cầu." if passed else "Chưa đạt, bạn nên ôn lại rồi thử tiếp.",
        )


@router.get("/me/exam-attempts", response_model=list[ExamSubmitOut])
async def get_my_exam_attempts(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ExamAttempt).where(ExamAttempt.user_id == current_user.id).order_by(ExamAttempt.created_at.desc())
        )
        attempts = result.scalars().all()
        return [
            ExamSubmitOut(
                attempt_id=item.id,
                exam_id=item.exam_id,
                correct_count=item.correct_count,
                total_questions=item.total_questions,
                score_percent=item.score_percent,
                passed=item.passed,
                feedback="Đạt yêu cầu." if item.passed else "Chưa đạt.",
            )
            for item in attempts
        ]


@router.get("/tournaments", response_model=list[TournamentOut])
async def list_tournaments(
    language_code: str = Query(..., min_length=2, max_length=10),
    current_user: User | None = Depends(get_optional_current_user),
):
    async with AsyncSessionLocal() as session:
        await ensure_sample_tournament(session, language_code=language_code)
        result = await session.execute(
            select(Tournament)
            .where(Tournament.language_code == language_code, Tournament.is_active.is_(True))
            .order_by(Tournament.created_at.desc())
        )
        tournaments = result.scalars().all()
        registered_ids: set[int] = set()
        if current_user is not None and tournaments:
            registration_result = await session.execute(
                select(TournamentRegistration.tournament_id).where(
                    TournamentRegistration.user_id == current_user.id,
                    TournamentRegistration.tournament_id.in_([item.id for item in tournaments]),
                )
            )
            registered_ids = set(registration_result.scalars().all())
        await session.commit()
        return [tournament_to_out(item, is_registered=item.id in registered_ids) for item in tournaments]


@router.get("/tournaments/{tournament_id}", response_model=TournamentOut)
async def get_tournament_detail(tournament_id: int, current_user: User | None = Depends(get_optional_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Tournament).where(Tournament.id == tournament_id, Tournament.is_active.is_(True)))
        tournament = result.scalar_one_or_none()
        if tournament is None:
            raise HTTPException(status_code=404, detail="Giải đấu không tồn tại")

        is_registered = False
        if current_user is not None:
            registration_result = await session.execute(
                select(TournamentRegistration.id).where(
                    TournamentRegistration.tournament_id == tournament.id,
                    TournamentRegistration.user_id == current_user.id,
                )
            )
            is_registered = registration_result.scalar_one_or_none() is not None
        return tournament_to_out(tournament, is_registered=is_registered, include_questions=is_registered)


@router.post("/tournaments/{tournament_id}/register", response_model=TournamentRegisterOut)
async def register_tournament(tournament_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Tournament).where(Tournament.id == tournament_id, Tournament.is_active.is_(True)))
        tournament = result.scalar_one_or_none()
        if tournament is None:
            raise HTTPException(status_code=404, detail="Giải đấu không tồn tại")

        existing_result = await session.execute(
            select(TournamentRegistration).where(
                TournamentRegistration.tournament_id == tournament.id,
                TournamentRegistration.user_id == current_user.id,
            )
        )
        if existing_result.scalar_one_or_none() is None:
            session.add(TournamentRegistration(tournament_id=tournament.id, user_id=current_user.id))
            await create_notification(
                session,
                user_id=current_user.id,
                title="Đã đăng ký giải đấu",
                content=f"Bạn đã đăng ký {tournament.title}.",
                notification_type="tournament",
            )
        await session.commit()
        await send_user_event(current_user.id, "tournament:registered", {"tournament_id": tournament.id})
        return TournamentRegisterOut(tournament_id=tournament.id, registered=True, message="Đã đăng ký giải đấu")


@router.post("/tournaments/{tournament_id}/submit", response_model=TournamentSubmitOut)
async def submit_tournament(
    tournament_id: int,
    payload: TournamentSubmitInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Tournament).where(Tournament.id == tournament_id, Tournament.is_active.is_(True)))
        tournament = result.scalar_one_or_none()
        if tournament is None:
            raise HTTPException(status_code=404, detail="Giải đấu không tồn tại")

        registration_result = await session.execute(
            select(TournamentRegistration.id).where(
                TournamentRegistration.tournament_id == tournament.id,
                TournamentRegistration.user_id == current_user.id,
            )
        )
        if registration_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Bạn cần đăng ký giải đấu trước")

        questions = tournament.questions or []
        if not questions:
            raise HTTPException(status_code=400, detail="Giải đấu chưa có bài thi hỗn hợp")

        correct_count = 0
        for question in questions:
            answer = payload.answers.get(str(question.get("id")))
            correct_count += int(evaluate_tournament_question(question, answer))

        total_questions = len(questions)
        score_percent = round((correct_count / total_questions) * 100)
        passed = score_percent >= tournament.passing_score
        attempt = TournamentAttempt(
            tournament_id=tournament.id,
            user_id=current_user.id,
            answers=payload.answers,
            score_percent=score_percent,
            correct_count=correct_count,
            total_questions=total_questions,
            passed=passed,
        )
        session.add(attempt)
        await award_pet_experience(session, user_id=current_user.id, points=25 if passed else 8)
        await create_notification(
            session,
            user_id=current_user.id,
            title="Đã nộp bài giải đấu",
            content=f"{tournament.title}: {score_percent}%.",
            notification_type="tournament",
        )
        await session.commit()
        await session.refresh(attempt)
        await send_user_event(
            current_user.id,
            "tournament:submitted",
            {"tournament_id": tournament.id, "attempt_id": attempt.id},
        )
        await broadcast_event("leaderboard:update", {"language_code": tournament.language_code})
        await broadcast_event("tournament:leaderboard:update", {"tournament_id": tournament.id})
        return TournamentSubmitOut(
            attempt_id=attempt.id,
            tournament_id=tournament.id,
            correct_count=correct_count,
            total_questions=total_questions,
            score_percent=score_percent,
            passed=passed,
            reward_title=tournament.reward_title if passed else None,
            feedback="Đạt giải thưởng." if passed else "Chưa đạt giải, hãy thử lại.",
        )


@router.get("/tournaments/{tournament_id}/leaderboard", response_model=list[TournamentLeaderboardItemOut])
async def get_tournament_leaderboard(tournament_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TournamentAttempt, User, Tournament)
            .join(User, User.id == TournamentAttempt.user_id)
            .join(Tournament, Tournament.id == TournamentAttempt.tournament_id)
            .where(TournamentAttempt.tournament_id == tournament_id)
            .order_by(TournamentAttempt.score_percent.desc(), TournamentAttempt.created_at.asc())
            .limit(20)
        )
        return [
            TournamentLeaderboardItemOut(
                user_id=user.id,
                user_name=user.full_name or user.email,
                score_percent=attempt.score_percent,
                correct_count=attempt.correct_count,
                total_questions=attempt.total_questions,
                reward_title=tournament.reward_title if attempt.passed else None,
            )
            for attempt, user, tournament in result.all()
        ]


@router.get("/me/notebook", response_model=list[NotebookEntryOut])
async def list_notebook(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(NotebookEntry)
            .where(NotebookEntry.user_id == current_user.id)
            .order_by(NotebookEntry.updated_at.desc())
        )
        return [notebook_to_out(item) for item in result.scalars().all()]


@router.post("/me/notebook", response_model=NotebookEntryOut, status_code=status.HTTP_201_CREATED)
async def create_notebook_entry(payload: NotebookEntryInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        item = NotebookEntry(user_id=current_user.id, title=payload.title, content=payload.content, tag=payload.tag)
        session.add(item)
        await check_in_streak(session, user_id=current_user.id)
        await session.commit()
        await session.refresh(item)
        item_out = notebook_to_out(item)
        await send_user_event(current_user.id, "notebook:update", {"entry": item_out.model_dump()})
        return item_out


@router.patch("/me/notebook/{entry_id}", response_model=NotebookEntryOut)
async def update_notebook_entry(entry_id: int, payload: NotebookEntryInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(NotebookEntry).where(NotebookEntry.id == entry_id, NotebookEntry.user_id == current_user.id)
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ghi chú không tồn tại")
        item.title = payload.title
        item.content = payload.content
        item.tag = payload.tag
        item.updated_at = utc_now()
        await session.commit()
        await session.refresh(item)
        item_out = notebook_to_out(item)
        await send_user_event(current_user.id, "notebook:update", {"entry": item_out.model_dump()})
        return item_out


@router.delete("/me/notebook/{entry_id}", response_model=SimpleStatusOut)
async def delete_notebook_entry(entry_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(NotebookEntry).where(NotebookEntry.id == entry_id, NotebookEntry.user_id == current_user.id)
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Ghi chú không tồn tại")
        await session.delete(item)
        await session.commit()
        await send_user_event(current_user.id, "notebook:delete", {"entry_id": entry_id})
        return SimpleStatusOut(ok=True, message="Đã xóa ghi chú")


@router.get("/me/notebook/reminders", response_model=list[NotebookReminderOut])
async def list_notebook_reminders(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(NotebookReminder)
            .where(NotebookReminder.user_id == current_user.id)
            .order_by(NotebookReminder.remind_at.asc())
        )
        return [reminder_to_out(item) for item in result.scalars().all()]


@router.post("/me/notebook/reminders", response_model=NotebookReminderOut, status_code=status.HTTP_201_CREATED)
async def create_notebook_reminder(payload: NotebookReminderInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        item = NotebookReminder(
            user_id=current_user.id,
            title=payload.title,
            remind_at=parse_reminder_datetime(payload.remind_at),
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)
        item_out = reminder_to_out(item)
        await send_user_event(current_user.id, "notebook:reminder:update", {"reminder": item_out.model_dump()})
        return item_out


@router.post("/me/notebook/reminders/{reminder_id}/complete", response_model=NotebookReminderOut)
async def complete_notebook_reminder(reminder_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(NotebookReminder).where(
                NotebookReminder.id == reminder_id,
                NotebookReminder.user_id == current_user.id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Nhắc nhở không tồn tại")
        item.is_active = False
        await session.commit()
        await session.refresh(item)
        item_out = reminder_to_out(item)
        await send_user_event(current_user.id, "notebook:reminder:update", {"reminder": item_out.model_dump()})
        return item_out


@router.get("/me/streak", response_model=StudyStreakOut)
async def get_my_streak(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        streak = await get_or_create_streak(session, user_id=current_user.id)
        await session.commit()
        await session.refresh(streak)
        return streak_to_out(streak)


@router.post("/me/streak/check-in", response_model=StudyStreakOut)
async def check_in_my_streak(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        streak = await check_in_streak(session, user_id=current_user.id)
        await session.commit()
        await session.refresh(streak)
        streak_out = streak_to_out(streak)
        await send_user_event(current_user.id, "streak:update", {"streak": streak_out.model_dump()})
        return streak_out


@router.get("/me/vocabulary-bank", response_model=list[UserVocabularyOut])
async def list_vocabulary_bank(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserVocabularyItem)
            .where(UserVocabularyItem.user_id == current_user.id)
            .order_by(UserVocabularyItem.created_at.desc())
        )
        return [vocabulary_item_to_out(item) for item in result.scalars().all()]


@router.post("/me/vocabulary-bank", response_model=UserVocabularyOut, status_code=status.HTTP_201_CREATED)
async def create_vocabulary_bank_item(payload: UserVocabularyInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        item = UserVocabularyItem(user_id=current_user.id, **payload.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        item_out = vocabulary_item_to_out(item)
        await send_user_event(current_user.id, "vocabulary-bank:update", {"item": item_out.model_dump()})
        return item_out


@router.get("/me/vocabulary-bank/practice-feed", response_model=list[UserVocabularyOut])
async def list_vocabulary_practice_feed(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserVocabularyItem)
            .where(
                UserVocabularyItem.user_id == current_user.id,
                UserVocabularyItem.is_in_practice.is_(True),
            )
            .order_by(UserVocabularyItem.created_at.desc())
        )
        return [vocabulary_item_to_out(item) for item in result.scalars().all()]


@router.patch("/me/vocabulary-bank/{item_id}/select", response_model=UserVocabularyOut)
async def update_vocabulary_bank_selection(
    item_id: int,
    payload: VocabularyBankSelectionInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserVocabularyItem).where(
                UserVocabularyItem.id == item_id,
                UserVocabularyItem.user_id == current_user.id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Kho từ vựng không tồn tại")
        item.is_selected = payload.is_selected
        await session.commit()
        await session.refresh(item)
        item_out = vocabulary_item_to_out(item)
        await send_user_event(current_user.id, "vocabulary-bank:update", {"item": item_out.model_dump()})
        return item_out


@router.patch("/me/vocabulary-bank/{item_id}/practice", response_model=UserVocabularyOut)
async def update_vocabulary_bank_practice(
    item_id: int,
    payload: VocabularyBankPracticeInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserVocabularyItem).where(
                UserVocabularyItem.id == item_id,
                UserVocabularyItem.user_id == current_user.id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Kho từ vựng không tồn tại")
        item.is_in_practice = payload.is_in_practice
        if payload.is_in_practice:
            item.is_selected = True
        await session.commit()
        await session.refresh(item)
        item_out = vocabulary_item_to_out(item)
        await send_user_event(current_user.id, "vocabulary-bank:update", {"item": item_out.model_dump()})
        return item_out


@router.delete("/me/vocabulary-bank/{item_id}", response_model=SimpleStatusOut)
async def delete_vocabulary_bank_item(item_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserVocabularyItem).where(
                UserVocabularyItem.id == item_id,
                UserVocabularyItem.user_id == current_user.id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Từ đã lưu không tồn tại")
        await session.delete(item)
        await session.commit()
        await send_user_event(current_user.id, "vocabulary-bank:delete", {"item_id": item_id})
        return SimpleStatusOut(ok=True, message="Đã xóa từ đã lưu")


@router.get("/me/notifications", response_model=list[NotificationOut])
async def list_notifications(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Notification)
            .where((Notification.user_id == current_user.id) | (Notification.user_id.is_(None)))
            .order_by(Notification.created_at.desc())
        )
        return [notification_to_out(item) for item in result.scalars().all()]


@router.post("/me/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise HTTPException(status_code=404, detail="Thông báo không tồn tại")
        item.is_read = True
        await session.commit()
        await session.refresh(item)
        await send_user_event(current_user.id, "notification:read", {"notification_id": item.id})
        return notification_to_out(item)


@router.get("/me/tickets", response_model=list[SupportTicketOut])
async def list_my_tickets(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SupportTicket).where(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc())
        )
        return [ticket_to_out(item) for item in result.scalars().all()]


@router.post("/me/tickets", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(payload: SupportTicketInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        item = SupportTicket(user_id=current_user.id, title=payload.title, content=payload.content)
        session.add(item)
        await session.commit()
        await session.refresh(item)
        item_out = ticket_to_out(item)
        await send_user_event(current_user.id, "ticket:update", {"ticket": item_out.model_dump()})
        await notify_admin_tab_refresh("tickets")
        return item_out


@router.get("/me/settings", response_model=UserSettingOut)
async def get_my_settings(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        item = await get_or_create_user_setting(session, user_id=current_user.id)
        await session.commit()
        await session.refresh(item)
        return user_setting_to_out(item)


@router.patch("/me/settings", response_model=UserSettingOut)
async def update_my_settings(payload: UserSettingInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        item = await get_or_create_user_setting(session, user_id=current_user.id)
        item.theme_mode = payload.theme_mode
        item.background_code = payload.background_code
        item.updated_at = utc_now()
        await session.commit()
        await session.refresh(item)
        item_out = user_setting_to_out(item)
        await send_user_event(current_user.id, "settings:update", {"settings": item_out.model_dump()})
        return item_out


@router.get("/me/pet", response_model=PetProfileOut)
async def get_pet(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        pet = await get_or_create_pet(session, user_id=current_user.id)
        await session.commit()
        await session.refresh(pet)
        return pet_to_out(pet)


@router.patch("/me/pet", response_model=PetProfileOut)
async def update_pet(payload: PetProfileInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        pet = await get_or_create_pet(session, user_id=current_user.id)
        if payload.name:
            pet.name = payload.name
        if payload.pet_type:
            pet.pet_type = payload.pet_type
        if payload.color_theme:
            pet.color_theme = payload.color_theme
        if payload.voice_code:
            pet.voice_code = payload.voice_code
        pet.updated_at = utc_now()
        await session.commit()
        await session.refresh(pet)
        pet_out = pet_to_out(pet)
        await send_user_event(current_user.id, "pet:update", {"pet": pet_out.model_dump()})
        return pet_out


@router.get("/me/pet/voice", response_model=list[PetVoiceMessageOut])
async def list_pet_voice_messages(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(PetVoiceMessage)
            .where(PetVoiceMessage.user_id == current_user.id)
            .order_by(PetVoiceMessage.created_at.asc())
            .limit(20)
        )
        return [pet_voice_to_out(item) for item in result.scalars().all()]


@router.post("/me/pet/voice", response_model=list[PetVoiceMessageOut], status_code=status.HTTP_201_CREATED)
async def send_pet_voice_message(payload: PetVoiceInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        pet = await get_or_create_pet(session, user_id=current_user.id)
        reply = build_pet_reply(pet, payload.message)
        messages = await store_pet_exchange(session, user_id=current_user.id, message=payload.message, reply=reply)
        await award_pet_experience(session, user_id=current_user.id, points=5)
        await session.commit()
        message_out = [pet_voice_to_out(item) for item in messages]
        await send_user_event(
            current_user.id,
            "pet:voice",
            {"messages": [item.model_dump() for item in message_out]},
        )
        await send_user_event(current_user.id, "pet:update", {})
        return message_out


@router.get("/me/stats", response_model=UserStatsOut)
async def get_my_stats(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        completed_lessons = (
            await session.execute(select(func.count(LessonProgress.id)).where(LessonProgress.user_id == current_user.id))
        ).scalar_one()
        practice_attempts = (
            await session.execute(select(func.count(PracticeAttempt.id)).where(PracticeAttempt.user_id == current_user.id))
        ).scalar_one()
        best_practice_score = (
            await session.execute(select(func.coalesce(func.max(PracticeAttempt.score_percent), 0)).where(PracticeAttempt.user_id == current_user.id))
        ).scalar_one()
        exam_attempts = (
            await session.execute(select(func.count(ExamAttempt.id)).where(ExamAttempt.user_id == current_user.id))
        ).scalar_one()
        best_exam_score = (
            await session.execute(select(func.coalesce(func.max(ExamAttempt.score_percent), 0)).where(ExamAttempt.user_id == current_user.id))
        ).scalar_one()
        tournament_attempts = (
            await session.execute(select(func.count(TournamentAttempt.id)).where(TournamentAttempt.user_id == current_user.id))
        ).scalar_one()

        estimated_points = completed_lessons + exam_attempts * 10 + tournament_attempts * 10
        return UserStatsOut(
            completed_lessons=completed_lessons,
            practice_attempts=practice_attempts,
            best_practice_score=best_practice_score,
            exam_attempts=exam_attempts,
            best_exam_score=best_exam_score,
            tournament_attempts=tournament_attempts,
            estimated_points=estimated_points,
        )


@router.get("/leaderboard", response_model=list[LeaderboardItemOut])
async def get_leaderboard(language_code: str | None = Query(default=None, max_length=10)):
    async with AsyncSessionLocal() as session:
        users_result = await session.execute(select(User).order_by(User.id.asc()))
        users = users_result.scalars().all()
        items: list[LeaderboardItemOut] = []

        for user in users:
            lesson_query = select(func.count(LessonProgress.id)).where(LessonProgress.user_id == user.id)
            if language_code:
                lesson_query = lesson_query.join(Lesson, Lesson.id == LessonProgress.lesson_id).join(
                    CourseSection,
                    CourseSection.id == Lesson.section_id,
                ).join(Course, Course.id == CourseSection.course_id).where(Course.language_code == language_code)
            completed_lessons = (await session.execute(lesson_query)).scalar_one()
            practice_attempts = (
                await session.execute(select(func.count(PracticeAttempt.id)).where(PracticeAttempt.user_id == user.id))
            ).scalar_one()
            exam_attempts = (
                await session.execute(select(func.count(ExamAttempt.id)).where(ExamAttempt.user_id == user.id))
            ).scalar_one()
            tournament_query = select(func.count(TournamentAttempt.id)).where(TournamentAttempt.user_id == user.id)
            if language_code:
                tournament_query = tournament_query.join(Tournament, Tournament.id == TournamentAttempt.tournament_id).where(
                    Tournament.language_code == language_code
                )
            tournament_attempts = (await session.execute(tournament_query)).scalar_one()
            score = completed_lessons + exam_attempts * 10 + tournament_attempts * 10
            items.append(
                LeaderboardItemOut(
                    user_id=user.id,
                    user_name=user.full_name or user.email,
                    language_code=language_code or user.learning_language_code,
                    completed_lessons=completed_lessons,
                    practice_attempts=practice_attempts,
                    exam_attempts=exam_attempts,
                    tournament_attempts=tournament_attempts,
                    score=score,
                )
            )

        return sorted(items, key=lambda item: item.score, reverse=True)[:20]


@router.get("/community/groups", response_model=list[GroupRoomOut])
async def list_group_rooms(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(GroupRoom, func.count(GroupRoomMember.id))
            .join(GroupRoomMember, GroupRoomMember.room_id == GroupRoom.id)
            .where(
                GroupRoom.id.in_(
                    select(GroupRoomMember.room_id).where(GroupRoomMember.user_id == current_user.id)
                )
            )
            .group_by(GroupRoom.id)
            .order_by(GroupRoom.created_at.desc())
        )
        return [
            group_room_to_out(room, current_user_id=current_user.id, member_count=member_count)
            for room, member_count in result.all()
        ]


@router.post("/community/groups", response_model=GroupRoomOut, status_code=status.HTTP_201_CREATED)
async def create_group_room(payload: GroupRoomInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        room = GroupRoom(
            owner_user_id=current_user.id,
            name=payload.name,
            room_code=await generate_group_room_code(session),
            passcode_hash=hash_group_passcode(payload.passcode),
            is_private=True,
        )
        session.add(room)
        await session.flush()
        session.add(GroupRoomMember(room_id=room.id, user_id=current_user.id))
        await session.commit()
        await session.refresh(room)
        return group_room_to_out(room, current_user_id=current_user.id, member_count=1)


@router.post("/community/groups/join", response_model=GroupRoomOut)
async def join_group_room(payload: GroupRoomJoinInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(GroupRoom).where(GroupRoom.room_code == payload.room_code.upper()))
        room = result.scalar_one_or_none()
        if room is None:
            raise HTTPException(status_code=404, detail="Nhóm không tồn tại")
        if room.passcode_hash != hash_group_passcode(payload.passcode):
            raise HTTPException(status_code=400, detail="Mật khẩu nhóm không đúng")

        member_result = await session.execute(
            select(GroupRoomMember).where(
                GroupRoomMember.room_id == room.id,
                GroupRoomMember.user_id == current_user.id,
            )
        )
        member = member_result.scalar_one_or_none()
        if member is None:
            session.add(GroupRoomMember(room_id=room.id, user_id=current_user.id))
            await session.flush()

        count_result = await session.execute(
            select(func.count(GroupRoomMember.id)).where(GroupRoomMember.room_id == room.id)
        )
        member_count = count_result.scalar_one()
        await session.commit()
        return group_room_to_out(room, current_user_id=current_user.id, member_count=member_count)


async def ensure_room_member(session: Any, *, room_id: int, user_id: int) -> GroupRoom:
    room_result = await session.execute(select(GroupRoom).where(GroupRoom.id == room_id))
    room = room_result.scalar_one_or_none()
    if room is None:
        raise HTTPException(status_code=404, detail="Nhóm không tồn tại")

    member_result = await session.execute(
        select(GroupRoomMember).where(
            GroupRoomMember.room_id == room_id,
            GroupRoomMember.user_id == user_id,
        )
    )
    if member_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Bạn chưa tham gia nhóm này")

    return room


@router.get("/community/groups/{room_id}/messages", response_model=list[GroupRoomMessageOut])
async def list_group_room_messages(room_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        await ensure_room_member(session, room_id=room_id, user_id=current_user.id)
        result = await session.execute(
            select(GroupRoomMessage, User)
            .join(User, User.id == GroupRoomMessage.user_id)
            .where(GroupRoomMessage.room_id == room_id)
            .order_by(GroupRoomMessage.created_at.asc())
            .limit(100)
        )
        return [
            group_message_to_out(message, user_name=user.full_name or user.email)
            for message, user in result.all()
        ]


@router.post("/community/groups/{room_id}/messages", response_model=GroupRoomMessageOut, status_code=status.HTTP_201_CREATED)
async def create_group_room_message(
    room_id: int,
    payload: GroupRoomMessageInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        await ensure_room_member(session, room_id=room_id, user_id=current_user.id)
        members_result = await session.execute(
            select(GroupRoomMember.user_id).where(GroupRoomMember.room_id == room_id)
        )
        member_ids = list(members_result.scalars().all())
        message = GroupRoomMessage(room_id=room_id, user_id=current_user.id, content=payload.content)
        session.add(message)
        await session.commit()
        await session.refresh(message)
        message_out = group_message_to_out(message, user_name=current_user.full_name or current_user.email)
        for member_id in member_ids:
            await send_user_event(
                member_id,
                "group:message",
                {
                    "room_id": room_id,
                    "message": message_out.model_dump(),
                },
            )
        return message_out


@router.get("/community/posts", response_model=list[CommunityPostOut])
async def list_community_posts(language_code: str | None = Query(default=None, max_length=10)):
    async with AsyncSessionLocal() as session:
        post_query = select(CommunityPost, User).join(User, User.id == CommunityPost.user_id).where(CommunityPost.is_active.is_(True))
        if language_code:
            post_query = post_query.where(CommunityPost.language_code == language_code)
        post_result = await session.execute(post_query.order_by(CommunityPost.created_at.desc()).limit(30))
        rows = post_result.all()
        post_ids = [post.id for post, _user in rows]

        comments_by_post: dict[int, list[CommunityCommentOut]] = defaultdict(list)
        if post_ids:
            comment_result = await session.execute(
                select(CommunityComment, User)
                .join(User, User.id == CommunityComment.user_id)
                .where(CommunityComment.post_id.in_(post_ids))
                .order_by(CommunityComment.created_at.asc())
            )
            for comment, user in comment_result.all():
                comments_by_post[comment.post_id].append(
                    CommunityCommentOut(
                        id=comment.id,
                        post_id=comment.post_id,
                        user_id=comment.user_id,
                        user_name=user.full_name or user.email,
                        content=comment.content,
                        created_at=comment.created_at.isoformat(),
                    )
                )

        return [
            CommunityPostOut(
                id=post.id,
                user_id=post.user_id,
                user_name=user.full_name or user.email,
                language_code=post.language_code,
                title=post.title,
                content=post.content,
                created_at=post.created_at.isoformat(),
                comments=comments_by_post.get(post.id, []),
            )
            for post, user in rows
        ]


@router.post("/community/posts", response_model=CommunityPostOut, status_code=status.HTTP_201_CREATED)
async def create_community_post(payload: CommunityPostInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        post = CommunityPost(user_id=current_user.id, **payload.model_dump())
        session.add(post)
        await session.commit()
        await session.refresh(post)
        post_out = CommunityPostOut(
            id=post.id,
            user_id=post.user_id,
            user_name=current_user.full_name or current_user.email,
            language_code=post.language_code,
            title=post.title,
            content=post.content,
            created_at=post.created_at.isoformat(),
            comments=[],
        )
        await broadcast_event("community:post:new", {"language_code": post.language_code, "post": post_out.model_dump()})
        return post_out


@router.post("/community/posts/{post_id}/comments", response_model=CommunityCommentOut, status_code=status.HTTP_201_CREATED)
async def create_community_comment(
    post_id: int,
    payload: CommunityCommentInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        post_result = await session.execute(select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.is_active.is_(True)))
        post = post_result.scalar_one_or_none()
        if post is None:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")
        comment = CommunityComment(post_id=post_id, user_id=current_user.id, content=payload.content)
        session.add(comment)
        await session.commit()
        await session.refresh(comment)
        comment_out = CommunityCommentOut(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            user_name=current_user.full_name or current_user.email,
            content=comment.content,
            created_at=comment.created_at.isoformat(),
        )
        await broadcast_event(
            "community:comment:new",
            {"language_code": post.language_code, "post_id": post.id, "comment": comment_out.model_dump()},
        )
        return comment_out


@router.post("/community/posts/{post_id}/report", response_model=SimpleStatusOut, status_code=status.HTTP_201_CREATED)
async def report_community_post(
    post_id: int,
    payload: CommunityReportInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        post = (
            await session.execute(
                select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.is_active.is_(True))
            )
        ).scalar_one_or_none()
        if post is None:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

        existing = (
            await session.execute(
                select(CommunityReport).where(
                    CommunityReport.reporter_user_id == current_user.id,
                    CommunityReport.post_id == post_id,
                    CommunityReport.status.in_(["open", "reviewing"]),
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=409, detail="Bạn đã báo cáo bài viết này rồi")

        report = CommunityReport(
            reporter_user_id=current_user.id,
            target_user_id=post.user_id,
            post_id=post.id,
            reason=payload.reason,
            status="open",
        )
        session.add(report)
        await session.commit()
        await notify_admin_community_refresh()
        return SimpleStatusOut(ok=True, message="Đã gửi báo cáo vi phạm")


@router.get("/community/friends", response_model=list[FriendLinkOut])
async def list_friends(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(FriendLink, User)
            .join(User, User.id == FriendLink.friend_user_id)
            .where(FriendLink.user_id == current_user.id)
            .order_by(FriendLink.created_at.desc())
        )
        return [
            FriendLinkOut(
                id=link.id,
                user_id=link.user_id,
                friend_user_id=link.friend_user_id,
                friend_name=user.full_name or user.email,
                status=link.status,
                created_at=link.created_at.isoformat(),
            )
            for link, user in result.all()
        ]


@router.post("/community/friends/{friend_user_id}", response_model=FriendLinkOut, status_code=status.HTTP_201_CREATED)
async def add_friend(friend_user_id: int, current_user: User = Depends(get_current_user)):
    if friend_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể kết bạn với chính mình")

    async with AsyncSessionLocal() as session:
        friend_result = await session.execute(select(User).where(User.id == friend_user_id))
        friend = friend_result.scalar_one_or_none()
        if friend is None:
            raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

        existing = await session.execute(
            select(FriendLink).where(
                FriendLink.user_id == current_user.id,
                FriendLink.friend_user_id == friend_user_id,
            )
        )
        link = existing.scalar_one_or_none()
        if link is None:
            link = FriendLink(user_id=current_user.id, friend_user_id=friend_user_id, status="accepted")
            session.add(link)
        await session.commit()
        await session.refresh(link)
        return FriendLinkOut(
            id=link.id,
            user_id=link.user_id,
            friend_user_id=link.friend_user_id,
            friend_name=friend.full_name or friend.email,
            status=link.status,
            created_at=link.created_at.isoformat(),
        )
