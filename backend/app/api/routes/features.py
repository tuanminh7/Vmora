from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.deps.auth import get_current_user, get_optional_current_user
from app.db.session import AsyncSessionLocal
from app.models.course import Course, CourseSection, Lesson
from app.models.feature import (
    AdminGrant,
    CommunityComment,
    CommunityPost,
    CommunityPostReaction,
    CommunityPostShare,
    CommunityReport,
    DirectMessage,
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
    CommunityPostUpdateInput,
    CommunityReactionInput,
    CommunityReactionSummaryOut,
    CommunityReportInput,
    CommunityShareSummaryOut,
    CommunityUserOut,
    DirectMessageInput,
    DirectMessageOut,
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
    TournamentRoomStartOut,
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
    is_admin,
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


def build_public_user_id(user_id: int) -> str:
    return str(user_id).zfill(5)


def community_user_to_out(user: User) -> CommunityUserOut:
    return CommunityUserOut(
        id=user.id,
        public_user_id=build_public_user_id(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        learning_language_code=user.learning_language_code,
    )


def group_room_to_out(item: GroupRoom, *, owner: User, current_user_id: int, member_count: int) -> GroupRoomOut:
    return GroupRoomOut(
        id=item.id,
        name=item.name,
        room_code=item.room_code,
        owner_user_id=item.owner_user_id,
        owner_public_user_id=build_public_user_id(item.owner_user_id),
        owner_name=owner.full_name or owner.email,
        owner_avatar_url=owner.avatar_url,
        is_private=item.is_private,
        is_owner=item.owner_user_id == current_user_id,
        member_count=member_count,
        created_at=item.created_at.isoformat(),
    )


def group_message_to_out(item: GroupRoomMessage, *, user: User) -> GroupRoomMessageOut:
    return GroupRoomMessageOut(
        id=item.id,
        room_id=item.room_id,
        user_id=item.user_id,
        user_public_user_id=build_public_user_id(item.user_id),
        user_name=user.full_name or user.email,
        user_avatar_url=user.avatar_url,
        content=item.content,
        image_url=item.image_url,
        audio_url=item.audio_url,
        audio_name=item.audio_name,
        created_at=item.created_at.isoformat(),
    )


GLOBAL_CHAT_ROOM_CODE = "GLOBAL"
GLOBAL_CHAT_ROOM_NAME = "Chat tổng"
GLOBAL_CHAT_PASSCODE = "vmora-global-chat"


async def get_or_create_global_chat_room(session: Any, *, current_user: User) -> GroupRoom:
    result = await session.execute(select(GroupRoom).where(GroupRoom.room_code == GLOBAL_CHAT_ROOM_CODE))
    room = result.scalar_one_or_none()
    if room is not None:
        return room

    room = GroupRoom(
        owner_user_id=current_user.id,
        name=GLOBAL_CHAT_ROOM_NAME,
        room_code=GLOBAL_CHAT_ROOM_CODE,
        passcode_hash=hash_group_passcode(GLOBAL_CHAT_PASSCODE),
        is_private=False,
    )
    session.add(room)
    await session.flush()
    return room


def community_comment_to_out(item: CommunityComment, *, user: User) -> CommunityCommentOut:
    return CommunityCommentOut(
        id=item.id,
        post_id=item.post_id,
        user_id=item.user_id,
        user_public_user_id=build_public_user_id(item.user_id),
        user_name=user.full_name or user.email,
        user_avatar_url=user.avatar_url,
        content=item.content,
        created_at=item.created_at.isoformat(),
    )


def direct_message_to_out(item: DirectMessage, *, sender: User, recipient: User) -> DirectMessageOut:
    return DirectMessageOut(
        id=item.id,
        sender_user_id=item.sender_user_id,
        sender_public_user_id=build_public_user_id(item.sender_user_id),
        sender_name=sender.full_name or sender.email,
        sender_avatar_url=sender.avatar_url,
        recipient_user_id=item.recipient_user_id,
        recipient_public_user_id=build_public_user_id(item.recipient_user_id),
        recipient_name=recipient.full_name or recipient.email,
        recipient_avatar_url=recipient.avatar_url,
        content=item.content,
        created_at=item.created_at.isoformat(),
    )


def summarize_reactions(rows: list[tuple[int, str, int]]) -> dict[int, dict[str, int]]:
    summary: dict[int, dict[str, int]] = defaultdict(dict)
    for post_id, reaction_type, count in rows:
        summary[post_id][reaction_type] = count
    return summary


async def ensure_friend_link(session: Any, *, user_id: int, friend_user_id: int) -> User:
    friend_result = await session.execute(select(User).where(User.id == friend_user_id))
    friend = friend_result.scalar_one_or_none()
    if friend is None:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    link_result = await session.execute(
        select(FriendLink).where(
            FriendLink.user_id == user_id,
            FriendLink.friend_user_id == friend_user_id,
            FriendLink.status == "accepted",
        )
    )
    if link_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Bạn cần kết bạn trước khi nhắn tin")

    return friend


async def build_community_post_out(
    session: Any,
    *,
    post: CommunityPost,
    user: User,
    current_user_id: int | None = None,
) -> CommunityPostOut:
    comment_result = await session.execute(
        select(CommunityComment, User)
        .join(User, User.id == CommunityComment.user_id)
        .where(CommunityComment.post_id == post.id)
        .order_by(CommunityComment.created_at.asc())
    )
    comments = [community_comment_to_out(comment, user=comment_user) for comment, comment_user in comment_result.all()]

    reaction_result = await session.execute(
        select(CommunityPostReaction.reaction_type, func.count(CommunityPostReaction.id))
        .where(CommunityPostReaction.post_id == post.id)
        .group_by(CommunityPostReaction.reaction_type)
    )
    reactions = {reaction_type: count for reaction_type, count in reaction_result.all()}

    my_reaction = None
    if current_user_id:
        my_reaction_result = await session.execute(
            select(CommunityPostReaction.reaction_type).where(
                CommunityPostReaction.post_id == post.id,
                CommunityPostReaction.user_id == current_user_id,
            )
        )
        my_reaction = my_reaction_result.scalar_one_or_none()

    share_count_result = await session.execute(
        select(func.count(CommunityPostShare.id)).where(CommunityPostShare.post_id == post.id)
    )
    share_count = share_count_result.scalar_one()

    return CommunityPostOut(
        id=post.id,
        user_id=post.user_id,
        user_public_user_id=build_public_user_id(post.user_id),
        user_name=user.full_name or user.email,
        user_avatar_url=user.avatar_url,
        language_code=post.language_code,
        title=post.title,
        content=post.content,
        image_url=post.image_url,
        created_at=post.created_at.isoformat(),
        reactions=reactions,
        my_reaction=my_reaction,
        share_count=share_count,
        comments=comments,
    )


def tournament_question_to_out(question: dict[str, Any]) -> TournamentQuestionOut:
    return TournamentQuestionOut(
        id=int(question.get("id", 0)),
        prompt=str(question.get("prompt", "")),
        options=list(question.get("options") or []),
        order_index=int(question.get("order_index", 1)),
        section=question.get("section"),
        question_type=str(question.get("question_type", "single_choice")),
        audio_text=question.get("audio_text"),
        audio_replay_limit=question.get("audio_replay_limit"),
        passage_id=question.get("passage_id"),
        passage_title=question.get("passage_title"),
        passage_text=question.get("passage_text"),
    )


def current_tournament_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = now or utc_now()
    if current.tzinfo is None:
        current = current.replace(tzinfo=UTC)
    current = current.astimezone(UTC)
    start = current - timedelta(days=current.weekday())
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return start, end


def get_effective_tournament_room_status(tournament: Tournament, *, window_start: datetime) -> str:
    started_at = tournament.room_started_at
    if started_at is not None:
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=UTC)
        started_at = started_at.astimezone(UTC)
    if started_at is not None and started_at >= window_start and tournament.room_status == "in_progress":
        return "in_progress"
    return "waiting"


def tournament_to_out(
    tournament: Tournament,
    *,
    is_registered: bool = False,
    include_questions: bool = False,
    participant_count: int = 0,
) -> TournamentOut:
    starts_at, ends_at = current_tournament_window()
    questions = list(tournament.questions or [])
    room_status = get_effective_tournament_room_status(tournament, window_start=starts_at)
    room_started_at = tournament.room_started_at
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
        question_count=len(questions),
        participant_count=participant_count,
        room_status=room_status,
        starts_at=starts_at.isoformat(),
        ends_at=ends_at.isoformat(),
        waiting_room_opened_at=starts_at.isoformat(),
        room_started_at=room_started_at.isoformat() if room_started_at else None,
        questions=[tournament_question_to_out(item) for item in (questions if include_questions and room_status == "in_progress" else [])],
    )


def evaluate_tournament_question(question: dict[str, Any], answer: Any) -> bool:
    correct_answer = question.get("correct_answer")
    if isinstance(correct_answer, list):
        return normalize_answer(answer) in {normalize_answer(item) for item in correct_answer}
    if isinstance(correct_answer, dict):
        return answer == correct_answer.get("value") or answer == correct_answer.get("option_id")
    return normalize_answer(answer) == normalize_answer(correct_answer)


def build_tournament_question(
    question_id: int,
    *,
    prompt: str,
    options: list[str],
    correct_option: str,
    section: str,
    question_type: str = "single_choice",
    audio_text: str | None = None,
    audio_replay_limit: int | None = None,
    passage_id: str | None = None,
    passage_title: str | None = None,
    passage_text: str | None = None,
) -> dict[str, Any]:
    option_ids = ["a", "b", "c", "d"]
    return {
        "id": question_id,
        "prompt": prompt,
        "options": [{"id": option_ids[index], "text": text} for index, text in enumerate(options)],
        "correct_answer": correct_option,
        "order_index": question_id,
        "section": section,
        "question_type": question_type,
        "audio_text": audio_text,
        "audio_replay_limit": audio_replay_limit,
        "passage_id": passage_id,
        "passage_title": passage_title,
        "passage_text": passage_text,
    }


def build_human_rights_tournament_questions() -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []

    grammar_questions = [
        ("Choose the correct sentence: Everyone ___ equal before the law.", ["is", "are", "be", "been"], "a"),
        ("If a person is arrested, they ___ be informed of their rights immediately.", ["can", "must", "might", "would"], "b"),
        ("The report on prison conditions ___ by an independent team last year.", ["writes", "wrote", "was written", "is writing"], "c"),
        ("People should be allowed ___ their opinions peacefully.", ["express", "to express", "expressing", "expressed"], "b"),
        ("No one may be punished unless the law ___ the act clearly.", ["allow", "allowed", "allows", "allowing"], "c"),
        ("The committee asked whether the witnesses ___ safe during the hearing.", ["is", "was", "were", "be"], "c"),
        ("Equal access to education is a right ___ supports social progress.", ["who", "that", "where", "what"], "b"),
        ("A government that protects privacy ___ respect personal data.", ["should", "should have", "should had", "should having"], "a"),
        ("Citizens ___ vote freely in a fair election.", ["should be able to", "should be able", "should can", "should able to"], "a"),
        ("The village built a study center so that children ___ continue learning after work.", ["can", "could", "may", "shall"], "b"),
        ("The new policy is designed ___ discrimination in public services.", ["reduce", "reducing", "to reduce", "reduced"], "c"),
        ("Although the case was difficult, the judge listened ___ to every victim.", ["careful", "carefully", "more careful", "care"], "b"),
        ("The students discussed how rights ___ in everyday life.", ["protect", "protected", "are protected", "are protecting"], "c"),
        ("A person who reports abuse should not ___ punished for telling the truth.", ["be", "being", "been", "is"], "a"),
        ("The organization has worked on children's rights ___ 2010.", ["for", "since", "from", "during"], "b"),
    ]
    for prompt, options, correct in grammar_questions:
        questions.append(
            build_tournament_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="grammar",
            )
        )

    vocabulary_questions = [
        ("What does 'dignity' mean in the phrase 'human dignity must be protected'?", ["personal worth", "public holiday", "legal office", "school subject"], "a"),
        ("Choose the best meaning of 'equality'.", ["special treatment for one group", "the state of being treated fairly and the same", "a private agreement", "a type of punishment"], "b"),
        ("What is the closest meaning of 'freedom of speech'?", ["the right to travel abroad", "the right to choose a job", "the right to express opinions", "the right to own land"], "c"),
        ("In human-rights contexts, 'justice' is closest to ___.", ["fair treatment under the law", "a fast internet connection", "a public parade", "a school uniform"], "a"),
        ("What does 'privacy' mean?", ["the right to keep personal life and data from unwanted access", "the right to vote twice", "the right to skip school", "the right to own a factory"], "a"),
        ("Choose the meaning of 'discrimination'.", ["equal access to services", "unfair treatment based on identity", "a public debate", "a peace agreement"], "b"),
        ("In law and rights education, 'consent' means ___.", ["official punishment", "voluntary agreement", "financial support", "secret evidence"], "b"),
        ("A 'refugee' is someone who ___.", ["moves for tourism", "flees danger and seeks safety", "works for the court", "teaches language at school"], "b"),
        ("What is a 'minority' group?", ["the largest group in a country", "a group with less political power and fewer members", "all children under 18", "only public workers"], "b"),
        ("Choose the best meaning of 'fair trial'.", ["a quick trial with no lawyer", "a trial held in secret", "a legal process that respects evidence and defense rights", "a trial only for rich people"], "c"),
        ("What does 'peaceful assembly' refer to?", ["meeting violently to damage property", "gathering together without violence", "studying alone at home", "voting by phone"], "b"),
        ("What is the closest meaning of 'protection' in 'child protection policy'?", ["care and safety from harm", "public celebration", "exam competition", "migration document"], "a"),
        ("Choose the best meaning of 'responsibility'.", ["a duty to act properly", "a private reward", "a type of tax", "a legal excuse"], "a"),
        ("In education rights, 'access' means ___.", ["the ability to enter or use something", "the decision to ban something", "a special police order", "a written confession"], "a"),
        ("What does 'advocate' mean as a verb in 'students advocate for equal rights'?", ["to hide", "to support publicly", "to ignore", "to punish"], "b"),
    ]
    for prompt, options, correct in vocabulary_questions:
        questions.append(
            build_tournament_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="vocabulary",
            )
        )

    listening_audio_text = (
        "At Sunrise Community Center, volunteers are teaching teenagers about human rights. In today's workshop, they focus on respect, "
        "equal access, and safe reporting. The speaker says every student deserves a classroom free from bullying and discrimination. "
        "If a learner feels unsafe, they should report the problem early to a teacher or counselor instead of staying silent. "
        "The workshop also reminds students that privacy matters online, so people should understand how their data is used before clicking agree. "
        "At the end, the speaker says communities become stronger when girls and boys receive the same education, the same respect, and the same chance to lead."
    )
    listening_questions = [
        (
            "According to the audio, what should a student do if they feel unsafe?",
            ["Stay silent and wait", "Report the problem early to a teacher or counselor", "Leave school immediately", "Post the issue online first"],
            "b",
        ),
        (
            "What kind of classroom does every student deserve?",
            ["A classroom with fewer rules", "A classroom only for top students", "A classroom free from bullying and discrimination", "A classroom with no homework"],
            "c",
        ),
        (
            "What digital right is mentioned in the audio?",
            ["The right to own a computer", "The right to online privacy and informed consent", "The right to unlimited internet use", "The right to hide school records"],
            "b",
        ),
        (
            "Who should receive the same education and chance to lead?",
            ["Only community volunteers", "Only older students", "Girls and boys", "Teachers and parents"],
            "c",
        ),
        (
            "What is the main purpose of the workshop?",
            ["To teach teenagers about human rights in daily life", "To prepare teenagers for a sports event", "To explain how to use social media faster", "To recruit new school leaders"],
            "a",
        ),
    ]
    for index, (prompt, options, correct) in enumerate(listening_questions):
        questions.append(
            build_tournament_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="listening",
                question_type="listening",
                audio_text=listening_audio_text if index == 0 else None,
                audio_replay_limit=3 if index == 0 else None,
            )
        )

    reading_one_title = "Reading 1: The School Rights Club"
    reading_one_text = (
        "At Riverdale Secondary School, students created a Human Rights Club after several classmates said they felt ignored "
        "when school rules were discussed. The club did not begin as a protest group. Instead, it started as a listening space "
        "where students could explain what made them feel safe, respected, and included. The first issue they discussed was "
        "access to information. Some students did not fully understand the school's discipline process, so they feared being "
        "punished without knowing the rules. The club asked the school to publish a simple guide explaining student rights and "
        "responsibilities in clear language. Teachers agreed, and the guide was posted in classrooms and online.\n\n"
        "The club then focused on participation. Student leaders argued that learners should have a voice in decisions that affect "
        "their daily lives, especially when those decisions involve safety, privacy, and equal treatment. The principal invited club "
        "members to monthly meetings with teachers and parents. During these meetings, students raised concerns about insults aimed "
        "at minority groups and suggested stronger anti-bullying steps. The school responded by creating a confidential reporting form "
        "and training peer supporters.\n\n"
        "Within a few months, the atmosphere changed. More students joined activities, complaints were handled more quickly, and trust "
        "grew between staff and learners. The club learned that rights become meaningful when people understand them, talk about them, "
        "and act together to protect them."
    )
    reading_one_questions = [
        ("Why was the Human Rights Club created?", ["To organize sports events", "To give students a place to discuss safety and respect", "To replace the principal", "To cancel all school rules"], "b"),
        ("What was the first issue the club discussed?", ["School uniforms", "Food prices", "Access to information about discipline rules", "Bus schedules"], "c"),
        ("How did the school respond to the students' request?", ["It ignored the request", "It removed the discipline policy", "It published a simple guide to rights and responsibilities", "It punished the club members"], "c"),
        ("What did the principal do after students asked for participation?", ["Closed the club", "Invited members to monthly meetings", "Transferred the teachers", "Stopped online communication"], "b"),
        ("What is the main lesson of the passage?", ["Rights matter only in courtrooms", "Students should avoid school decisions", "Rights become real when people understand and protect them together", "Bullying can never be reduced"], "c"),
    ]
    for prompt, options, correct in reading_one_questions:
        questions.append(
            build_tournament_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="reading",
                question_type="reading",
                passage_id="reading-1",
                passage_title=reading_one_title,
                passage_text=reading_one_text,
            )
        )

    reading_two_title = "Reading 2: A Community Center and Digital Rights"
    reading_two_text = (
        "In a coastal city, a public community center began offering free internet access and digital-skills classes for families who "
        "could not afford computers at home. At first, the project aimed only to improve job opportunities and school performance. "
        "However, staff soon realized that digital access was also connected to broader human-rights questions. Adults needed the internet "
        "to apply for services, workers used it to learn about labor laws, and young people depended on it to join classes, express ideas, "
        "and stay informed about public issues.\n\n"
        "As the center grew, another concern appeared: privacy. Some users created accounts on shared computers without understanding how "
        "their information could be stored. Volunteers noticed that people often clicked 'accept' on long online forms without reading them. "
        "In response, the center added short lessons on passwords, consent, and data protection. Trainers explained that digital tools can "
        "expand freedom, but they can also expose people to surveillance, fraud, or harassment if safeguards are ignored.\n\n"
        "The center also made inclusion a priority. It offered evening classes for workers, screen-reader software for visually impaired users, "
        "and translated guides for migrant families. Staff believed that equal access does not mean giving everyone the exact same support. "
        "Instead, it means removing barriers so each person can use the service effectively. By the end of the year, the project was recognized "
        "by local officials as a model for combining education, equality, and civic participation.\n\n"
        "The center's director said the biggest success was not the number of computers installed. It was the shift in confidence. People who "
        "once felt excluded from public life were now sending messages to local representatives, reading official updates, applying for benefits, "
        "and helping neighbors understand their rights. Access, privacy, and inclusion were no longer abstract concepts. They had become daily practices."
    )
    reading_two_questions = [
        ("What was the center's original goal?", ["To sell computers", "To improve job and study opportunities", "To replace local schools", "To monitor online behavior"], "b"),
        ("Why did staff connect internet access to human rights?", ["Because only lawyers use the internet", "Because digital access affects services, learning, and participation", "Because internet use is a private hobby only", "Because paper forms were banned"], "b"),
        ("What privacy problem did volunteers notice?", ["People refused to use computers", "Users often ignored how personal data was handled", "Children played too many games", "Teachers deleted all accounts"], "b"),
        ("What was added after privacy concerns appeared?", ["Longer registration forms", "Computer repair classes only", "Lessons on passwords, consent, and data protection", "A fee for every internet session"], "c"),
        ("According to the passage, digital tools can be risky when ___.", ["they are used only in the morning", "safeguards are ignored", "they are installed in libraries", "adults use them for work"], "b"),
        ("How did the center support visually impaired users?", ["By closing evening classes", "By offering free phones", "By installing screen-reader software", "By printing fewer guides"], "c"),
        ("What does the passage suggest about equal access?", ["Everyone should receive identical support in all cases", "Removing barriers is necessary for effective access", "Only migrant families need support", "Access matters less than speed"], "b"),
        ("Why were guides translated for migrant families?", ["To make services easier to use", "To reduce computer costs", "To limit privacy rights", "To replace language classes"], "a"),
        ("What did local officials recognize?", ["A new private company", "A model that joined education, equality, and civic participation", "A campaign against technology", "A plan to remove public internet"], "b"),
        ("What is the best summary of the final paragraph?", ["The project mattered mainly because of new hardware", "People gained confidence to use rights in daily life", "Officials controlled all communication", "The center ended its classes after one year"], "b"),
    ]
    for prompt, options, correct in reading_two_questions:
        questions.append(
            build_tournament_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="reading",
                question_type="reading",
                passage_id="reading-2",
                passage_title=reading_two_title,
                passage_text=reading_two_text,
            )
        )

    return questions


def build_tournament_leaderboard_rows(attempts: list[TournamentAttempt]) -> list[tuple[int, TournamentAttempt]]:
    rows: list[tuple[int, TournamentAttempt]] = []
    seen_user_ids: set[int] = set()
    for attempt in attempts:
        if attempt.user_id in seen_user_ids:
            continue
        seen_user_ids.add(attempt.user_id)
        rows.append((attempt.user_id, attempt))
    return rows


def is_human_rights_tournament_blueprint_candidate(tournament: Tournament) -> bool:
    questions = list(tournament.questions or [])
    if not questions:
        return True

    passage_ids = {question.get("passage_id") for question in questions if question.get("passage_id")}
    if passage_ids.intersection({"reading-1", "reading-2"}):
        return True

    sample_prompts = {
        "Choose the correct sentence: Everyone ___ equal before the law.",
        "What was the center's original goal?",
    }
    prompts = {str(question.get("prompt", "")) for question in questions[:12]}
    return bool(prompts.intersection(sample_prompts))


def apply_human_rights_tournament_blueprint(tournament: Tournament) -> bool:
    if not is_human_rights_tournament_blueprint_candidate(tournament):
        return False

    questions = build_human_rights_tournament_questions()
    title = "Giải đấu quyền con người tuần này"
    description = (
        "Bài thi 50 câu theo chủ đề quyền con người, gồm ngữ pháp, từ vựng, nghe và đọc hiểu để xếp hạng toàn server."
    )
    reward_title = "Huy hiệu Nhân quyền tuần"
    reward_description = "Top cao nhận huy hiệu giải đấu, điểm thưởng và vị trí nổi bật trên bảng xếp hạng."
    current_questions = list(tournament.questions or [])
    current_listening_audio_count = sum(
        1 for question in current_questions if question.get("section") == "listening" and question.get("audio_text")
    )
    should_refresh = (
        len(current_questions) != len(questions)
        or "quyền con người" not in (tournament.title or "").lower()
        or tournament.duration_minutes != 50
        or current_listening_audio_count != 1
    )
    if not should_refresh:
        return False

    tournament.title = title
    tournament.description = description
    tournament.duration_minutes = 50
    tournament.passing_score = 60
    tournament.reward_title = reward_title
    tournament.reward_description = reward_description
    tournament.questions = questions
    return True


async def ensure_sample_tournament(session: Any, *, language_code: str) -> Tournament:
    questions = build_human_rights_tournament_questions()
    title = "Giải đấu quyền con người tuần này"
    description = (
        "Bài thi 50 câu theo chủ đề quyền con người, gồm ngữ pháp, từ vựng, nghe và đọc hiểu để xếp hạng toàn server."
    )
    reward_title = "Huy hiệu Nhân quyền tuần"
    reward_description = "Top cao nhận huy hiệu giải đấu, điểm thưởng và vị trí nổi bật trên bảng xếp hạng."
    result = await session.execute(
        select(Tournament)
        .where(Tournament.language_code == language_code, Tournament.is_active.is_(True))
        .order_by(Tournament.id.asc())
        .limit(1)
    )
    tournament = result.scalar_one_or_none()
    if tournament is not None and not is_human_rights_tournament_blueprint_candidate(tournament):
        return tournament

    if tournament is not None:
        current_listening_audio_count = sum(
            1
            for question in list(tournament.questions or [])
            if question.get("section") == "listening" and question.get("audio_text")
        )
        should_refresh = (
            len(list(tournament.questions or [])) != len(questions)
            or "quyền con người" not in (tournament.title or "").lower()
            or tournament.duration_minutes != 50
            or current_listening_audio_count != 1
        )
        if should_refresh:
            tournament.title = title
            tournament.description = description
            tournament.duration_minutes = 50
            tournament.passing_score = 60
            tournament.reward_title = reward_title
            tournament.reward_description = reward_description
            tournament.questions = questions
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
    tournament.title = title
    tournament.description = description
    tournament.duration_minutes = 50
    tournament.passing_score = 60
    tournament.reward_title = reward_title
    tournament.reward_description = reward_description
    tournament.questions = questions
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
        participant_counts: dict[int, int] = {}
        if tournaments:
            participant_result = await session.execute(
                select(TournamentRegistration.tournament_id, func.count(TournamentRegistration.id))
                .where(TournamentRegistration.tournament_id.in_([item.id for item in tournaments]))
                .group_by(TournamentRegistration.tournament_id)
            )
            participant_counts = {tournament_id: count for tournament_id, count in participant_result.all()}
        await session.commit()
        return [
            tournament_to_out(
                item,
                is_registered=item.id in registered_ids,
                participant_count=participant_counts.get(item.id, 0),
            )
            for item in tournaments
        ]


@router.get("/tournaments/{tournament_id}", response_model=TournamentOut)
async def get_tournament_detail(tournament_id: int, current_user: User | None = Depends(get_optional_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Tournament).where(Tournament.id == tournament_id, Tournament.is_active.is_(True)))
        tournament = result.scalar_one_or_none()
        if tournament is None:
            raise HTTPException(status_code=404, detail="Giải đấu không tồn tại")
        if apply_human_rights_tournament_blueprint(tournament):
            await session.commit()

        is_registered = False
        if current_user is not None:
            registration_result = await session.execute(
                select(TournamentRegistration.id).where(
                    TournamentRegistration.tournament_id == tournament.id,
                    TournamentRegistration.user_id == current_user.id,
                )
            )
            is_registered = registration_result.scalar_one_or_none() is not None
        participant_count = (
            await session.execute(select(func.count(TournamentRegistration.id)).where(TournamentRegistration.tournament_id == tournament.id))
        ).scalar_one()
        current_user_is_admin = await is_admin(session, current_user.id) if current_user else False
        return tournament_to_out(
            tournament,
            is_registered=is_registered,
            include_questions=is_registered or current_user_is_admin,
            participant_count=participant_count,
        )


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
        await broadcast_event("tournament:room:update", {"tournament_id": tournament.id})
        return TournamentRegisterOut(tournament_id=tournament.id, registered=True, message="Đã đăng ký giải đấu")


@router.post("/tournaments/{tournament_id}/start-room", response_model=TournamentRoomStartOut)
async def start_tournament_room(tournament_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        if not await is_admin(session, current_user.id):
            raise HTTPException(status_code=403, detail="Only admin can start tournament room")

        result = await session.execute(select(Tournament).where(Tournament.id == tournament_id, Tournament.is_active.is_(True)))
        tournament = result.scalar_one_or_none()
        if tournament is None:
            raise HTTPException(status_code=404, detail="Giải đấu không tồn tại")
        apply_human_rights_tournament_blueprint(tournament)

        tournament.room_status = "in_progress"
        tournament.room_started_at = utc_now()
        await session.commit()
        await send_user_event(current_user.id, "tournament:room:started", {"tournament_id": tournament.id})
        await broadcast_event("tournament:room:update", {"tournament_id": tournament.id})
        return TournamentRoomStartOut(
            tournament_id=tournament.id,
            room_status=tournament.room_status,
            room_started_at=tournament.room_started_at.isoformat(),
            message="Đã mở phòng thi cho toàn bộ thí sinh",
        )


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
        apply_human_rights_tournament_blueprint(tournament)

        registration_result = await session.execute(
            select(TournamentRegistration.id).where(
                TournamentRegistration.tournament_id == tournament.id,
                TournamentRegistration.user_id == current_user.id,
            )
        )
        if registration_result.scalar_one_or_none() is None:
            session.add(TournamentRegistration(tournament_id=tournament.id, user_id=current_user.id))
            await session.flush()

        if get_effective_tournament_room_status(tournament, window_start=current_tournament_window()[0]) != "in_progress":
            raise HTTPException(status_code=403, detail="Phòng thi chưa được admin mở")

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
        ranking_result = await session.execute(
            select(TournamentAttempt)
            .where(TournamentAttempt.tournament_id == tournament.id)
            .order_by(TournamentAttempt.score_percent.desc(), TournamentAttempt.created_at.asc())
        )
        ranking_rows = build_tournament_leaderboard_rows(list(ranking_result.scalars().all()))
        user_rank = next((index + 1 for index, (user_id, _) in enumerate(ranking_rows) if user_id == current_user.id), None)
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
            rank=user_rank,
            leaderboard_size=len(ranking_rows),
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
            .limit(500)
        )
        rows: list[TournamentLeaderboardItemOut] = []
        seen_user_ids: set[int] = set()
        for attempt, user, tournament in result.all():
            if user.id in seen_user_ids:
                continue
            seen_user_ids.add(user.id)
            rows.append(
                TournamentLeaderboardItemOut(
                user_id=user.id,
                user_name=user.full_name or user.email,
                score_percent=attempt.score_percent,
                correct_count=attempt.correct_count,
                total_questions=attempt.total_questions,
                reward_title=tournament.reward_title if attempt.passed else None,
                )
            )
            if len(rows) >= 50:
                break
        return rows


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
            select(GroupRoom, User, func.count(GroupRoomMember.id))
            .join(User, User.id == GroupRoom.owner_user_id)
            .join(GroupRoomMember, GroupRoomMember.room_id == GroupRoom.id)
            .where(
                GroupRoom.id.in_(
                    select(GroupRoomMember.room_id).where(GroupRoomMember.user_id == current_user.id)
                )
            )
            .group_by(GroupRoom.id, User.id)
            .order_by(GroupRoom.created_at.desc())
        )
        return [
            group_room_to_out(room, owner=owner, current_user_id=current_user.id, member_count=member_count)
            for room, owner, member_count in result.all()
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
        return group_room_to_out(room, owner=current_user, current_user_id=current_user.id, member_count=1)


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
        owner_result = await session.execute(select(User).where(User.id == room.owner_user_id))
        owner = owner_result.scalar_one()
        await session.commit()
        return group_room_to_out(room, owner=owner, current_user_id=current_user.id, member_count=member_count)


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
            group_message_to_out(message, user=user)
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
        content = (payload.content or "").strip()
        if not content and not payload.image_url and not payload.audio_url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tin nhắn không được để trống")
        message = GroupRoomMessage(
            room_id=room_id,
            user_id=current_user.id,
            content=content,
            image_url=payload.image_url,
            audio_url=payload.audio_url,
            audio_name=(payload.audio_name or "").strip() or None,
        )
        session.add(message)
        await session.commit()
        await session.refresh(message)
        message_out = group_message_to_out(message, user=current_user)
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


@router.get("/community/global-chat/messages", response_model=list[GroupRoomMessageOut])
async def list_global_chat_messages(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        room = await get_or_create_global_chat_room(session, current_user=current_user)
        result = await session.execute(
            select(GroupRoomMessage, User)
            .join(User, User.id == GroupRoomMessage.user_id)
            .where(GroupRoomMessage.room_id == room.id)
            .order_by(GroupRoomMessage.created_at.asc())
            .limit(200)
        )
        return [group_message_to_out(message, user=user) for message, user in result.all()]


@router.post("/community/global-chat/messages", response_model=GroupRoomMessageOut, status_code=status.HTTP_201_CREATED)
async def create_global_chat_message(
    payload: GroupRoomMessageInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        room = await get_or_create_global_chat_room(session, current_user=current_user)
        content = (payload.content or "").strip()
        if not content and not payload.image_url and not payload.audio_url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tin nhắn không được để trống")
        message = GroupRoomMessage(
            room_id=room.id,
            user_id=current_user.id,
            content=content,
            image_url=payload.image_url,
            audio_url=payload.audio_url,
            audio_name=(payload.audio_name or "").strip() or None,
        )
        session.add(message)
        await session.commit()
        await session.refresh(message)
        message_out = group_message_to_out(message, user=current_user)
        await broadcast_event(
            "global:message",
            {
                "room_id": room.id,
                "message": message_out.model_dump(),
            },
        )
        return message_out


@router.get("/community/posts", response_model=list[CommunityPostOut])
async def list_community_posts(
    language_code: str | None = Query(default=None, max_length=10),
    current_user: User | None = Depends(get_optional_current_user),
):
    async with AsyncSessionLocal() as session:
        post_query = select(CommunityPost, User).join(User, User.id == CommunityPost.user_id).where(CommunityPost.is_active.is_(True))
        if language_code:
            post_query = post_query.where(CommunityPost.language_code == language_code)
        post_result = await session.execute(post_query.order_by(CommunityPost.created_at.desc()).limit(30))
        rows = post_result.all()
        items: list[CommunityPostOut] = []
        for post, user in rows:
            items.append(
                await build_community_post_out(
                    session,
                    post=post,
                    user=user,
                    current_user_id=current_user.id if current_user else None,
                )
            )
        return items


@router.post("/community/posts", response_model=CommunityPostOut, status_code=status.HTTP_201_CREATED)
async def create_community_post(payload: CommunityPostInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        post = CommunityPost(user_id=current_user.id, **payload.model_dump())
        session.add(post)
        await session.commit()
        await session.refresh(post)
        post_out = await build_community_post_out(session, post=post, user=current_user, current_user_id=current_user.id)
        await broadcast_event("community:post:new", {"language_code": post.language_code, "post": post_out.model_dump()})
        return post_out


@router.patch("/community/posts/{post_id}", response_model=CommunityPostOut)
async def update_community_post(
    post_id: int,
    payload: CommunityPostUpdateInput,
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
        if post.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn chỉ được sửa bài viết của mình")

        post.title = payload.title.strip()
        post.content = payload.content.strip()
        post.image_url = payload.image_url
        await session.commit()
        await session.refresh(post)

        post_out = await build_community_post_out(session, post=post, user=current_user, current_user_id=current_user.id)
        await broadcast_event(
            "community:post:update",
            {"language_code": post.language_code, "post_id": post.id, "post": post_out.model_dump()},
        )
        return post_out


@router.delete("/community/posts/{post_id}", response_model=SimpleStatusOut)
async def delete_community_post(post_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        post = (
            await session.execute(
                select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.is_active.is_(True))
            )
        ).scalar_one_or_none()
        if post is None:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")
        if post.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn chỉ được xóa bài viết của mình")

        post.is_active = False
        await session.commit()
        await broadcast_event("community:post:removed", {"language_code": post.language_code, "post_id": post.id})
        return SimpleStatusOut(ok=True, message="Đã xóa bài viết")


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
        comment_out = community_comment_to_out(comment, user=current_user)
        await broadcast_event(
            "community:comment:new",
            {"language_code": post.language_code, "post_id": post.id, "comment": comment_out.model_dump()},
        )
        return comment_out


@router.post("/community/posts/{post_id}/reactions", response_model=CommunityReactionSummaryOut)
async def react_community_post(
    post_id: int,
    payload: CommunityReactionInput,
    current_user: User = Depends(get_current_user),
):
    reaction_type = payload.reaction_type.strip().lower()
    if reaction_type not in {"like", "haha", "tym"}:
        raise HTTPException(status_code=422, detail="Phản ứng không hợp lệ")

    async with AsyncSessionLocal() as session:
        post = (
            await session.execute(select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.is_active.is_(True)))
        ).scalar_one_or_none()
        if post is None:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

        existing = (
            await session.execute(
                select(CommunityPostReaction).where(
                    CommunityPostReaction.post_id == post_id,
                    CommunityPostReaction.user_id == current_user.id,
                )
            )
        ).scalar_one_or_none()

        my_reaction = reaction_type
        if existing is None:
            session.add(CommunityPostReaction(post_id=post_id, user_id=current_user.id, reaction_type=reaction_type))
        elif existing.reaction_type == reaction_type:
            await session.delete(existing)
            my_reaction = None
        else:
            existing.reaction_type = reaction_type

        await session.commit()
        reaction_result = await session.execute(
            select(CommunityPostReaction.reaction_type, func.count(CommunityPostReaction.id))
            .where(CommunityPostReaction.post_id == post_id)
            .group_by(CommunityPostReaction.reaction_type)
        )
        reactions = {kind: count for kind, count in reaction_result.all()}
        summary = CommunityReactionSummaryOut(post_id=post_id, reactions=reactions, my_reaction=my_reaction)
        await broadcast_event(
            "community:reaction:update",
            {"language_code": post.language_code, "post_id": post_id, "summary": summary.model_dump()},
        )
        return summary


@router.post("/community/posts/{post_id}/share", response_model=CommunityShareSummaryOut)
async def share_community_post(post_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        post = (
            await session.execute(select(CommunityPost).where(CommunityPost.id == post_id, CommunityPost.is_active.is_(True)))
        ).scalar_one_or_none()
        if post is None:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

        existing = (
            await session.execute(
                select(CommunityPostShare).where(
                    CommunityPostShare.post_id == post_id,
                    CommunityPostShare.user_id == current_user.id,
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            session.add(CommunityPostShare(post_id=post_id, user_id=current_user.id))
            await session.commit()

        share_count_result = await session.execute(
            select(func.count(CommunityPostShare.id)).where(CommunityPostShare.post_id == post_id)
        )
        summary = CommunityShareSummaryOut(post_id=post_id, share_count=share_count_result.scalar_one())
        await broadcast_event(
            "community:share:update",
            {"language_code": post.language_code, "post_id": post_id, "summary": summary.model_dump()},
        )
        return summary


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


@router.get("/community/users/search", response_model=list[CommunityUserOut])
async def search_community_users(
    query: str = Query(min_length=1, max_length=255),
    current_user: User = Depends(get_current_user),
):
    search_value = query.strip()
    if not search_value:
        return []

    conditions = [
        User.email.ilike(f"%{search_value.lower()}%"),
        User.full_name.ilike(f"%{search_value}%"),
    ]
    if search_value.isdigit():
        conditions.append(User.id == int(search_value.lstrip("0") or "0"))

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User)
            .where(User.id != current_user.id, or_(*conditions))
            .order_by(User.full_name.asc().nullslast(), User.email.asc())
            .limit(8)
        )
        return [community_user_to_out(user) for user in result.scalars().all()]


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
                friend_public_user_id=build_public_user_id(user.id),
                friend_name=user.full_name or user.email,
                friend_email=user.email,
                friend_avatar_url=user.avatar_url,
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
            await session.flush()
        reverse_result = await session.execute(
            select(FriendLink).where(
                FriendLink.user_id == friend_user_id,
                FriendLink.friend_user_id == current_user.id,
            )
        )
        if reverse_result.scalar_one_or_none() is None:
            session.add(FriendLink(user_id=friend_user_id, friend_user_id=current_user.id, status="accepted"))
        await session.commit()
        await session.refresh(link)
        return FriendLinkOut(
            id=link.id,
            user_id=link.user_id,
            friend_user_id=link.friend_user_id,
            friend_public_user_id=build_public_user_id(friend.id),
            friend_name=friend.full_name or friend.email,
            friend_email=friend.email,
            friend_avatar_url=friend.avatar_url,
            status=link.status,
            created_at=link.created_at.isoformat(),
        )


@router.get("/community/direct-messages/{friend_user_id}", response_model=list[DirectMessageOut])
async def list_direct_messages(friend_user_id: int, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        friend = await ensure_friend_link(session, user_id=current_user.id, friend_user_id=friend_user_id)
        result = await session.execute(
            select(DirectMessage)
            .where(
                or_(
                    (DirectMessage.sender_user_id == current_user.id) & (DirectMessage.recipient_user_id == friend_user_id),
                    (DirectMessage.sender_user_id == friend_user_id) & (DirectMessage.recipient_user_id == current_user.id),
                )
            )
            .order_by(DirectMessage.created_at.asc())
            .limit(200)
        )

        messages = result.scalars().all()
        user_ids = {current_user.id, friend.id}
        users = (
            await session.execute(select(User).where(User.id.in_(user_ids)))
        ).scalars().all()
        users_by_id = {user.id: user for user in users}
        return [
            direct_message_to_out(
                message,
                sender=users_by_id[message.sender_user_id],
                recipient=users_by_id[message.recipient_user_id],
            )
            for message in messages
        ]


@router.post("/community/direct-messages/{friend_user_id}", response_model=DirectMessageOut, status_code=status.HTTP_201_CREATED)
async def create_direct_message(
    friend_user_id: int,
    payload: DirectMessageInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        friend = await ensure_friend_link(session, user_id=current_user.id, friend_user_id=friend_user_id)
        message = DirectMessage(sender_user_id=current_user.id, recipient_user_id=friend_user_id, content=payload.content)
        session.add(message)
        await session.commit()
        await session.refresh(message)
        message_out = direct_message_to_out(message, sender=current_user, recipient=friend)
        for user_id in {current_user.id, friend_user_id}:
            await send_user_event(
                user_id,
                "direct:message",
                {"friend_user_id": friend_user_id if user_id == current_user.id else current_user.id, "message": message_out.model_dump()},
            )
        return message_out
