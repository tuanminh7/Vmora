from __future__ import annotations

import argparse
import asyncio
import random
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal, init_db
from app.models.feature import Exam, ExamQuestion
from app.models.language import Language
from app.models.vocabulary import VocabularyEntry


def compact_text(text: str | None, limit: int = 96) -> str:
    value = " ".join((text or "").split())
    if not value:
        return ""
    return value if len(value) <= limit else f"{value[: limit - 3].rstrip()}..."


def pick_meaning(entry: VocabularyEntry, limit: int = 96) -> str:
    return compact_text(entry.meaning_vi or entry.meaning_en, limit)


def build_sentence(entry: VocabularyEntry, index: int) -> str:
    if entry.example:
        return compact_text(entry.example, 160)

    templates = [
        "I use {word} in class every day.",
        "My teacher asked me to remember {word}.",
        "We practice the word {word} in our lesson.",
        "I want to use {word} more naturally.",
    ]
    return templates[index % len(templates)].format(word=entry.word)


def build_chinese_sentence(entry: VocabularyEntry, index: int) -> str:
    if entry.example:
        return compact_text(entry.example, 160)

    templates = [
        "我今天学习{word}。",
        "老师让我们复习{word}。",
        "我想在句子里用{word}。",
        "我们一起练习{word}。",
    ]
    return templates[index % len(templates)].format(word=entry.word)


ENGLISH_GRAMMAR_EXAM_ITEMS = [
    {
        "prompt": "Choose the correct form: She ___ a student.",
        "options": ["am", "is", "are", "be"],
        "correct": "is",
    },
    {
        "prompt": "Choose the correct form: They ___ from Canada.",
        "options": ["is", "am", "are", "be"],
        "correct": "are",
    },
    {
        "prompt": "Choose the correct article: I have ___ apple in my bag.",
        "options": ["a", "an", "the", "no article"],
        "correct": "an",
    },
    {
        "prompt": "Choose the correct word order: ___ name is Lan.",
        "options": ["I", "My", "Me", "Mine"],
        "correct": "My",
    },
    {
        "prompt": "Choose the correct answer: He ___ to school by bus every day.",
        "options": ["go", "goes", "going", "went"],
        "correct": "goes",
    },
    {
        "prompt": "Choose the correct question helper: ___ you like coffee?",
        "options": ["Do", "Does", "Are", "Is"],
        "correct": "Do",
    },
    {
        "prompt": "Choose the correct preposition: We study ___ the morning.",
        "options": ["on", "at", "in", "for"],
        "correct": "in",
    },
    {
        "prompt": "Choose the correct plural form: two ___.",
        "options": ["child", "childs", "children", "childes"],
        "correct": "children",
    },
    {
        "prompt": "Choose the correct answer: My friends ___ football after class.",
        "options": ["play", "plays", "playing", "played"],
        "correct": "play",
    },
    {
        "prompt": "Choose the correct pronoun: This is Anna. ___ is my classmate.",
        "options": ["He", "She", "It", "They"],
        "correct": "She",
    },
    {
        "prompt": "Choose the correct negative form: We ___ tired today.",
        "options": ["isn't", "aren't", "don't", "doesn't"],
        "correct": "aren't",
    },
    {
        "prompt": "Choose the correct tense: I ___ my homework right now.",
        "options": ["do", "does", "am doing", "did"],
        "correct": "am doing",
    },
    {
        "prompt": "Choose the correct answer: There ___ two books on the desk.",
        "options": ["is", "are", "was", "be"],
        "correct": "are",
    },
    {
        "prompt": "Choose the correct modal: You ___ review the lesson before the quiz.",
        "options": ["should", "shoulds", "are", "do"],
        "correct": "should",
    },
    {
        "prompt": "Choose the correct answer: We are going to ___ a new topic tomorrow.",
        "options": ["learns", "learning", "learn", "learned"],
        "correct": "learn",
    },
    {
        "prompt": "Choose the correct word: My sister is ___ than me.",
        "options": ["tall", "taller", "tallest", "more tall"],
        "correct": "taller",
    },
    {
        "prompt": "Choose the correct answer: ___ there any questions?",
        "options": ["Do", "Does", "Is", "Are"],
        "correct": "Are",
    },
    {
        "prompt": "Choose the correct answer: He ___ English very well.",
        "options": ["speak", "speaks", "speaking", "spoken"],
        "correct": "speaks",
    },
    {
        "prompt": "Choose the correct past form: Yesterday, we ___ a short test.",
        "options": ["take", "takes", "took", "taking"],
        "correct": "took",
    },
    {
        "prompt": "Choose the correct connector: I stayed home ___ it was raining.",
        "options": ["because", "but", "so", "or"],
        "correct": "because",
    },
]


CHINESE_GRAMMAR_EXAM_ITEMS = [
    {"prompt": "Chọn câu hỏi yes/no đúng.", "options": ["你是学生。", "你是学生吗？", "吗你是学生？", "你吗是学生？"], "correct": "你是学生吗？"},
    {"prompt": "Chọn câu phủ định đúng.", "options": ["我不是老师。", "我老师不是。", "不我是老师。", "我是不老师。"], "correct": "我不是老师。"},
    {"prompt": "Chọn câu diễn đạt địa điểm đúng.", "options": ["他今天学校在。", "今天他在学校。", "他在今天学校。", "学校他今天在。"], "correct": "今天他在学校。"},
    {"prompt": "Chọn câu nói về kế hoạch đúng.", "options": ["我们明天要去图书馆。", "我们去要明天图书馆。", "明天我们图书馆要去。", "我们要图书馆去明天。"], "correct": "我们明天要去图书馆。"},
    {"prompt": "Chọn câu đúng với động từ xihuan.", "options": ["我喜欢喝茶。", "我喝喜欢茶。", "喜欢我喝茶。", "我茶喜欢喝。"], "correct": "我喜欢喝茶。"},
    {"prompt": "Chọn câu nói về khả năng đúng.", "options": ["她会说中文。", "她说会中文。", "会她说中文。", "她中文会说。"], "correct": "她会说中文。"},
    {"prompt": "Chọn câu có you đúng.", "options": ["桌子上有一本书。", "桌子上一本书有。", "有桌子上一本书。", "桌子一本书上有。"], "correct": "桌子上有一本书。"},
    {"prompt": "Chọn câu phủ định với you đúng.", "options": ["我不有时间。", "我没有时间。", "我时间没有。", "没有我时间。"], "correct": "我没有时间。"},
    {"prompt": "Chọn câu hỏi tự nhiên nhất.", "options": ["你现在忙吗？", "你忙现在吗？", "吗你现在忙？", "你吗现在忙？"], "correct": "你现在忙吗？"},
    {"prompt": "Chọn câu hỏi với sheme đúng.", "options": ["你想什么吃？", "你什么想吃？", "你想吃什么？", "什么你想吃？"], "correct": "你想吃什么？"},
    {"prompt": "Chọn câu diễn đạt nơi chốn đúng.", "options": ["我在家学习中文。", "我学习在家中文。", "在家我中文学习。", "我中文在家学习。"], "correct": "我在家学习中文。"},
    {"prompt": "Chọn câu có trạng ngữ thời gian đúng.", "options": ["他们一起晚上看书。", "晚上他们一起看书。", "他们看书晚上一起。", "一起他们晚上看书。"], "correct": "晚上他们一起看书。"},
    {"prompt": "Chọn câu đúng với rang.", "options": ["老师让我们读课文。", "老师我们让读课文。", "让老师我们读课文。", "老师读课文让我们。"], "correct": "老师让我们读课文。"},
    {"prompt": "Chọn câu đúng với thời gian quá khứ.", "options": ["我昨天去了商店。", "我去昨天了商店。", "昨天我了去商店。", "我商店昨天去了。"], "correct": "我昨天去了商店。"},
    {"prompt": "Chọn câu hỏi lặp động từ đúng.", "options": ["你会不会写汉字？", "你不会会写汉字？", "会不会你写汉字？", "你写汉字会不会？"], "correct": "你会不会写汉字？"},
    {"prompt": "Chọn câu có trình tự hành động đúng.", "options": ["我们先吃饭，再上课。", "我们再先吃饭上课。", "先我们吃饭，再课上。", "我们吃饭先，再上课。"], "correct": "我们先吃饭，再上课。"},
    {"prompt": "Chọn câu so sánh đúng.", "options": ["妹妹比我小两岁。", "妹妹我比小两岁。", "比妹妹我小两岁。", "妹妹小两岁比我。"], "correct": "妹妹比我小两岁。"},
    {"prompt": "Chọn câu nói không có ai ở nơi nào đúng.", "options": ["教室里没有老师。", "教室里不有老师。", "没有教室里老师。", "老师教室里没有。"], "correct": "教室里没有老师。"},
    {"prompt": "Chọn câu diễn tả hai hành động song song đúng.", "options": ["我一边听，一边写。", "我听一边，写一边。", "一边我听写。", "我一边写听一边。"], "correct": "我一边听，一边写。"},
    {"prompt": "Chọn câu điều kiện đúng.", "options": ["如果你有问题，就问老师。", "如果你问题有，就老师问。", "你如果有问题，问就老师。", "如果有你问题，就问老师。"], "correct": "如果你有问题，就问老师。"},
]


async def get_active_languages(session, selected_languages: set[str] | None) -> list[Language]:
    result = await session.execute(select(Language).order_by(Language.code.asc()))
    languages = result.scalars().all()
    if not selected_languages:
        return languages
    return [language for language in languages if language.code in selected_languages]


async def get_vocabulary_entries(session, language_code: str, limit: int) -> list[VocabularyEntry]:
    result = await session.execute(
        select(VocabularyEntry)
        .where(
            VocabularyEntry.language_code == language_code,
            VocabularyEntry.is_active.is_(True),
        )
        .order_by(VocabularyEntry.id.asc())
    )
    entries = result.scalars().all()

    unique_entries: list[VocabularyEntry] = []
    seen_words: set[str] = set()
    for entry in entries:
        normalized_word = entry.word.strip().casefold()
        if not normalized_word or normalized_word in seen_words:
            continue
        seen_words.add(normalized_word)
        unique_entries.append(entry)
        if len(unique_entries) >= limit:
            break
    return unique_entries


async def clear_exams_for_language(session, language_code: str) -> None:
    exam_ids = list(
        (
            await session.execute(
                select(Exam.id).where(Exam.language_code == language_code)
            )
        ).scalars().all()
    )
    if exam_ids:
        await session.execute(delete(ExamQuestion).where(ExamQuestion.exam_id.in_(exam_ids)))
    await session.execute(delete(Exam).where(Exam.language_code == language_code))
    await session.flush()


def build_vocab_exam_questions(entries: list[VocabularyEntry], *, language_code: str) -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []
    quiz_entries = entries[:10]
    typing_entries = entries[10:20]

    for index, entry in enumerate(quiz_entries, start=1):
        pool = [item for item in entries if item.id != entry.id]
        distractors = pool[:3]
        option_items = [entry, *distractors]
        random.shuffle(option_items)
        options = [
            {
                "id": f"{language_code}-vocab-q{index}-{option_index + 1}",
                "text": pick_meaning(option_item),
            }
            for option_index, option_item in enumerate(option_items)
        ]
        correct_option_id = next(option["id"] for option, option_item in zip(options, option_items, strict=False) if option_item.id == entry.id)
        prompt = (
            f"Chọn nghĩa đúng của từ '{entry.word}'."
            if language_code == "zh"
            else f"Choose the correct meaning of '{entry.word}'."
        )
        questions.append(
            {
                "question_type": "quiz",
                "prompt": prompt,
                "payload": {"options": options},
                "correct_answer": correct_option_id,
                "points": 1,
                "order_index": index,
            }
        )

    for offset, entry in enumerate(typing_entries, start=1):
        order_index = len(quiz_entries) + offset
        meaning = pick_meaning(entry, 120)
        accepted_answers = {entry.word, entry.word.casefold()}
        if entry.reading:
            accepted_answers.add(entry.reading)
        prompt = (
            f"Nhập từ tiếng Trung phù hợp với nghĩa này: {meaning}"
            if language_code == "zh"
            else f"Type the English word that matches this meaning: {meaning}"
        )
        example_text = build_chinese_sentence(entry, order_index - 1) if language_code == "zh" else build_sentence(entry, order_index - 1)
        questions.append(
            {
                "question_type": "typing",
                "prompt": prompt,
                "payload": {
                    "display_answer": entry.word,
                    "example": example_text,
                },
                "correct_answer": sorted(accepted_answers),
                "points": 1,
                "order_index": order_index,
            }
        )

    return questions


def build_grammar_exam_questions(items: list[dict[str, object]], *, language_code: str) -> list[dict[str, object]]:
    questions: list[dict[str, object]] = []
    for index, item in enumerate(items, start=1):
        options = [
            {
                "id": f"{language_code}-grammar-q{index}-{option_index + 1}",
                "text": option,
            }
            for option_index, option in enumerate(item["options"])
        ]
        correct_option_id = next(option["id"] for option in options if option["text"] == item["correct"])
        questions.append(
            {
                "question_type": "quiz",
                "prompt": str(item["prompt"]),
                "payload": {"options": options},
                "correct_answer": correct_option_id,
                "points": 1,
                "order_index": index,
            }
        )
    return questions


async def insert_exam(
    session,
    *,
    language_code: str,
    title: str,
    description: str,
    level_code: str,
    duration_minutes: int,
    passing_score: int,
    questions: list[dict[str, object]],
) -> None:
    exam = Exam(
        language_code=language_code,
        title=title,
        description=description,
        level_code=level_code,
        duration_minutes=duration_minutes,
        passing_score=passing_score,
        is_active=True,
    )
    session.add(exam)
    await session.flush()

    for question in questions:
        session.add(
            ExamQuestion(
                exam_id=exam.id,
                question_type=str(question["question_type"]),
                prompt=str(question["prompt"]),
                payload=dict(question["payload"]),
                correct_answer=question["correct_answer"],
                points=int(question["points"]),
                order_index=int(question["order_index"]),
            )
        )


async def seed_dense_english_exams(session) -> int:
    entries = await get_vocabulary_entries(session, "en", limit=24)
    if len(entries) < 20:
        return 0

    await clear_exams_for_language(session, "en")

    vocab_questions = build_vocab_exam_questions(entries[:20], language_code="en")
    grammar_questions = build_grammar_exam_questions(ENGLISH_GRAMMAR_EXAM_ITEMS, language_code="en")

    await insert_exam(
        session,
        language_code="en",
        title="English Placement A1 - Core Vocabulary",
        description="20 questions for quick vocabulary placement and recall.",
        level_code="A1",
        duration_minutes=18,
        passing_score=65,
        questions=vocab_questions,
    )
    await insert_exam(
        session,
        language_code="en",
        title="English Placement A2 - Grammar and Usage",
        description="20 grammar questions covering sentence structure and everyday usage.",
        level_code="A2",
        duration_minutes=20,
        passing_score=70,
        questions=grammar_questions,
    )
    return 2


async def seed_dense_chinese_exams(session) -> int:
    entries = await get_vocabulary_entries(session, "zh", limit=24)
    if len(entries) < 20:
        return 0

    await clear_exams_for_language(session, "zh")

    vocab_questions = build_vocab_exam_questions(entries[:20], language_code="zh")
    grammar_questions = build_grammar_exam_questions(CHINESE_GRAMMAR_EXAM_ITEMS, language_code="zh")

    await insert_exam(
        session,
        language_code="zh",
        title="HSK 1 Placement - Tu vung co ban",
        description="20 cau hoi tu vung de kiem tra kha nang nhan dien va go lai tieng Trung co ban.",
        level_code="HSK1-A",
        duration_minutes=18,
        passing_score=65,
        questions=vocab_questions,
    )
    await insert_exam(
        session,
        language_code="zh",
        title="HSK 1 Placement - Ngu phap nen tang",
        description="20 cau hoi ngu phap ve ma, bu, you, zai, yao va cau truc co ban.",
        level_code="HSK1-B",
        duration_minutes=20,
        passing_score=70,
        questions=grammar_questions,
    )
    return 2


async def seed_lightweight_exam(session, language: Language) -> int:
    exists = (
        await session.execute(
            select(Exam).where(
                Exam.language_code == language.code,
                Exam.title.like("%MVP%"),
            )
        )
    ).scalar_one_or_none()
    if exists is not None:
        return 0

    vocabulary = await get_vocabulary_entries(session, language.code, limit=4)
    if len(vocabulary) < 3:
        return 0

    exam = Exam(
        language_code=language.code,
        title=f"MVP Exam - {language.name}",
        description="Small fallback exam for testing the exam flow.",
        level_code="Core",
        duration_minutes=15,
        passing_score=60,
        is_active=True,
    )
    session.add(exam)
    await session.flush()

    correct_word = vocabulary[0]
    distractors = vocabulary[1:4]
    session.add(
        ExamQuestion(
            exam_id=exam.id,
            question_type="quiz",
            prompt=f"Choose the correct meaning of '{correct_word.word}'.",
            payload={
                "options": [
                    {"id": "a", "text": pick_meaning(correct_word)},
                    {"id": "b", "text": pick_meaning(distractors[0])},
                    {"id": "c", "text": pick_meaning(distractors[1])},
                ]
            },
            correct_answer="a",
            points=1,
            order_index=1,
        )
    )
    session.add(
        ExamQuestion(
            exam_id=exam.id,
            question_type="typing",
            prompt=f"Type the word that matches this meaning: {pick_meaning(distractors[0])}",
            payload={},
            correct_answer=[distractors[0].word, distractors[0].word.casefold()],
            points=1,
            order_index=2,
        )
    )
    session.add(
        ExamQuestion(
            exam_id=exam.id,
            question_type="quiz",
            prompt=f"Choose the correct word for this meaning: {pick_meaning(distractors[1])}",
            payload={
                "options": [
                    {"id": "a", "text": correct_word.word},
                    {"id": "b", "text": distractors[1].word},
                    {"id": "c", "text": distractors[2].word},
                ]
            },
            correct_answer="b",
            points=1,
            order_index=3,
        )
    )
    return 1


async def seed(selected_languages: set[str] | None = None) -> None:
    inserted = 0
    await init_db()

    async with AsyncSessionLocal() as session:
        languages = await get_active_languages(session, selected_languages)
        for language in languages:
            if language.code == "en":
                inserted += await seed_dense_english_exams(session)
                continue
            if language.code == "zh":
                inserted += await seed_dense_chinese_exams(session)
                continue
            inserted += await seed_lightweight_exam(session, language)

        await session.commit()

    print(f"Seeded exam content, inserted {inserted} exams")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Seed only selected languages, for example: en zh")
    args = parser.parse_args()
    selected_languages = set(args.languages) if args.languages else None
    asyncio.run(seed(selected_languages=selected_languages))


if __name__ == "__main__":
    main()
