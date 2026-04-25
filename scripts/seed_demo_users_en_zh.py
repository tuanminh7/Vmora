from __future__ import annotations

import argparse
import asyncio
import random
import sys
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, init_db
from app.models.course import Course, CourseSection, Lesson
from app.models.feature import Exam, ExamAttempt, Tournament, TournamentAttempt, TournamentRegistration
from app.models.package import Package, UserEntitlement
from app.models.practice import PracticeActivity, PracticeAttempt
from app.models.progress import LessonProgress
from app.models.user import User
from app.services.entitlement import grant_entitlement


SEED_PASSWORD = "Vmora123!"
SEED_PIN = "2468"


@dataclass(frozen=True)
class DemoUserSeed:
    email: str
    full_name: str
    phone_number: str
    address: str
    language_code: str


ENGLISH_USERS = [
    DemoUserSeed("olivia.carter@vmora.demo", "Olivia Carter", "0901100001", "12 Nguyen Hue, District 1, Ho Chi Minh City", "en"),
    DemoUserSeed("ethan.walker@vmora.demo", "Ethan Walker", "0901100002", "27 Tran Hung Dao, District 5, Ho Chi Minh City", "en"),
    DemoUserSeed("mia.bennett@vmora.demo", "Mia Bennett", "0901100003", "104 Vo Thi Sau, District 3, Ho Chi Minh City", "en"),
    DemoUserSeed("noah.collins@vmora.demo", "Noah Collins", "0901100004", "9 Le Loi, Thu Duc City", "en"),
    DemoUserSeed("charlotte.mitchell@vmora.demo", "Charlotte Mitchell", "0901100005", "55 Xo Viet Nghe Tinh, Binh Thanh, Ho Chi Minh City", "en"),
    DemoUserSeed("liam.hughes@vmora.demo", "Liam Hughes", "0901100006", "81 Dien Bien Phu, Binh Thanh, Ho Chi Minh City", "en"),
    DemoUserSeed("amelia.turner@vmora.demo", "Amelia Turner", "0901100007", "22 Ho Tung Mau, District 1, Ho Chi Minh City", "en"),
    DemoUserSeed("jacob.parker@vmora.demo", "Jacob Parker", "0901100008", "67 Cach Mang Thang Tam, District 10, Ho Chi Minh City", "en"),
    DemoUserSeed("sophia.ward@vmora.demo", "Sophia Ward", "0901100009", "31 Hai Ba Trung, District 1, Ho Chi Minh City", "en"),
    DemoUserSeed("henry.brooks@vmora.demo", "Henry Brooks", "0901100010", "18 Nguyen Dinh Chieu, District 3, Ho Chi Minh City", "en"),
]

CHINESE_USERS = [
    DemoUserSeed("linh.nguyen.zh@vmora.demo", "Linh Nguyen", "0902200001", "14 Pham Ngu Lao, District 1, Ho Chi Minh City", "zh"),
    DemoUserSeed("minh.tran.zh@vmora.demo", "Minh Tran", "0902200002", "88 Pasteur, District 3, Ho Chi Minh City", "zh"),
    DemoUserSeed("thao.le.zh@vmora.demo", "Thao Le", "0902200003", "43 Nguyen Thi Minh Khai, District 3, Ho Chi Minh City", "zh"),
    DemoUserSeed("quang.pham.zh@vmora.demo", "Quang Pham", "0902200004", "121 Le Van Sy, Phu Nhuan, Ho Chi Minh City", "zh"),
    DemoUserSeed("huong.vo.zh@vmora.demo", "Huong Vo", "0902200005", "16 Phan Xich Long, Phu Nhuan, Ho Chi Minh City", "zh"),
    DemoUserSeed("duy.hoang.zh@vmora.demo", "Duy Hoang", "0902200006", "72 Nguyen Oanh, Go Vap, Ho Chi Minh City", "zh"),
    DemoUserSeed("mai.bui.zh@vmora.demo", "Mai Bui", "0902200007", "29 Hoang Van Thu, Tan Binh, Ho Chi Minh City", "zh"),
    DemoUserSeed("khanh.dang.zh@vmora.demo", "Khanh Dang", "0902200008", "64 Nguyen Thi Thap, District 7, Ho Chi Minh City", "zh"),
    DemoUserSeed("yen.do.zh@vmora.demo", "Yen Do", "0902200009", "17 Nguyen Huu Canh, Binh Thanh, Ho Chi Minh City", "zh"),
    DemoUserSeed("phuc.lam.zh@vmora.demo", "Phuc Lam", "0902200010", "39 Quang Trung, Go Vap, Ho Chi Minh City", "zh"),
]


def utc_now() -> datetime:
    return datetime.now(UTC)


async def ensure_demo_users(session, seeds: list[DemoUserSeed]) -> list[User]:
    users: list[User] = []
    for seed in seeds:
        existing = (await session.execute(select(User).where(User.email == seed.email))).scalar_one_or_none()
        if existing is None:
            existing = User(
                email=seed.email,
                password_hash=hash_password(SEED_PASSWORD),
                pin_hash=hash_password(SEED_PIN),
                full_name=seed.full_name,
                phone_number=seed.phone_number,
                address=seed.address,
                is_locked=False,
                is_verified=True,
                learning_language_code=seed.language_code,
            )
            session.add(existing)
            await session.flush()
        else:
            existing.password_hash = hash_password(SEED_PASSWORD)
            existing.pin_hash = hash_password(SEED_PIN)
            existing.full_name = seed.full_name
            existing.phone_number = seed.phone_number
            existing.address = seed.address
            existing.is_locked = False
            existing.is_verified = True
            existing.learning_language_code = seed.language_code
        users.append(existing)
    await session.flush()
    return users


async def clear_user_activity(session, user_ids: list[int]) -> None:
    if not user_ids:
        return
    await session.execute(delete(TournamentAttempt).where(TournamentAttempt.user_id.in_(user_ids)))
    await session.execute(delete(TournamentRegistration).where(TournamentRegistration.user_id.in_(user_ids)))
    await session.execute(delete(ExamAttempt).where(ExamAttempt.user_id.in_(user_ids)))
    await session.execute(delete(PracticeAttempt).where(PracticeAttempt.user_id.in_(user_ids)))
    await session.execute(delete(LessonProgress).where(LessonProgress.user_id.in_(user_ids)))
    await session.execute(delete(UserEntitlement).where(UserEntitlement.user_id.in_(user_ids)))
    await session.flush()


async def get_free_package(session, language_code: str) -> Package | None:
    return (
        await session.execute(
            select(Package)
            .where(
                Package.language_code == language_code,
                Package.is_active.is_(True),
                Package.is_free.is_(True),
            )
            .order_by(Package.id.asc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def get_free_lessons(session, language_code: str) -> list[Lesson]:
    result = await session.execute(
        select(Lesson)
        .join(CourseSection, CourseSection.id == Lesson.section_id)
        .join(Course, Course.id == CourseSection.course_id)
        .where(Course.language_code == language_code, Course.is_free.is_(True))
        .order_by(Course.order_index.asc(), CourseSection.order_index.asc(), Lesson.order_index.asc(), Lesson.id.asc())
    )
    return result.scalars().all()


async def get_free_practice_activities(session, language_code: str) -> list[PracticeActivity]:
    result = await session.execute(
        select(PracticeActivity)
        .where(
            PracticeActivity.language_code == language_code,
            PracticeActivity.is_active.is_(True),
            PracticeActivity.is_free.is_(True),
        )
        .order_by(PracticeActivity.order_index.asc(), PracticeActivity.id.asc())
    )
    return result.scalars().all()


async def get_exams(session, language_code: str) -> list[Exam]:
    result = await session.execute(
        select(Exam)
        .where(Exam.language_code == language_code, Exam.is_active.is_(True))
        .order_by(Exam.id.asc())
    )
    return result.scalars().all()


async def get_tournament(session, language_code: str) -> Tournament | None:
    return (
        await session.execute(
            select(Tournament)
            .where(Tournament.language_code == language_code, Tournament.is_active.is_(True))
            .order_by(Tournament.id.asc())
            .limit(1)
        )
    ).scalar_one_or_none()


def make_answer_stub(activity: PracticeActivity, score_percent: int) -> dict | list | str:
    payload = activity.payload or {}
    activity_type = activity.activity_type

    if activity_type == "quiz":
        options = payload.get("options") or []
        correct_option = payload.get("correct_option_id")
        selected = correct_option if score_percent >= 70 and correct_option else (options[0]["id"] if options else "a")
        return {"selected_option_id": selected}
    if activity_type == "flashcard":
        return {"result": "mastered" if score_percent >= 70 else "learning"}
    if activity_type == "audio":
        display_answer = payload.get("display_answer") or payload.get("transcript") or ""
        return display_answer if score_percent >= 70 else "..."
    if activity_type == "typing":
        display_answer = payload.get("display_answer") or ""
        return display_answer if score_percent >= 70 else (display_answer[: max(1, len(str(display_answer)) // 2)] if display_answer else "")
    if activity_type == "voice":
        return payload.get("display_answer") or payload.get("target_text") or ""
    return {"note": activity.code}


def make_exam_attempt_answer_stub(score_percent: int) -> dict[str, str]:
    return {"seed_status": "passed" if score_percent >= 70 else "review"}


async def seed_language_user_activity(
    session,
    *,
    language_code: str,
    users: list[User],
    randomizer: random.Random,
) -> dict[str, int]:
    free_package = await get_free_package(session, language_code)
    lessons = await get_free_lessons(session, language_code)
    activities = await get_free_practice_activities(session, language_code)
    exams = await get_exams(session, language_code)
    tournament = await get_tournament(session, language_code)

    if free_package is None:
        raise RuntimeError(f"Khong tim thay goi free cho ngon ngu {language_code}")

    lesson_rows = 0
    practice_rows = 0
    exam_rows = 0
    tournament_rows = 0

    now = utc_now()

    for index, user in enumerate(users):
        entitlement = await grant_entitlement(session, user_id=user.id, package=free_package)
        entitlement.created_at = now - timedelta(days=30 - index)

        lesson_count = min(len(lessons), 2 + (index % 3))
        for lesson_offset, lesson in enumerate(lessons[:lesson_count]):
            session.add(
                LessonProgress(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    completed_at=now - timedelta(days=lesson_count - lesson_offset, hours=index),
                )
            )
            lesson_rows += 1

        activity_count = min(len(activities), 6 + (index % 4))
        activity_pool = activities[:activity_count]
        for activity_offset, activity in enumerate(activity_pool):
            score_percent = randomizer.randint(62, 100)
            session.add(
                PracticeAttempt(
                    activity_id=activity.id,
                    user_id=user.id,
                    answers=make_answer_stub(activity, score_percent),
                    score_percent=score_percent,
                    is_correct=score_percent >= 70,
                    feedback="Da hoan thanh bai luyen tap.",
                    created_at=now - timedelta(days=8 - min(activity_offset, 7), minutes=index * 11 + activity_offset),
                )
            )
            practice_rows += 1

        for exam_offset, exam in enumerate(exams[:2]):
            score_percent = randomizer.randint(58, 96)
            total_questions = 20
            correct_count = max(1, round((score_percent / 100) * total_questions))
            session.add(
                ExamAttempt(
                    exam_id=exam.id,
                    user_id=user.id,
                    answers=make_exam_attempt_answer_stub(score_percent),
                    score_percent=score_percent,
                    correct_count=correct_count,
                    total_questions=total_questions,
                    passed=score_percent >= exam.passing_score,
                    created_at=now - timedelta(days=12 - exam_offset, hours=index),
                )
            )
            exam_rows += 1

        if tournament is not None:
            session.add(
                TournamentRegistration(
                    tournament_id=tournament.id,
                    user_id=user.id,
                    created_at=now - timedelta(days=5, minutes=index * 7),
                )
            )
            score_percent = randomizer.randint(52, 94)
            total_questions = len(tournament.questions or []) or 20
            correct_count = max(1, round((score_percent / 100) * total_questions))
            session.add(
                TournamentAttempt(
                    tournament_id=tournament.id,
                    user_id=user.id,
                    answers={"seed_status": "completed"},
                    score_percent=score_percent,
                    correct_count=correct_count,
                    total_questions=total_questions,
                    passed=score_percent >= tournament.passing_score,
                    created_at=now - timedelta(days=4, minutes=index * 9),
                )
            )
            tournament_rows += 1

    await session.flush()
    return {
        "users": len(users),
        "lesson_progress": lesson_rows,
        "practice_attempts": practice_rows,
        "exam_attempts": exam_rows,
        "tournament_attempts": tournament_rows,
    }


async def seed(selected_languages: set[str] | None = None) -> None:
    await init_db()
    randomizer = random.Random(20260426)

    language_to_seeds = {
        "en": ENGLISH_USERS,
        "zh": CHINESE_USERS,
    }

    summary: dict[str, dict[str, int]] = {}

    async with AsyncSessionLocal() as session:
        for language_code, seeds in language_to_seeds.items():
            if selected_languages and language_code not in selected_languages:
                continue
            users = await ensure_demo_users(session, seeds)
            await clear_user_activity(session, [user.id for user in users])
            summary[language_code] = await seed_language_user_activity(
                session,
                language_code=language_code,
                users=users,
                randomizer=randomizer,
            )

        await session.commit()

    for language_code, language_summary in summary.items():
        print(
            f"{language_code}: "
            f"{language_summary['users']} users, "
            f"{language_summary['lesson_progress']} lesson_progress, "
            f"{language_summary['practice_attempts']} practice_attempts, "
            f"{language_summary['exam_attempts']} exam_attempts, "
            f"{language_summary['tournament_attempts']} tournament_attempts"
        )
    print(f"Credentials: password={SEED_PASSWORD} pin={SEED_PIN}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Seed only selected languages, for example: en zh")
    args = parser.parse_args()
    selected_languages = set(args.languages) if args.languages else None
    asyncio.run(seed(selected_languages=selected_languages))


if __name__ == "__main__":
    main()
