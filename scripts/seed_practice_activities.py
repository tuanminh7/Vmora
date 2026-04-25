from __future__ import annotations

import argparse
import asyncio
import random
import sys
from pathlib import Path
from urllib.parse import quote

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal, init_db
from app.models.course import Course, CourseSection, Lesson
from app.models.language import Language
from app.models.practice import PracticeActivity
from app.models.vocabulary import VocabularyEntry


VIDEO_URL = "https://youtu.be/voypO0L4knM?si=QjFtNdx1jAfEr4mL&t=1"
AUDIO_URL = "/audio/vmora-practice-audio.wav"
PAID_PACKAGE_SLUGS = {
    "en": "giao-tiep-anh",
    "ja": "nhat-n5",
    "ko": "han-topik1",
    "zh": "trung-hsk1",
    "de": "duc-a1",
}


def short_text(value: str | None, limit: int = 96) -> str:
    text = " ".join((value or "").split())
    if not text:
        return ""
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3].rstrip()}..."


def pick_meaning(entry: VocabularyEntry, limit: int = 140) -> str:
    return short_text(entry.meaning_vi or entry.meaning_en, limit)


def build_sentence(entry: VocabularyEntry, index: int) -> str:
    if entry.example:
        return " ".join(entry.example.split())

    templates = [
        "I use {word} in class every day.",
        "My teacher asked me to remember {word}.",
        "We practice the word {word} in our lesson.",
        "I want to use {word} more naturally.",
    ]
    return templates[index % len(templates)].format(word=entry.word)


def build_chinese_sentence(entry: VocabularyEntry, index: int) -> str:
    if entry.example:
        return "".join(entry.example.split())

    templates = [
        "我今天学习{word}。",
        "老师让我们复习{word}。",
        "我想在句子里用{word}。",
        "我们一起练习{word}。",
    ]
    return templates[index % len(templates)].format(word=entry.word)


def build_hint_chunks(text: str, max_chunks: int = 4) -> list[str]:
    tokens = [token.strip(" ,.!?;:") for token in text.split() if token.strip(" ,.!?;:")]
    if not tokens:
        return []
    if len(tokens) <= max_chunks:
        return tokens

    hints: list[str] = []
    chunk_size = max(1, round(len(tokens) / max_chunks))
    for start in range(0, len(tokens), chunk_size):
        chunk = " ".join(tokens[start : start + chunk_size]).strip()
        if chunk:
            hints.append(chunk)
        if len(hints) >= max_chunks:
            break
    return hints


def build_character_hints(text: str, max_chunks: int = 4) -> list[str]:
    chars = [char for char in text if char.strip() and char not in "，。！？；：,.!?;:"]
    if not chars:
        return []
    if len(chars) <= max_chunks:
        return chars

    hints: list[str] = []
    chunk_size = max(1, round(len(chars) / max_chunks))
    for start in range(0, len(chars), chunk_size):
        chunk = "".join(chars[start : start + chunk_size]).strip()
        if chunk:
            hints.append(chunk)
        if len(hints) >= max_chunks:
            break
    return hints


def ensure_minimum_items(items: list[VocabularyEntry], minimum: int) -> list[VocabularyEntry]:
    if not items:
        return []

    expanded = list(items)
    index = 0
    while len(expanded) < minimum:
        expanded.append(items[index % len(items)])
        index += 1
    return expanded


def image_data_url(label: str, accent: str) -> str:
    svg = f"""
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff7ef" />
      <stop offset="100%" stop-color="{accent}" />
    </linearGradient>
  </defs>
  <rect width="640" height="420" rx="36" fill="url(#bg)" />
  <circle cx="170" cy="160" r="92" fill="rgba(255,255,255,0.72)" />
  <circle cx="470" cy="270" r="120" fill="rgba(255,255,255,0.4)" />
  <rect x="120" y="104" width="400" height="200" rx="28" fill="#fffdf8" opacity="0.9" />
  <text x="320" y="178" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="28" fill="#704629">Goi y hinh anh</text>
  <text x="320" y="238" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#27352c">{label}</text>
  <text x="320" y="292" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="20" fill="#50635a">Placeholder de thay bang hinh that sau nay</text>
</svg>
""".strip()
    return f"data:image/svg+xml;utf8,{quote(svg)}"


async def get_first_lesson_id(session, language_code: str) -> int | None:
    result = await session.execute(
        select(Lesson.id)
        .join(CourseSection, CourseSection.id == Lesson.section_id)
        .join(Course, Course.id == CourseSection.course_id)
        .where(Course.language_code == language_code)
        .order_by(Course.order_index.asc(), CourseSection.order_index.asc(), Lesson.order_index.asc(), Lesson.id.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_candidates(session, language_code: str, limit: int = 64) -> list[VocabularyEntry]:
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
        if normalized_word in seen_words or not entry.meaning_en:
            continue
        seen_words.add(normalized_word)
        unique_entries.append(entry)
        if len(unique_entries) >= limit:
            break

    return unique_entries


async def upsert_activity(
    session,
    *,
    language_code: str,
    code: str,
    activity_type: str,
    title: str,
    description: str,
    prompt: str,
    payload: dict,
    order_index: int,
    lesson_id: int | None,
    is_free: bool,
) -> bool:
    result = await session.execute(
        select(PracticeActivity).where(
            PracticeActivity.language_code == language_code,
            PracticeActivity.code == code,
        )
    )
    activity = result.scalar_one_or_none()

    if activity is None:
        activity = PracticeActivity(
            language_code=language_code,
            lesson_id=lesson_id,
            code=code,
            activity_type=activity_type,
            title=title,
            description=description,
            prompt=prompt,
            payload=payload,
            order_index=order_index,
            is_free=is_free,
            is_active=True,
        )
        session.add(activity)
        await session.flush()
        return True

    activity.lesson_id = lesson_id
    activity.activity_type = activity_type
    activity.title = title
    activity.description = description
    activity.prompt = prompt
    activity.payload = payload
    activity.order_index = order_index
    activity.is_free = is_free
    activity.is_active = True
    await session.flush()
    return False


def paid_package_code(language_code: str) -> str:
    return f"{language_code}-{PAID_PACKAGE_SLUGS.get(language_code, 'paid')}"


def build_base_activities(language_code: str, items: list[VocabularyEntry]) -> list[dict]:
    accent_map = {
        "en": "#f1d6b8",
        "ja": "#ffd7d2",
        "ko": "#d7e6ff",
        "zh": "#fde8b2",
        "de": "#dae7cb",
    }
    accent = accent_map.get(language_code, "#f1d6b8")

    flashcard = items[0]
    quiz_word = items[1]
    image_word = items[2]
    typing_word = items[3]
    voice_word = items[4]
    matching_words = items[:4]
    distractors = items[4:8] if len(items) >= 8 else items[:4]

    quiz_options = [
        {"id": f"quiz-{index}", "text": short_text(entry.meaning_en, 96)}
        for index, entry in enumerate([quiz_word, *distractors[:3]], start=1)
    ]
    random.shuffle(quiz_options)
    quiz_correct_option = next(option["id"] for option in quiz_options if option["text"] == short_text(quiz_word.meaning_en, 96))

    daily_word = items[5]
    daily_quiz_word = items[6]
    premium_quiz_word = items[7]

    daily_quiz_options = [
        {"id": f"daily-{index}", "text": short_text(entry.meaning_en, 96)}
        for index, entry in enumerate([daily_quiz_word, items[4], items[5], items[7]], start=1)
    ]
    random.shuffle(daily_quiz_options)
    daily_quiz_correct_option = next(
        option["id"] for option in daily_quiz_options if option["text"] == short_text(daily_quiz_word.meaning_en, 96)
    )

    premium_quiz_options = [
        {"id": f"premium-{index}", "text": entry.word}
        for index, entry in enumerate([premium_quiz_word, items[1], items[2], items[6]], start=1)
    ]
    random.shuffle(premium_quiz_options)
    premium_quiz_correct_option = next(option["id"] for option in premium_quiz_options if option["text"] == premium_quiz_word.word)

    image_options = [{"id": f"image-{index}", "text": entry.word} for index, entry in enumerate(items[2:6], start=1)]
    random.shuffle(image_options)
    image_correct_option = next(option["id"] for option in image_options if option["text"] == image_word.word)

    right_items = [
        {"id": f"right-{index}", "text": short_text(entry.meaning_en, 88)}
        for index, entry in enumerate(matching_words, start=1)
    ]
    random.shuffle(right_items)
    correct_pairs = {}
    left_items = []
    for index, entry in enumerate(matching_words, start=1):
        left_id = f"left-{index}"
        right_id = next(item["id"] for item in right_items if item["text"] == short_text(entry.meaning_en, 88))
        correct_pairs[left_id] = right_id
        left_items.append({"id": left_id, "text": entry.word})

    grammar_options = [
        {"id": "grammar-a", "text": "Cau dung mau nguyen ven."},
        {"id": "grammar-b", "text": "Dao vi tri tu mot cach ngau nhien."},
        {"id": "grammar-c", "text": "Bo het nghia trong cau."},
    ]

    premium_payload = {"package_codes": [paid_package_code(language_code)]}

    return [
        {
            "code": "flashcard-core",
            "activity_type": "flashcard",
            "title": "Flashcard",
            "description": "Lat the de nho tu va nghia nhanh.",
            "prompt": f"Xem mat truoc va mat sau cua tu {flashcard.word}.",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Nen tang giao tiep",
                "front_word": flashcard.word,
                "reading": flashcard.reading,
                "back_meaning": short_text(flashcard.meaning_en, 140),
                "example": short_text(flashcard.example, 140),
            },
            "order_index": 1,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "quiz-four-options",
            "activity_type": "quiz",
            "title": "Trac nghiem 4 dap an",
            "description": "Chon nghia dung cua tu dang hoc.",
            "prompt": f"Tu nao co nghia dung cho '{quiz_word.word}'?",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Nen tang giao tiep",
                "question_word": quiz_word.word,
                "options": quiz_options,
                "correct_option_id": quiz_correct_option,
            },
            "order_index": 2,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "matching-pairs",
            "activity_type": "matching",
            "title": "Noi cap",
            "description": "Noi tu voi nghia phu hop.",
            "prompt": "Ghep moi tu ben trai voi nghia dung ben phai.",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Nen tang giao tiep",
                "left_items": left_items,
                "right_items": right_items,
                "correct_pairs": correct_pairs,
            },
            "order_index": 3,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "flashcard-daily",
            "activity_type": "flashcard",
            "title": "Flashcard sinh hoat",
            "description": "On nhanh tu vung theo chu de sinh hoat hang ngay.",
            "prompt": f"Xem mat truoc va mat sau cua tu {daily_word.word}.",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Sinh hoat hang ngay",
                "front_word": daily_word.word,
                "reading": daily_word.reading,
                "back_meaning": short_text(daily_word.meaning_en, 140),
                "example": short_text(daily_word.example, 140),
            },
            "order_index": 4,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "quiz-daily-topic",
            "activity_type": "quiz",
            "title": "Trac nghiem chu de",
            "description": "Chon nghia dung trong chu de sinh hoat hang ngay.",
            "prompt": f"Tu nao co nghia dung cho '{daily_quiz_word.word}'?",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Sinh hoat hang ngay",
                "question_word": daily_quiz_word.word,
                "options": daily_quiz_options,
                "correct_option_id": daily_quiz_correct_option,
            },
            "order_index": 5,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "typing-meaning",
            "activity_type": "typing",
            "title": "Nhap tu theo nghia",
            "description": "Nhap dung tu dua theo nghia goi y.",
            "prompt": f"Nhap tu phu hop voi nghia: {short_text(typing_word.meaning_en, 120)}",
            "payload": {
                "practice_skill": "writing",
                "accepted_answers": [typing_word.word, typing_word.word.casefold()],
                "display_answer": typing_word.word,
            },
            "order_index": 6,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "audio-listen",
            "activity_type": "audio",
            "title": "Nghe audio",
            "description": "Nghe file audio local de test player va nhap lai cau nghe duoc.",
            "prompt": "Nghe audio mau va nhap lai cau ban nghe duoc.",
            "payload": {
                "practice_skill": "listening",
                "audio_url": AUDIO_URL,
                "accepted_answers": ["practice audio", "vmora practice audio"],
                "display_answer": "practice audio",
            },
            "order_index": 7,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "voice-ai",
            "activity_type": "voice",
            "title": "Luyen noi",
            "description": "Noi to tu dang hoc, neu trinh duyet khong ho tro thi nhap tay.",
            "prompt": f"Noi hoac nhap lai tu: {voice_word.word}",
            "payload": {
                "practice_skill": "speaking",
                "target_text": voice_word.word,
                "reading": voice_word.reading,
                "accepted_answers": [voice_word.word, voice_word.word.casefold()],
                "display_answer": voice_word.word,
            },
            "order_index": 8,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "grammar-core",
            "activity_type": "quiz",
            "title": "Ngu phap co ban",
            "description": "Chon cach dung cau phu hop de on ngu phap co ban.",
            "prompt": f"Chon cach dat cau dung voi tu '{items[5].word}'.",
            "payload": {
                "practice_skill": "grammar",
                "options": grammar_options,
                "correct_option_id": "grammar-a",
            },
            "order_index": 9,
            "is_free": True,
            "lesson_id": None,
        },
        {
            "code": "image-guess",
            "activity_type": "image",
            "title": "Doan tu qua hinh",
            "description": "Dung hinh de mo rong luyen tu vung cho goi mua.",
            "prompt": "Nhin hinh va chon tu dung.",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Hinh anh mo rong",
                **premium_payload,
                "image_url": image_data_url(image_word.word, accent),
                "options": image_options,
                "correct_option_id": image_correct_option,
            },
            "order_index": 10,
            "is_free": False,
            "lesson_id": None,
        },
        {
            "code": "premium-context-quiz",
            "activity_type": "quiz",
            "title": "Tu vung tinh huong",
            "description": "Lam bai tu vung nang cao theo tinh huong thuc te.",
            "prompt": f"Chon tu dung cho tinh huong voi '{premium_quiz_word.word}'.",
            "payload": {
                "practice_skill": "vocabulary",
                "topic": "Tinh huong nang cao",
                **premium_payload,
                "question_word": premium_quiz_word.word,
                "options": premium_quiz_options,
                "correct_option_id": premium_quiz_correct_option,
            },
            "order_index": 11,
            "is_free": False,
            "lesson_id": None,
        },
        {
            "code": "video-short",
            "activity_type": "video",
            "title": "Xem video ngan",
            "description": "Mo video va danh dau da xem xong.",
            "prompt": "Xem video mau roi bam hoan thanh.",
            "payload": {
                "practice_skill": "listening",
                **premium_payload,
                "video_url": VIDEO_URL,
                "note": "Sau nay co the thay bang video bai giang that.",
            },
            "order_index": 12,
            "is_free": False,
            "lesson_id": None,
        },
        {
            "code": "mixed-review",
            "activity_type": "mixed",
            "title": "On luyen tong hop",
            "description": "Gom nhieu dang bai trong mot man.",
            "prompt": "Lam nhanh 3 cau tong hop de on tap.",
            "payload": {
                "practice_skill": "grammar",
                **premium_payload,
                "questions": [
                    {
                        "id": "mixed-1",
                        "type": "quiz",
                        "prompt": f"Chon nghia dung cua '{flashcard.word}'",
                        "options": [
                            {"id": "m1-a", "text": short_text(flashcard.meaning_en, 80)},
                            {"id": "m1-b", "text": short_text(items[1].meaning_en, 80)},
                            {"id": "m1-c", "text": short_text(items[2].meaning_en, 80)},
                        ],
                        "correct_option_id": "m1-a",
                        "display_answer": short_text(flashcard.meaning_en, 80),
                    },
                    {
                        "id": "mixed-2",
                        "type": "typing",
                        "prompt": f"Nhap tu co nghia: {short_text(items[2].meaning_en, 88)}",
                        "accepted_answers": [items[2].word, items[2].word.casefold()],
                        "display_answer": items[2].word,
                    },
                    {
                        "id": "mixed-3",
                        "type": "image",
                        "prompt": "Nhin hinh placeholder va chon tu dung.",
                        "options": [
                            {"id": "m3-a", "text": items[1].word},
                            {"id": "m3-b", "text": items[3].word},
                            {"id": "m3-c", "text": items[4].word},
                        ],
                        "correct_option_id": "m3-b",
                        "display_answer": items[3].word,
                        "image_url": image_data_url(items[3].word, accent),
                    },
                ],
            },
            "order_index": 13,
            "is_free": False,
            "lesson_id": None,
        },
    ]


ENGLISH_GRAMMAR_QUESTIONS = [
    {
        "sentence": "She ___ a teacher.",
        "prompt": "Choose the correct form of to be.",
        "options": ["am", "is", "are", "be"],
        "correct": "is",
        "difficulty": "Co ban",
        "rule": "Use is with he, she, it.",
        "explanation": "She always goes with is in the present simple form of to be.",
    },
    {
        "sentence": "They ___ at home now.",
        "prompt": "Choose the correct form of to be.",
        "options": ["am", "is", "are", "be"],
        "correct": "are",
        "difficulty": "Co ban",
        "rule": "Use are with plural subjects.",
        "explanation": "They is a plural subject, so the correct answer is are.",
    },
    {
        "sentence": "I ___ ready for the lesson.",
        "prompt": "Choose the correct form of to be.",
        "options": ["am", "is", "are", "be"],
        "correct": "am",
        "difficulty": "Co ban",
        "rule": "Use am with I.",
        "explanation": "I only goes with am.",
    },
    {
        "sentence": "___ she like coffee?",
        "prompt": "Choose the correct helper.",
        "options": ["Do", "Does", "Is", "Are"],
        "correct": "Does",
        "difficulty": "Co ban",
        "rule": "Use does for he, she, it in present simple questions.",
        "explanation": "She takes does in present simple questions.",
    },
    {
        "sentence": "___ they study English every day?",
        "prompt": "Choose the correct helper.",
        "options": ["Do", "Does", "Is", "Has"],
        "correct": "Do",
        "difficulty": "Co ban",
        "rule": "Use do for I, you, we, they.",
        "explanation": "They takes do in present simple questions.",
    },
    {
        "sentence": "He ___ not work on Sunday.",
        "prompt": "Choose the correct negative helper.",
        "options": ["do", "does", "is", "are"],
        "correct": "does",
        "difficulty": "Co ban",
        "rule": "Use does not with he, she, it.",
        "explanation": "He does not work is the correct negative form.",
    },
    {
        "sentence": "We ___ English after dinner.",
        "prompt": "Choose the correct main verb form.",
        "options": ["study", "studies", "studying", "studied"],
        "correct": "study",
        "difficulty": "Co ban",
        "rule": "Use the base verb with we in present simple.",
        "explanation": "We study is the correct present simple pattern.",
    },
    {
        "sentence": "My brother ___ to school by bus.",
        "prompt": "Choose the correct main verb form.",
        "options": ["go", "goes", "going", "gone"],
        "correct": "goes",
        "difficulty": "Co ban",
        "rule": "Add -es with he, she, it when needed.",
        "explanation": "Brother is third-person singular, so we use goes.",
    },
    {
        "sentence": "There ___ two books on the table.",
        "prompt": "Choose the correct form of to be.",
        "options": ["is", "are", "was", "be"],
        "correct": "are",
        "difficulty": "Trung cap",
        "rule": "Use are with plural nouns.",
        "explanation": "Two books is plural, so there are is correct.",
    },
    {
        "sentence": "The cat is ___ the chair.",
        "prompt": "Choose the correct preposition.",
        "options": ["in", "on", "at", "by"],
        "correct": "on",
        "difficulty": "Co ban",
        "rule": "Use on for a surface.",
        "explanation": "A cat placed on a chair uses the preposition on.",
    },
    {
        "sentence": "Our class starts ___ 7:30.",
        "prompt": "Choose the correct preposition.",
        "options": ["in", "on", "at", "for"],
        "correct": "at",
        "difficulty": "Co ban",
        "rule": "Use at for clock times.",
        "explanation": "Specific times use the preposition at.",
    },
    {
        "sentence": "I usually study ___ the evening.",
        "prompt": "Choose the correct preposition.",
        "options": ["in", "on", "at", "to"],
        "correct": "in",
        "difficulty": "Co ban",
        "rule": "Use in with parts of the day except night.",
        "explanation": "We say in the evening.",
    },
    {
        "sentence": "She is going to ___ her friend tomorrow.",
        "prompt": "Choose the correct verb after going to.",
        "options": ["visits", "visit", "visited", "visiting"],
        "correct": "visit",
        "difficulty": "Trung cap",
        "rule": "Use the base verb after be going to.",
        "explanation": "Be going to is followed by the base verb.",
    },
    {
        "sentence": "They are going to ___ a movie tonight.",
        "prompt": "Choose the correct verb after going to.",
        "options": ["watch", "watches", "watched", "watching"],
        "correct": "watch",
        "difficulty": "Trung cap",
        "rule": "Use the base verb after be going to.",
        "explanation": "The structure is are going to watch.",
    },
    {
        "sentence": "___ you going to cook dinner tonight?",
        "prompt": "Choose the correct form of to be.",
        "options": ["Am", "Is", "Are", "Do"],
        "correct": "Are",
        "difficulty": "Trung cap",
        "rule": "Use are with you in the be going to structure.",
        "explanation": "You goes with are in this future plan structure.",
    },
    {
        "sentence": "If I practice every day, I ___ improve faster.",
        "prompt": "Choose the correct future helper.",
        "options": ["am", "will", "do", "have"],
        "correct": "will",
        "difficulty": "Nang cao",
        "rule": "First conditional uses will in the main clause.",
        "explanation": "If + present simple, will + base verb is the correct pattern.",
    },
    {
        "sentence": "We ___ finish the homework before class.",
        "prompt": "Choose the correct modal verb.",
        "options": ["can", "should", "are", "does"],
        "correct": "should",
        "difficulty": "Trung cap",
        "rule": "Use should for advice.",
        "explanation": "Should expresses advice or recommendation.",
    },
    {
        "sentence": "He can ___ English very clearly.",
        "prompt": "Choose the correct verb after can.",
        "options": ["speaks", "speak", "spoke", "speaking"],
        "correct": "speak",
        "difficulty": "Co ban",
        "rule": "Use the base verb after can.",
        "explanation": "Modal verbs are followed by the base verb.",
    },
    {
        "sentence": "The students ___ in the room right now.",
        "prompt": "Choose the correct verb phrase.",
        "options": ["study", "studies", "are studying", "is studying"],
        "correct": "are studying",
        "difficulty": "Trung cap",
        "rule": "Use present continuous for actions happening now.",
        "explanation": "Right now signals present continuous, and students is plural.",
    },
    {
        "sentence": "My mother ___ breakfast at 6 a.m. every day.",
        "prompt": "Choose the correct main verb form.",
        "options": ["cook", "cooks", "cooking", "cooked"],
        "correct": "cooks",
        "difficulty": "Co ban",
        "rule": "Use the -s form with third-person singular in present simple.",
        "explanation": "My mother is third-person singular, so the correct answer is cooks.",
    },
]


CHINESE_GRAMMAR_QUESTIONS = [
    {
        "sentence": "你是学生吗？",
        "prompt": "Chọn câu hỏi yes/no đúng.",
        "options": ["你是学生。", "你是学生吗？", "吗你是学生？", "你吗是学生？"],
        "correct": "你是学生吗？",
        "difficulty": "Co ban",
        "rule": "Thêm ma ở cuối câu trần thuật để tạo câu hỏi yes/no.",
        "explanation": "Cấu trúc đúng là ni shi xue sheng ma.",
    },
    {
        "sentence": "我不是老师。",
        "prompt": "Chọn câu phủ định đúng.",
        "options": ["我不是老师。", "我老师不是。", "不我是老师。", "我是不老师。"],
        "correct": "我不是老师。",
        "difficulty": "Co ban",
        "rule": "Bu đặt trước động từ hoặc tính từ để phủ định.",
        "explanation": "Trong câu này, bu đứng trước shi.",
    },
    {
        "sentence": "他今天在学校。",
        "prompt": "Chọn câu diễn đạt địa điểm đúng.",
        "options": ["他今天学校在。", "今天他在学校。", "他在今天学校。", "学校他今天在。"],
        "correct": "今天他在学校。",
        "difficulty": "Co ban",
        "rule": "Trạng ngữ thời gian thường đứng trước động từ.",
        "explanation": "Hôm nay đặt trước chủ ngữ hoặc ngay sau chủ ngữ đều tự nhiên, nhưng đáp án mẫu đúng là 今天他在学校。",
    },
    {
        "sentence": "我们明天要去图书馆。",
        "prompt": "Chọn câu nói về kế hoạch đúng.",
        "options": ["我们明天要去图书馆。", "我们去要明天图书馆。", "明天我们图书馆要去。", "我们要图书馆去明天。"],
        "correct": "我们明天要去图书馆。",
        "difficulty": "Trung cap",
        "rule": "Yao đứng trước động từ chính để diễn tả dự định.",
        "explanation": "Cấu trúc đúng là chủ ngữ + thời gian + yao + động từ + tân ngữ.",
    },
    {
        "sentence": "我喜欢喝茶。",
        "prompt": "Chọn câu đúng với động từ xihuan.",
        "options": ["我喜欢喝茶。", "我喝喜欢茶。", "喜欢我喝茶。", "我茶喜欢喝。"],
        "correct": "我喜欢喝茶。",
        "difficulty": "Co ban",
        "rule": "Xihuan đứng trước cụm động từ hoặc danh từ mình thích.",
        "explanation": "Ở đây xihuan đứng trước hành động he cha.",
    },
    {
        "sentence": "她会说中文。",
        "prompt": "Chọn câu nói về khả năng đúng.",
        "options": ["她会说中文。", "她说会中文。", "会她说中文。", "她中文会说。"],
        "correct": "她会说中文。",
        "difficulty": "Co ban",
        "rule": "Hui đặt trước động từ để diễn tả khả năng.",
        "explanation": "Hui đứng trước shuo trong cấu trúc chuẩn.",
    },
    {
        "sentence": "桌子上有一本书。",
        "prompt": "Chọn câu có you đúng.",
        "options": ["桌子上有一本书。", "桌子上一本书有。", "有桌子上一本书。", "桌子一本书上有。"],
        "correct": "桌子上有一本书。",
        "difficulty": "Trung cap",
        "rule": "You dùng để diễn tả sự tồn tại của sự vật.",
        "explanation": "Cấu trúc đúng là địa điểm + you + danh từ.",
    },
    {
        "sentence": "我没有时间。",
        "prompt": "Chọn câu phủ định với you đúng.",
        "options": ["我不有时间。", "我没有时间。", "我时间没有。", "没有我时间。"],
        "correct": "我没有时间。",
        "difficulty": "Co ban",
        "rule": "Phủ định của you là meiyou.",
        "explanation": "Không dùng bu với you trong trường hợp sở hữu.",
    },
    {
        "sentence": "你现在忙吗？",
        "prompt": "Chọn câu hỏi tự nhiên nhất.",
        "options": ["你现在忙吗？", "你忙现在吗？", "吗你现在忙？", "你吗现在忙？"],
        "correct": "你现在忙吗？",
        "difficulty": "Co ban",
        "rule": "Câu hỏi yes/no giữ nguyên trật tự câu trần thuật rồi thêm ma.",
        "explanation": "Đáp án giữ đúng thứ tự chủ ngữ + thời gian + tính từ + ma.",
    },
    {
        "sentence": "你想吃什么？",
        "prompt": "Chọn câu hỏi với sheme đúng.",
        "options": ["你想什么吃？", "你什么想吃？", "你想吃什么？", "什么你想吃？"],
        "correct": "你想吃什么？",
        "difficulty": "Co ban",
        "rule": "Từ để hỏi đứng ở vị trí của thành phần cần hỏi.",
        "explanation": "Sheme đứng ở vị trí tân ngữ của động từ chi.",
    },
    {
        "sentence": "我在家学习中文。",
        "prompt": "Chọn câu diễn đạt nơi chốn đúng.",
        "options": ["我在家学习中文。", "我学习在家中文。", "在家我中文学习。", "我中文在家学习。"],
        "correct": "我在家学习中文。",
        "difficulty": "Trung cap",
        "rule": "Cụm nơi chốn với zai đứng trước động từ chính.",
        "explanation": "Zai jia đặt trước hành động xuexi.",
    },
    {
        "sentence": "他们晚上一起看书。",
        "prompt": "Chọn câu có trạng ngữ thời gian đúng.",
        "options": ["他们一起晚上看书。", "晚上他们一起看书。", "他们看书晚上一起。", "一起他们晚上看书。"],
        "correct": "晚上他们一起看书。",
        "difficulty": "Trung cap",
        "rule": "Trạng ngữ thời gian thường đứng đầu câu hoặc sau chủ ngữ.",
        "explanation": "Buổi tối đứng đầu câu giúp câu tự nhiên hơn.",
    },
    {
        "sentence": "老师让我们读课文。",
        "prompt": "Chọn câu đúng với rang.",
        "options": ["老师让我们读课文。", "老师我们让读课文。", "让老师我们读课文。", "老师读课文让我们。"],
        "correct": "老师让我们读课文。",
        "difficulty": "Trung cap",
        "rule": "Rang mang nghĩa sai khiến: chủ thể + rang + người + động từ.",
        "explanation": "Cấu trúc đúng là laoshi rang women du kewen.",
    },
    {
        "sentence": "我昨天去了商店。",
        "prompt": "Chọn câu đúng với thời gian quá khứ.",
        "options": ["我昨天去了商店。", "我去昨天了商店。", "昨天我了去商店。", "我商店昨天去了。"],
        "correct": "我昨天去了商店。",
        "difficulty": "Trung cap",
        "rule": "Thời gian đứng trước động từ, le theo sau động từ.",
        "explanation": "Qu4 le đi sau động từ qu để diễn tả hành động đã hoàn thành.",
    },
    {
        "sentence": "你会不会写汉字？",
        "prompt": "Chọn câu hỏi lặp động từ đúng.",
        "options": ["你会不会写汉字？", "你不会会写汉字？", "会不会你写汉字？", "你写汉字会不会？"],
        "correct": "你会不会写汉字？",
        "difficulty": "Nang cao",
        "rule": "Mẫu A-not-A dùng để hỏi khả năng hoặc thói quen.",
        "explanation": "Hui bu hui đứng liền nhau trước động từ xie.",
    },
    {
        "sentence": "我们先吃饭，再上课。",
        "prompt": "Chọn câu có trình tự hành động đúng.",
        "options": ["我们先吃饭，再上课。", "我们再先吃饭上课。", "先我们吃饭，再课上。", "我们吃饭先，再上课。"],
        "correct": "我们先吃饭，再上课。",
        "difficulty": "Trung cap",
        "rule": "Xian và zai dùng để sắp xếp thứ tự hành động.",
        "explanation": "Đáp án thể hiện rõ làm việc gì trước rồi mới đến việc sau.",
    },
    {
        "sentence": "妹妹比我小两岁。",
        "prompt": "Chọn câu so sánh đúng.",
        "options": ["妹妹比我小两岁。", "妹妹我比小两岁。", "比妹妹我小两岁。", "妹妹小两岁比我。"],
        "correct": "妹妹比我小两岁。",
        "difficulty": "Nang cao",
        "rule": "Bi dùng để so sánh hơn kém giữa hai đối tượng.",
        "explanation": "Bi đứng giữa hai đối tượng trước tính từ so sánh.",
    },
    {
        "sentence": "教室里没有老师。",
        "prompt": "Chọn câu nói không có ai ở nơi nào đúng.",
        "options": ["教室里没有老师。", "教室里不有老师。", "没有教室里老师。", "老师教室里没有。"],
        "correct": "教室里没有老师。",
        "difficulty": "Trung cap",
        "rule": "Meiyou dùng cho phủ định sự tồn tại.",
        "explanation": "Địa điểm đứng trước, sau đó mới đến meiyou + danh từ.",
    },
    {
        "sentence": "我一边听，一边写。",
        "prompt": "Chọn câu diễn tả hai hành động song song đúng.",
        "options": ["我一边听，一边写。", "我听一边，写一边。", "一边我听写。", "我一边写听一边。"],
        "correct": "我一边听，一边写。",
        "difficulty": "Nang cao",
        "rule": "Mẫu yibian... yibian... diễn tả hai hành động diễn ra song song.",
        "explanation": "Cả hai vế đều cần có yibian đi kèm động từ.",
    },
    {
        "sentence": "如果你有问题，就问老师。",
        "prompt": "Chọn câu điều kiện đúng.",
        "options": ["如果你有问题，就问老师。", "如果你问题有，就老师问。", "你如果有问题，问就老师。", "如果有你问题，就问老师。"],
        "correct": "如果你有问题，就问老师。",
        "difficulty": "Nang cao",
        "rule": "Ruguo... jiu... dùng để diễn tả điều kiện và kết quả.",
        "explanation": "Vế điều kiện đứng trước, jiu mở đầu vế kết quả.",
    },
]


def build_dense_english_activities(items: list[VocabularyEntry]) -> list[dict]:
    dense_items = ensure_minimum_items(items, 40)
    activities: list[dict] = []
    order_index = 1

    vocab_lessons = [
        {
            "topic": "Starter vocabulary",
            "topic_id": "en-vocab-topic-starter",
            "topic_label": "STARTER",
            "topic_title": "Starter vocabulary",
            "topic_description": "Core English words for greetings, class talk, and daily communication.",
            "lesson_id": "en-vocab-lesson-1",
            "lesson_title": "Lesson 1 - Everyday basics",
            "lesson_description": "Twenty core words for the first communication block.",
            "entries": dense_items[:20],
            "is_free": True,
        },
        {
            "topic": "Daily routine vocabulary",
            "topic_id": "en-vocab-topic-routine",
            "topic_label": "ROUTINE",
            "topic_title": "Daily routine vocabulary",
            "topic_description": "High-frequency English words for routine study and daily life.",
            "lesson_id": "en-vocab-lesson-2",
            "lesson_title": "Lesson 2 - Study and routine",
            "lesson_description": "Twenty more words to expand active vocabulary.",
            "entries": dense_items[20:40],
            "is_free": False,
        },
    ]

    for lesson in vocab_lessons:
        for index, entry in enumerate(lesson["entries"], start=1):
            activities.append(
                {
                    "code": f"en-vocab-{lesson['lesson_id']}-{index:02d}",
                    "activity_type": "flashcard",
                    "title": f"{lesson['lesson_title']} · Card {index}",
                    "description": f"Flashcard for '{entry.word}' in {lesson['lesson_title']}.",
                    "prompt": f"Review the word '{entry.word}' and remember its meaning.",
                    "payload": {
                        "practice_skill": "vocabulary",
                        "topic": lesson["topic"],
                        "topic_id": lesson["topic_id"],
                        "topic_label": lesson["topic_label"],
                        "topic_title": lesson["topic_title"],
                        "topic_description": lesson["topic_description"],
                        "lesson_id": lesson["lesson_id"],
                        "lesson_title": lesson["lesson_title"],
                        "lesson_description": lesson["lesson_description"],
                        "front_word": entry.word,
                        "pinyin": entry.reading or "",
                        "back_meaning": pick_meaning(entry),
                        "example": short_text(build_sentence(entry, index - 1), 160),
                    },
                    "order_index": order_index,
                    "is_free": lesson["is_free"],
                    "lesson_id": None,
                }
            )
            order_index += 1

    writing_entries = dense_items[:20]
    for index, entry in enumerate(writing_entries, start=1):
        sentence = build_sentence(entry, index - 1)
        exercise_type = "write_sentence" if index % 2 else "type_by_meaning"
        prompt_title = (
            f"Write one sentence using '{entry.word}'"
            if exercise_type == "write_sentence"
            else "Type the sentence in English"
        )
        meaning = (
            f"Viet mot cau co chua tu '{entry.word}'."
            if exercise_type == "write_sentence"
            else pick_meaning(entry)
        )
        activities.append(
            {
                "code": f"en-writing-lesson-1-{index:02d}",
                "activity_type": "typing",
                "title": f"English writing drill {index}",
                "description": f"Writing exercise built from the word '{entry.word}'.",
                "prompt": prompt_title,
                "payload": {
                    "practice_skill": "writing",
                    "topic": "English writing",
                    "topic_id": "en-writing-topic-1",
                    "topic_label": "WRITING",
                    "topic_title": "English writing drills",
                    "topic_description": "Short sentence-writing drills for active English production.",
                    "lesson_id": "en-writing-lesson-1",
                    "lesson_title": "Lesson 1 - Core writing practice",
                    "lesson_description": "Twenty guided writing prompts for English foundation practice.",
                    "exercise_type": exercise_type,
                    "hanzi": prompt_title,
                    "pinyin": entry.reading or "",
                    "meaning": meaning,
                    "display_answer": sentence,
                    "accepted_answers": [sentence, sentence.casefold()],
                    "hints": build_hint_chunks(sentence),
                    "difficulty": "Co ban" if index <= 8 else "Trung cap" if index <= 16 else "Nang cao",
                    "explanation": f"Use the word '{entry.word}' naturally in a complete sentence.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    listening_pool = ensure_minimum_items(dense_items, 24)
    for index in range(20):
        window = [listening_pool[(index + offset) % len(listening_pool)] for offset in range(4)]
        correct_entry = window[0]
        option_details = [{"id": f"ac-{index + 1}-{offset + 1}", "text": item.word} for offset, item in enumerate(window)]
        transcript = f"Today we review the word {correct_entry.word}. Please remember it for class."
        activities.append(
            {
                "code": f"en-listening-audio-choice-{index + 1:02d}",
                "activity_type": "quiz",
                "title": f"Audio choice {index + 1}",
                "description": "Listen and choose the correct word.",
                "prompt": "Which word does the speaker mention?",
                "payload": {
                    "practice_skill": "listening",
                    "listening_type": "audio_choice",
                    "topic": "Audio choice",
                    "topic_id": "en-listening-topic-audio-choice",
                    "topic_label": "AUDIO",
                    "topic_title": "Listen and choose",
                    "topic_description": "Audio choice lessons with one focused answer in each question.",
                    "lesson_id": "en-listening-audio-choice-lesson-1",
                    "lesson_title": "Lesson 1 - Listen and choose",
                    "lesson_description": "Twenty quick audio-choice questions for English listening.",
                    "audio_url": AUDIO_URL,
                    "transcript": transcript,
                    "options": option_details,
                    "correct_option_id": option_details[0]["id"],
                    "difficulty": "Co ban" if index <= 7 else "Trung cap" if index <= 15 else "Nang cao",
                    "explanation": f"The transcript clearly contains the word '{correct_entry.word}'.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    for index, entry in enumerate(listening_pool[:20], start=1):
        answer = build_sentence(entry, index - 1)
        activities.append(
            {
                "code": f"en-listening-audio-write-{index:02d}",
                "activity_type": "audio",
                "title": f"Audio write {index}",
                "description": "Listen and type the sentence you hear.",
                "prompt": "Listen and write the sentence again.",
                "payload": {
                    "practice_skill": "listening",
                    "listening_type": "audio_write",
                    "topic": "Audio dictation",
                    "topic_id": "en-listening-topic-audio-write",
                    "topic_label": "DICTATION",
                    "topic_title": "Listen and write again",
                    "topic_description": "Short dictation drills for English sentence recall.",
                    "lesson_id": "en-listening-audio-write-lesson-1",
                    "lesson_title": "Lesson 1 - Audio dictation",
                    "lesson_description": "Twenty short English dictation exercises.",
                    "audio_url": AUDIO_URL,
                    "transcript": answer,
                    "display_answer": answer,
                    "accepted_answers": [answer, answer.casefold()],
                    "hints": build_hint_chunks(answer),
                    "difficulty": "Co ban" if index <= 8 else "Trung cap" if index <= 16 else "Nang cao",
                    "explanation": f"Write the full sentence exactly as spoken, including the word '{entry.word}'.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    for index in range(20):
        window = [listening_pool[(index + offset) % len(listening_pool)] for offset in range(4)]
        correct_entry = window[0]
        option_details = [{"id": f"vc-{index + 1}-{offset + 1}", "text": pick_meaning(item, 72)} for offset, item in enumerate(window)]
        transcript = f"In this short clip, the focus word is {correct_entry.word}."
        activities.append(
            {
                "code": f"en-listening-video-choice-{index + 1:02d}",
                "activity_type": "quiz",
                "title": f"Video choice {index + 1}",
                "description": "Watch the short clip and choose the correct meaning.",
                "prompt": "Which meaning matches the focus word in the clip?",
                "payload": {
                    "practice_skill": "listening",
                    "listening_type": "video_choice",
                    "topic": "Video choice",
                    "topic_id": "en-listening-topic-video-choice",
                    "topic_label": "VIDEO",
                    "topic_title": "Watch and choose",
                    "topic_description": "Video-based choice lessons for focused English review.",
                    "lesson_id": "en-listening-video-choice-lesson-1",
                    "lesson_title": "Lesson 1 - Watch and choose",
                    "lesson_description": "Twenty short video-choice questions for English listening review.",
                    "video_url": VIDEO_URL,
                    "transcript": transcript,
                    "options": option_details,
                    "correct_option_id": option_details[0]["id"],
                    "difficulty": "Co ban" if index <= 7 else "Trung cap" if index <= 15 else "Nang cao",
                    "explanation": f"The clip focuses on '{correct_entry.word}', which matches the correct meaning.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    for index, question in enumerate(ENGLISH_GRAMMAR_QUESTIONS, start=1):
        option_details = [{"id": f"grammar-{index}-{option_index + 1}", "text": option} for option_index, option in enumerate(question["options"])]
        correct_option_id = next(option["id"] for option in option_details if option["text"] == question["correct"])
        activities.append(
            {
                "code": f"en-grammar-lesson-1-{index:02d}",
                "activity_type": "quiz",
                "title": f"Grammar drill {index}",
                "description": "Core English grammar multiple-choice question.",
                "prompt": question["prompt"],
                "payload": {
                    "practice_skill": "grammar",
                    "topic": "English grammar",
                    "topic_id": "en-grammar-topic-1",
                    "topic_label": "GRAMMAR",
                    "topic_title": "English grammar foundation",
                    "topic_description": "Focused grammar drills for English structure and sentence control.",
                    "lesson_id": "en-grammar-lesson-1",
                    "lesson_title": "Lesson 1 - Core grammar drills",
                    "lesson_description": "Twenty grammar questions covering verb to be, do/does, prepositions, and future plans.",
                    "rule": question["rule"],
                    "sentence": question["sentence"],
                    "options": option_details,
                    "correct_option_id": correct_option_id,
                    "difficulty": question["difficulty"],
                    "explanation": question["explanation"],
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    speaking_entry = dense_items[0]
    activities.append(
        {
            "code": "en-speaking-placeholder-01",
            "activity_type": "voice",
            "title": "Speaking placeholder",
            "description": "Placeholder speaking activity while the full speaking flow is still in development.",
            "prompt": f"Say the word '{speaking_entry.word}' clearly.",
            "payload": {
                "practice_skill": "speaking",
                "topic": "Speaking",
                "topic_id": "en-speaking-topic-1",
                "topic_label": "SPEAK",
                "topic_title": "Speaking in development",
                "topic_description": "Speaking UI is available, while scoring and voice review will be completed later.",
                "lesson_id": "en-speaking-lesson-1",
                "lesson_title": "Lesson 1 - Speaking placeholder",
                "lesson_description": "Temporary speaking lesson for English while the module is being completed.",
                "target_text": speaking_entry.word,
                "reading": speaking_entry.reading or "",
                "accepted_answers": [speaking_entry.word, speaking_entry.word.casefold()],
                "display_answer": speaking_entry.word,
                "difficulty": "Co ban",
                "explanation": "Speaking scoring will be expanded in a later phase.",
            },
            "order_index": order_index,
            "is_free": True,
            "lesson_id": None,
        }
    )

    return activities


def build_dense_chinese_activities(items: list[VocabularyEntry]) -> list[dict]:
    dense_items = ensure_minimum_items(items, 40)
    activities: list[dict] = []
    order_index = 1

    vocab_lessons = [
        {
            "topic": "Giao tiếp HSK 1",
            "topic_id": "zh-vocab-topic-greeting",
            "topic_label": "GIAO TIẾP",
            "topic_title": "Nền tảng giao tiếp HSK 1",
            "topic_description": "Từ vựng chào hỏi, giới thiệu và lớp học cho người mới bắt đầu.",
            "lesson_id": "zh-vocab-lesson-1",
            "lesson_title": "Bài 1 - Chào hỏi và giới thiệu",
            "lesson_description": "Hai mươi từ đầu tiên để giao tiếp cơ bản bằng tiếng Trung.",
            "entries": dense_items[:20],
            "is_free": True,
        },
        {
            "topic": "Sinh hoạt HSK 1",
            "topic_id": "zh-vocab-topic-daily",
            "topic_label": "SINH HOẠT",
            "topic_title": "Từ vựng sinh hoạt HSK 1",
            "topic_description": "Từ vựng thời gian, địa điểm và hành động hằng ngày trong tiếng Trung.",
            "lesson_id": "zh-vocab-lesson-2",
            "lesson_title": "Bài 2 - Sinh hoạt hằng ngày",
            "lesson_description": "Hai mươi từ tiếp theo để mở rộng vốn từ HSK 1.",
            "entries": dense_items[20:40],
            "is_free": False,
        },
    ]

    for lesson in vocab_lessons:
        for index, entry in enumerate(lesson["entries"], start=1):
            activities.append(
                {
                    "code": f"zh-vocab-{lesson['lesson_id']}-{index:02d}",
                    "activity_type": "flashcard",
                    "title": f"{lesson['lesson_title']} · Thẻ {index}",
                    "description": f"Ôn nhanh từ '{entry.word}' trong {lesson['lesson_title']}.",
                    "prompt": f"Ôn từ '{entry.word}' và ghi nhớ nghĩa của từ này.",
                    "payload": {
                        "practice_skill": "vocabulary",
                        "topic": lesson["topic"],
                        "topic_id": lesson["topic_id"],
                        "topic_label": lesson["topic_label"],
                        "topic_title": lesson["topic_title"],
                        "topic_description": lesson["topic_description"],
                        "lesson_id": lesson["lesson_id"],
                        "lesson_title": lesson["lesson_title"],
                        "lesson_description": lesson["lesson_description"],
                        "front_word": entry.word,
                        "pinyin": entry.reading or "",
                        "back_meaning": pick_meaning(entry),
                        "example": short_text(build_chinese_sentence(entry, index - 1), 160),
                    },
                    "order_index": order_index,
                    "is_free": lesson["is_free"],
                    "lesson_id": None,
                }
            )
            order_index += 1

    writing_entries = dense_items[:20]
    for index, entry in enumerate(writing_entries, start=1):
        sentence = build_chinese_sentence(entry, index - 1)
        exercise_type = "write_sentence" if index % 2 else "type_by_meaning"
        hanzi_prompt = f"请用“{entry.word}”造句" if exercise_type == "write_sentence" else "请根据意思输入汉字"
        meaning = f"Viết một câu có chứa từ '{entry.word}'." if exercise_type == "write_sentence" else pick_meaning(entry)
        activities.append(
            {
                "code": f"zh-writing-lesson-1-{index:02d}",
                "activity_type": "typing",
                "title": f"Luyện viết tiếng Trung {index}",
                "description": f"Bài luyện viết dùng từ '{entry.word}'.",
                "prompt": hanzi_prompt,
                "payload": {
                    "practice_skill": "writing",
                    "topic": "Luyện viết HSK 1",
                    "topic_id": "zh-writing-topic-1",
                    "topic_label": "WRITING",
                    "topic_title": "Luyện viết tiếng Trung nền tảng",
                    "topic_description": "Viết câu ngắn và gõ lại đáp án tiếng Trung theo nghĩa gợi ý.",
                    "lesson_id": "zh-writing-lesson-1",
                    "lesson_title": "Bài 1 - Viết câu cơ bản",
                    "lesson_description": "Hai mươi bài luyện viết ngắn cho trình độ HSK 1.",
                    "exercise_type": exercise_type,
                    "hanzi": hanzi_prompt,
                    "pinyin": entry.reading or "",
                    "meaning": meaning,
                    "display_answer": sentence,
                    "accepted_answers": [sentence],
                    "hints": build_character_hints(sentence),
                    "difficulty": "Co ban" if index <= 8 else "Trung cap" if index <= 16 else "Nang cao",
                    "explanation": f"Hãy dùng từ '{entry.word}' trong một câu ngắn, đúng trật tự tiếng Trung.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    listening_pool = ensure_minimum_items(dense_items, 24)
    for index in range(20):
        window = [listening_pool[(index + offset) % len(listening_pool)] for offset in range(4)]
        correct_entry = window[0]
        option_details = [{"id": f"zh-ac-{index + 1}-{offset + 1}", "text": item.word} for offset, item in enumerate(window)]
        transcript = f"今天我们复习词语“{correct_entry.word}”。请记住这个词。"
        activities.append(
            {
                "code": f"zh-listening-audio-choice-{index + 1:02d}",
                "activity_type": "quiz",
                "title": f"Nghe chọn đáp án {index + 1}",
                "description": "Nghe audio ngắn và chọn đúng từ được nhắc đến.",
                "prompt": "Người nói đang nhắc đến từ nào?",
                "payload": {
                    "practice_skill": "listening",
                    "listening_type": "audio_choice",
                    "topic": "Nghe chọn đáp án",
                    "topic_id": "zh-listening-topic-audio-choice",
                    "topic_label": "AUDIO",
                    "topic_title": "Nghe và chọn đáp án",
                    "topic_description": "Các câu nghe ngắn giúp phân biệt từ vựng HSK 1.",
                    "lesson_id": "zh-listening-audio-choice-lesson-1",
                    "lesson_title": "Bài 1 - Nghe chọn từ",
                    "lesson_description": "Hai mươi câu nghe ngắn để nhận diện từ vựng tiếng Trung.",
                    "audio_url": AUDIO_URL,
                    "transcript": transcript,
                    "options": option_details,
                    "correct_option_id": option_details[0]["id"],
                    "difficulty": "Co ban" if index <= 7 else "Trung cap" if index <= 15 else "Nang cao",
                    "explanation": f"Transcript có nhắc rõ từ '{correct_entry.word}'.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    for index, entry in enumerate(listening_pool[:20], start=1):
        answer = build_chinese_sentence(entry, index - 1)
        activities.append(
            {
                "code": f"zh-listening-audio-write-{index:02d}",
                "activity_type": "audio",
                "title": f"Nghe viết lại {index}",
                "description": "Nghe câu và gõ lại nguyên văn bằng tiếng Trung.",
                "prompt": "Nghe và viết lại câu vừa nghe.",
                "payload": {
                    "practice_skill": "listening",
                    "listening_type": "audio_write",
                    "topic": "Nghe và viết lại",
                    "topic_id": "zh-listening-topic-audio-write",
                    "topic_label": "DICTATION",
                    "topic_title": "Nghe chép chính tả tiếng Trung",
                    "topic_description": "Các bài chép chính tả ngắn dựa trên câu mẫu HSK 1.",
                    "lesson_id": "zh-listening-audio-write-lesson-1",
                    "lesson_title": "Bài 1 - Nghe viết câu",
                    "lesson_description": "Hai mươi câu ngắn để luyện nghe và gõ lại tiếng Trung.",
                    "audio_url": AUDIO_URL,
                    "transcript": answer,
                    "display_answer": answer,
                    "accepted_answers": [answer],
                    "hints": build_character_hints(answer),
                    "difficulty": "Co ban" if index <= 8 else "Trung cap" if index <= 16 else "Nang cao",
                    "explanation": f"Viết lại đầy đủ câu nghe được, trong đó có từ '{entry.word}'.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    for index in range(20):
        window = [listening_pool[(index + offset) % len(listening_pool)] for offset in range(4)]
        correct_entry = window[0]
        option_details = [{"id": f"zh-vc-{index + 1}-{offset + 1}", "text": pick_meaning(item, 72)} for offset, item in enumerate(window)]
        transcript = f"这个短视频重点复习“{correct_entry.word}”。"
        activities.append(
            {
                "code": f"zh-listening-video-choice-{index + 1:02d}",
                "activity_type": "quiz",
                "title": f"Xem video chọn đáp án {index + 1}",
                "description": "Xem video ngắn và chọn đúng nghĩa của từ trọng tâm.",
                "prompt": "Nghĩa nào khớp với từ trọng tâm trong video?",
                "payload": {
                    "practice_skill": "listening",
                    "listening_type": "video_choice",
                    "topic": "Xem video chọn đáp án",
                    "topic_id": "zh-listening-topic-video-choice",
                    "topic_label": "VIDEO",
                    "topic_title": "Xem video và chọn nghĩa đúng",
                    "topic_description": "Video ngắn giúp nhận diện từ và nghĩa trong bối cảnh HSK 1.",
                    "lesson_id": "zh-listening-video-choice-lesson-1",
                    "lesson_title": "Bài 1 - Video từ vựng",
                    "lesson_description": "Hai mươi bài video ngắn để ôn từ vựng tiếng Trung.",
                    "video_url": VIDEO_URL,
                    "transcript": transcript,
                    "options": option_details,
                    "correct_option_id": option_details[0]["id"],
                    "difficulty": "Co ban" if index <= 7 else "Trung cap" if index <= 15 else "Nang cao",
                    "explanation": f"Video tập trung vào từ '{correct_entry.word}', tương ứng với nghĩa đúng.",
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    for index, question in enumerate(CHINESE_GRAMMAR_QUESTIONS, start=1):
        option_details = [{"id": f"zh-grammar-{index}-{option_index + 1}", "text": option} for option_index, option in enumerate(question["options"])]
        correct_option_id = next(option["id"] for option in option_details if option["text"] == question["correct"])
        activities.append(
            {
                "code": f"zh-grammar-lesson-1-{index:02d}",
                "activity_type": "quiz",
                "title": f"Ngữ pháp HSK 1 - Câu {index}",
                "description": "Câu hỏi trắc nghiệm ngữ pháp tiếng Trung nền tảng.",
                "prompt": question["prompt"],
                "payload": {
                    "practice_skill": "grammar",
                    "topic": "Ngữ pháp HSK 1",
                    "topic_id": "zh-grammar-topic-1",
                    "topic_label": "GRAMMAR",
                    "topic_title": "Ngữ pháp tiếng Trung nền tảng",
                    "topic_description": "Các cấu trúc hỏi đáp, phủ định, thời gian và vị trí cho HSK 1.",
                    "lesson_id": "zh-grammar-lesson-1",
                    "lesson_title": "Bài 1 - Cấu trúc cơ bản",
                    "lesson_description": "Hai mươi câu ngữ pháp giúp làm chắc nền HSK 1.",
                    "rule": question["rule"],
                    "sentence": question["sentence"],
                    "options": option_details,
                    "correct_option_id": correct_option_id,
                    "difficulty": question["difficulty"],
                    "explanation": question["explanation"],
                },
                "order_index": order_index,
                "is_free": True,
                "lesson_id": None,
            }
        )
        order_index += 1

    speaking_entry = dense_items[0]
    activities.append(
        {
            "code": "zh-speaking-placeholder-01",
            "activity_type": "voice",
            "title": "Luyện nói tiếng Trung",
            "description": "Giao diện luyện nói đã có, phần chấm điểm sẽ mở rộng ở bước sau.",
            "prompt": f"Đọc to từ '{speaking_entry.word}'.",
            "payload": {
                "practice_skill": "speaking",
                "topic": "Luyện nói",
                "topic_id": "zh-speaking-topic-1",
                "topic_label": "SPEAK",
                "topic_title": "Luyện nói đang phát triển",
                "topic_description": "Có giao diện để mở bài, phần chấm phát âm sẽ hoàn thiện ở giai đoạn sau.",
                "lesson_id": "zh-speaking-lesson-1",
                "lesson_title": "Bài 1 - Placeholder luyện nói",
                "lesson_description": "Bài speaking tạm thời cho tiếng Trung trong lúc hoàn thiện module.",
                "target_text": speaking_entry.word,
                "reading": speaking_entry.reading or "",
                "accepted_answers": [speaking_entry.word, speaking_entry.reading or ""],
                "display_answer": speaking_entry.word,
                "difficulty": "Co ban",
                "explanation": "Tạm thời giữ giao diện luyện nói, phần scoring sẽ hoàn thiện sau.",
            },
            "order_index": order_index,
            "is_free": True,
            "lesson_id": None,
        }
    )

    return activities


async def seed(selected_languages: set[str] | None = None) -> None:
    inserted = 0

    await init_db()

    async with AsyncSessionLocal() as session:
        language_result = await session.execute(select(Language).order_by(Language.code.asc()))
        languages = language_result.scalars().all()

        for language in languages:
            if selected_languages and language.code not in selected_languages:
                continue

            candidate_limit = 48 if language.code in {"en", "zh"} else 8
            candidates = await get_candidates(session, language.code, limit=candidate_limit)
            if len(candidates) < 5:
                continue

            if language.code == "en":
                await session.execute(delete(PracticeActivity).where(PracticeActivity.language_code == language.code))
                await session.flush()
                activities = build_dense_english_activities(candidates)
            elif language.code == "zh":
                await session.execute(delete(PracticeActivity).where(PracticeActivity.language_code == language.code))
                await session.flush()
                activities = build_dense_chinese_activities(candidates)
            else:
                while len(candidates) < 8:
                    candidates.append(candidates[len(candidates) % 5])
                lesson_id = await get_first_lesson_id(session, language.code)
                activities = build_base_activities(language.code, candidates[:8])
                for activity in activities:
                    activity["lesson_id"] = lesson_id

            for activity in activities:
                created = await upsert_activity(
                    session,
                    language_code=language.code,
                    code=activity["code"],
                    activity_type=activity["activity_type"],
                    title=activity["title"],
                    description=activity["description"],
                    prompt=activity["prompt"],
                    payload=activity["payload"],
                    order_index=activity["order_index"],
                    lesson_id=activity["lesson_id"],
                    is_free=activity["is_free"],
                )
                inserted += int(created)

        await session.commit()

    print(f"Seeded practice activities, inserted {inserted} rows")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Chi seed cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()
    selected_languages = set(args.languages) if args.languages else None
    asyncio.run(seed(selected_languages=selected_languages))


if __name__ == "__main__":
    main()
