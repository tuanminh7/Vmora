from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from sqlalchemy import delete, func, select


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    AdminAuditLog,
    AdminGrant,
    CommunityComment,
    CommunityPost,
    CommunityPostReaction,
    CommunityPostShare,
    CommunityReport,
    Course,
    CourseSection,
    DirectMessage,
    Exam,
    ExamAttempt,
    ExamQuestion,
    FriendLink,
    GroupRoom,
    GroupRoomMember,
    GroupRoomMessage,
    Language,
    Lesson,
    LessonProgress,
    Level,
    NotebookEntry,
    NotebookReminder,
    Notification,
    Package,
    PackageCourse,
    PasswordResetOtp,
    PaymentTransaction,
    PetProfile,
    PetVoiceMessage,
    PracticeActivity,
    PracticeAttempt,
    QuestionBankItem,
    Roadmap,
    RoadmapStage,
    SessionToken,
    StudyStreak,
    SupportTicket,
    Tournament,
    TournamentAttempt,
    TournamentRegistration,
    User,
    UserEntitlement,
    UserSetting,
    UserVocabularyItem,
    VocabularyEntry,
)


KEEP_EMAILS = {"admin@vmora.local", "datminhtuan07@gmail.com"}
KEEP_LANGUAGE_CODES = {"de", "en", "ja", "ko", "zh"}

FULL_RESET_MODELS = [
    SessionToken,
    PasswordResetOtp,
    AdminAuditLog,
    CommunityPostReaction,
    CommunityPostShare,
    CommunityComment,
    CommunityReport,
    CommunityPost,
    GroupRoomMessage,
    GroupRoomMember,
    GroupRoom,
    DirectMessage,
    FriendLink,
    Notification,
    SupportTicket,
    NotebookReminder,
    NotebookEntry,
    PetVoiceMessage,
    PetProfile,
    UserSetting,
    StudyStreak,
    PaymentTransaction,
    UserEntitlement,
    PackageCourse,
    Package,
    PracticeAttempt,
    PracticeActivity,
    LessonProgress,
    TournamentAttempt,
    TournamentRegistration,
    Tournament,
    ExamAttempt,
    ExamQuestion,
    Exam,
    QuestionBankItem,
    UserVocabularyItem,
    VocabularyEntry,
    Lesson,
    CourseSection,
    Course,
    RoadmapStage,
    Roadmap,
    Level,
]

VERIFY_MODELS = [
    User,
    Language,
    Course,
    Lesson,
    PracticeActivity,
    Exam,
    Tournament,
    Package,
    VocabularyEntry,
    CommunityPost,
    SupportTicket,
    UserVocabularyItem,
    PaymentTransaction,
]


async def count_rows(session, model) -> int:
    return await session.scalar(select(func.count()).select_from(model)) or 0


async def main() -> None:
    async with AsyncSessionLocal() as session:
        users = (
            await session.execute(
                select(User.id, User.email)
                .where(User.email.in_(KEEP_EMAILS))
                .order_by(User.id)
            )
        ).all()
        keep_user_ids = [user_id for user_id, _ in users]
        found_emails = {email for _, email in users}
        missing_emails = sorted(KEEP_EMAILS - found_emails)

        if missing_emails:
            raise SystemExit(
                f"Khong tim thay tai khoan can giu lai: {', '.join(missing_emails)}"
            )

        before_counts = {
            model.__tablename__: await count_rows(session, model) for model in VERIFY_MODELS
        }

        for model in FULL_RESET_MODELS:
            await session.execute(delete(model))

        await session.execute(delete(AdminGrant).where(~AdminGrant.user_id.in_(keep_user_ids)))
        await session.execute(delete(User).where(~User.id.in_(keep_user_ids)))
        await session.execute(delete(Language).where(~Language.code.in_(KEEP_LANGUAGE_CODES)))

        await session.commit()

        after_counts = {
            model.__tablename__: await count_rows(session, model) for model in VERIFY_MODELS
        }
        remaining_users = (
            await session.execute(select(User.id, User.email).order_by(User.id))
        ).all()
        remaining_admin_grants = (
            await session.execute(select(AdminGrant.user_id).order_by(AdminGrant.user_id))
        ).scalars().all()

    print("=== BEFORE ===")
    for table_name, count in before_counts.items():
        print(f"{table_name}: {count}")

    print("=== AFTER ===")
    for table_name, count in after_counts.items():
        print(f"{table_name}: {count}")

    print("=== USERS ===")
    for user_id, email in remaining_users:
        print(f"{user_id}: {email}")

    print("=== ADMIN GRANTS ===")
    if remaining_admin_grants:
        print(", ".join(str(user_id) for user_id in remaining_admin_grants))
    else:
        print("(none)")


if __name__ == "__main__":
    asyncio.run(main())
