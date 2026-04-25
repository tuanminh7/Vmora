from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal, init_db
from app.models.feature import Tournament, TournamentAttempt, TournamentRegistration
from app.models.language import Language


def build_question(
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
) -> dict[str, object]:
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


def build_english_weekly_questions() -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []

    vocabulary_questions = [
        ("Choose the best meaning of 'teacher'.", ["Giao vien", "Hoc sinh", "Ban hoc", "Lop hoc"], "a"),
        ("Choose the best meaning of 'library'.", ["Can tin", "Thu vien", "Van phong", "San truong"], "b"),
        ("Choose the correct word for 'xin loi'.", ["thank you", "sorry", "welcome", "morning"], "b"),
        ("Choose the best meaning of 'homework'.", ["Bai tap ve nha", "Bai kiem tra", "Bai giang", "Bang diem"], "a"),
        ("Choose the correct word for 'thoi gian bieu'.", ["schedule", "dictionary", "question", "answer"], "a"),
    ]
    for prompt, options, correct in vocabulary_questions:
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="vocabulary",
            )
        )

    grammar_questions = [
        ("Choose the correct sentence.", ["She go to class at 8.", "She goes to class at 8.", "She going to class at 8.", "She gone to class at 8."], "b"),
        ("Fill in the blank: They ___ studying for the quiz now.", ["is", "am", "are", "be"], "c"),
        ("Choose the correct article: I need ___ umbrella today.", ["a", "an", "the", "no article"], "b"),
        ("Choose the correct helper: ___ he play soccer after school?", ["Do", "Does", "Is", "Are"], "b"),
        ("Choose the correct connector: I stayed home ___ it was raining.", ["because", "but", "so", "or"], "a"),
    ]
    for prompt, options, correct in grammar_questions:
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="grammar",
            )
        )

    listening_transcript = (
        "Hello everyone. My name is Emma. Every morning I get up at six thirty, make a quick breakfast, "
        "and take the bus to school at seven fifteen. My first class is English, and after lunch I study in the library with two friends."
    )
    listening_questions = [
        ("What time does Emma get up?", ["At six", "At six thirty", "At seven", "At seven fifteen"], "b"),
        ("How does Emma go to school?", ["By bike", "By train", "By bus", "On foot"], "c"),
        ("What is Emma's first class?", ["Math", "English", "Science", "History"], "b"),
        ("Where does Emma study after lunch?", ["At home", "In the library", "In the cafeteria", "In the park"], "b"),
        ("How many friends study with Emma after lunch?", ["One", "Two", "Three", "Four"], "b"),
    ]
    for index, (prompt, options, correct) in enumerate(listening_questions, start=1):
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="listening",
                question_type="listening",
                audio_text=listening_transcript if index == 1 else None,
                audio_replay_limit=3 if index == 1 else None,
            )
        )

    reading_title = "Study Group in the Community Center"
    reading_text = (
        "A community center in the city started a free English study group for teenagers and young adults. "
        "The organizers noticed that many learners wanted more speaking practice, but they did not feel confident enough to join large classes.\n\n"
        "To solve that problem, the center opened a small evening program twice a week. Each meeting begins with a short reading task, "
        "continues with pair discussion, and ends with a practical writing activity. Volunteers give quick feedback, but the main goal is to help "
        "learners use English in real situations.\n\n"
        "After three months, most students said they were less afraid of making mistakes. Attendance stayed high because the program was friendly, "
        "low-cost, and close to home. The center now plans to add more beginner groups next season."
    )
    reading_questions = [
        ("Why did the center start the study group?", ["To sell textbooks", "To provide more speaking practice", "To replace all school classes", "To train volunteers only"], "b"),
        ("Why did many learners avoid large classes?", ["They were too expensive", "They lived too far away", "They lacked confidence", "They only wanted grammar"], "c"),
        ("How often does the evening program meet?", ["Every day", "Once a week", "Twice a week", "Only on weekends"], "c"),
        ("What activity comes after the pair discussion?", ["A practical writing activity", "A final exam", "A long lecture", "A sports game"], "a"),
        ("What is the best summary of the final paragraph?", ["The program failed because students stopped coming", "Students became more confident and the center wants to expand", "The center ended the study group after one season", "Volunteers asked all learners to join large classes"], "b"),
    ]
    for prompt, options, correct in reading_questions:
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="reading",
                question_type="reading",
                passage_id="en-weekly-reading-a",
                passage_title=reading_title,
                passage_text=reading_text,
            )
        )

    return questions


def build_chinese_weekly_questions() -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []

    vocabulary_questions = [
        ("Từ '老师' có nghĩa là gì?", ["Giao vien", "Hoc sinh", "Ban be", "Lop hoc"], "a"),
        ("Từ nào có nghĩa là 'thư viện'?", ["学校", "商店", "图书馆", "家"], "c"),
        ("Từ '谢谢' phù hợp với nghĩa nào?", ["Xin loi", "Cam on", "Tam biet", "Vui long"], "b"),
        ("Từ nào mang nghĩa 'hom nay'?", ["明天", "现在", "今天", "昨天"], "c"),
        ("Từ '喝' có nghĩa là gì?", ["An", "Doc", "Uong", "Nghe"], "c"),
    ]
    for prompt, options, correct in vocabulary_questions:
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="vocabulary",
            )
        )

    grammar_questions = [
        ("Chọn câu đúng.", ["你是学生。", "你是学生吗？", "吗你是学生？", "你吗是学生？"], "b"),
        ("Chọn câu phủ định đúng.", ["我老师不是。", "我不是老师。", "不我是老师。", "我是不老师。"], "b"),
        ("Chọn câu có you đúng.", ["桌子上一本书有。", "有桌子上一本书。", "桌子上有一本书。", "桌子一本书上有。"], "c"),
        ("Chọn câu với yao đúng.", ["我们去要明天图书馆。", "我们明天要去图书馆。", "明天我们图书馆要去。", "我们要图书馆去明天。"], "b"),
        ("Chọn câu hỏi với sheme đúng.", ["你想什么吃？", "你什么想吃？", "什么你想吃？", "你想吃什么？"], "d"),
    ]
    for prompt, options, correct in grammar_questions:
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="grammar",
            )
        )

    listening_transcript = (
        "大家好，我叫李文。今天早上我先去学校上课，中午和朋友在食堂吃米饭，"
        "下午我们一起去图书馆学习中文，晚上我回家写作业。"
    )
    listening_questions = [
        ("Người nói tên là gì?", ["王明", "李文", "小红", "老师"], "b"),
        ("Buổi sáng người nói đi đâu trước?", ["去商店", "去图书馆", "去学校", "回家"], "c"),
        ("Buổi trưa người nói ăn gì với bạn?", ["苹果", "米饭", "面包", "茶"], "b"),
        ("Buổi chiều họ làm gì?", ["去图书馆学习中文", "去公园散步", "回家睡觉", "去商店买书"], "a"),
        ("Buổi tối người nói làm gì?", ["看电影", "回家写作业", "去喝茶", "去运动"], "b"),
    ]
    for index, (prompt, options, correct) in enumerate(listening_questions, start=1):
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="listening",
                question_type="listening",
                audio_text=listening_transcript if index == 1 else None,
                audio_replay_limit=3 if index == 1 else None,
            )
        )

    reading_title = "社区中文学习小组"
    reading_text = (
        "一个社区中心为初学者开了免费的中文学习小组。很多学生说，他们想多说中文，"
        "但是在大班里不敢开口，所以这个小组每周开两次，人数不多，气氛也很轻松。\n\n"
        "每次活动先做一个短阅读，然后两个人一组练习问答，最后写两三句和当天主题有关的句子。"
        "志愿者老师会给简单的反馈，帮助大家慢慢建立信心。\n\n"
        "三个月以后，大部分学生都觉得自己进步很明显。他们不但更敢说中文，也更愿意每天自己复习。"
        "社区中心现在准备再增加一个新的初级班。"
    )
    reading_questions = [
        ("Vì sao trung tâm mở nhóm học này?", ["De ban sach", "De nguoi moi co them co hoi noi tieng Trung", "De thay the truong hoc", "De luyen thi dai hoc"], "b"),
        ("Nhóm học gặp mấy lần mỗi tuần?", ["Mot lan", "Hai lan", "Ba lan", "Moi ngay"], "b"),
        ("Sau phần đọc ngắn, học viên làm gì?", ["Lam bai thi", "Nghi giai lao", "Luyen hoi dap theo cap", "Xem video"], "c"),
        ("Sau ba tháng, học viên thay đổi thế nào?", ["It tu tin hon", "Tien bo ro va dam noi hon", "Khong muon tu hoc nua", "Chi muon hoc doc"], "b"),
        ("Trung tâm dự định làm gì tiếp theo?", ["Dong cua nhom hoc", "Giam so nguoi hoc", "Mo them lop so cap moi", "Chi day online"], "c"),
    ]
    for prompt, options, correct in reading_questions:
        questions.append(
            build_question(
                len(questions) + 1,
                prompt=prompt,
                options=options,
                correct_option=correct,
                section="reading",
                question_type="reading",
                passage_id="zh-weekly-reading-a",
                passage_title=reading_title,
                passage_text=reading_text,
            )
        )

    return questions


async def get_languages(session, selected_languages: set[str] | None) -> list[Language]:
    result = await session.execute(select(Language).order_by(Language.code.asc()))
    languages = result.scalars().all()
    if not selected_languages:
        return languages
    return [language for language in languages if language.code in selected_languages]


async def clear_tournaments_for_language(session, language_code: str) -> None:
    tournament_ids = list(
        (
            await session.execute(
                select(Tournament.id).where(Tournament.language_code == language_code)
            )
        ).scalars().all()
    )
    if tournament_ids:
        await session.execute(delete(TournamentAttempt).where(TournamentAttempt.tournament_id.in_(tournament_ids)))
        await session.execute(delete(TournamentRegistration).where(TournamentRegistration.tournament_id.in_(tournament_ids)))
    await session.execute(delete(Tournament).where(Tournament.language_code == language_code))
    await session.flush()


async def seed_dense_english_tournament(session) -> int:
    await clear_tournaments_for_language(session, "en")
    session.add(
        Tournament(
            language_code="en",
            title="English Weekly Arena",
            description="20 mixed questions for weekly ranking across vocabulary, grammar, listening, and reading.",
            duration_minutes=25,
            passing_score=65,
            questions=build_english_weekly_questions(),
            reward_title="English Arena Badge",
            reward_description="Top players earn the weekly arena badge and leaderboard visibility.",
            is_active=True,
            room_status="waiting",
        )
    )
    await session.flush()
    return 1


async def seed_dense_chinese_tournament(session) -> int:
    await clear_tournaments_for_language(session, "zh")
    session.add(
        Tournament(
            language_code="zh",
            title="HSK 1 Weekly Arena",
            description="20 mixed questions for weekly Chinese ranking across vocabulary, grammar, listening, and reading.",
            duration_minutes=25,
            passing_score=65,
            questions=build_chinese_weekly_questions(),
            reward_title="HSK 1 Arena Badge",
            reward_description="Top players earn the weekly Chinese arena badge and leaderboard visibility.",
            is_active=True,
            room_status="waiting",
        )
    )
    await session.flush()
    return 1


async def seed_lightweight_tournament(session, language_code: str) -> int:
    exists = (
        await session.execute(
            select(Tournament).where(
                Tournament.language_code == language_code,
                Tournament.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if exists is not None:
        return 0

    session.add(
        Tournament(
            language_code=language_code,
            title=f"{language_code.upper()} Weekly Arena",
            description="Fallback mixed tournament for testing the weekly ranking flow.",
            duration_minutes=15,
            passing_score=60,
            reward_title="Weekly Arena Badge",
            reward_description="Top players receive a basic ranking badge.",
            questions=[
                build_question(
                    1,
                    prompt="Choose the correct answer.",
                    options=["Option A", "Option B", "Option C", "Option D"],
                    correct_option="a",
                    section="grammar",
                )
            ],
            is_active=True,
            room_status="waiting",
        )
    )
    await session.flush()
    return 1


async def seed(selected_languages: set[str] | None = None) -> None:
    inserted = 0
    await init_db()

    async with AsyncSessionLocal() as session:
        languages = await get_languages(session, selected_languages)
        for language in languages:
            if language.code == "en":
                inserted += await seed_dense_english_tournament(session)
                continue
            if language.code == "zh":
                inserted += await seed_dense_chinese_tournament(session)
                continue
            inserted += await seed_lightweight_tournament(session, language.code)

        await session.commit()

    print(f"Seeded tournaments, inserted {inserted} rows")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Seed only selected languages, for example: en zh")
    args = parser.parse_args()
    selected_languages = set(args.languages) if args.languages else None
    asyncio.run(seed(selected_languages=selected_languages))


if __name__ == "__main__":
    main()
