from __future__ import annotations

import asyncio
import argparse
import random
import sys
from pathlib import Path
from urllib.parse import quote

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

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


async def get_candidates(session, language_code: str, limit: int = 8) -> list[VocabularyEntry]:
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


def build_activities(language_code: str, items: list[VocabularyEntry]) -> list[dict]:
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
                ]
            },
            "order_index": 13,
            "is_free": False,
        },
    ]


async def seed(selected_languages: set[str] | None = None) -> None:
    inserted = 0

    await init_db()

    async with AsyncSessionLocal() as session:
        language_result = await session.execute(select(Language).order_by(Language.code.asc()))
        languages = language_result.scalars().all()

        for language in languages:
            if selected_languages and language.code not in selected_languages:
                continue
            candidates = await get_candidates(session, language.code, limit=8)
            if len(candidates) < 5:
                continue

            while len(candidates) < 8:
                candidates.append(candidates[len(candidates) % 5])

            lesson_id = await get_first_lesson_id(session, language.code)
            activities = build_activities(language.code, candidates[:8])

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
                    lesson_id=lesson_id,
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
