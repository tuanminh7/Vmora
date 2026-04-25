from __future__ import annotations

import asyncio
import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, init_db
from app.models.feature import Exam, ExamQuestion
from app.models.language import Language
from app.models.vocabulary import VocabularyEntry
# 

def short_text(text: str | None, limit: int = 80) -> str:
    value = " ".join((text or "").split())
    return value if len(value) <= limit else f"{value[: limit - 3].rstrip()}..."


async def seed(selected_languages: set[str] | None = None) -> None:
    inserted = 0
    await init_db()

    async with AsyncSessionLocal() as session:
        languages = (await session.execute(select(Language).order_by(Language.code.asc()))).scalars().all()
        for language in languages:
            if selected_languages and language.code not in selected_languages:
                continue
            exists = (
                await session.execute(select(Exam).where(Exam.language_code == language.code, Exam.title.like("%MVP%")))
            ).scalar_one_or_none()
            if exists is not None:
                continue

            vocabulary = (
                await session.execute(
                    select(VocabularyEntry)
                    .where(VocabularyEntry.language_code == language.code, VocabularyEntry.is_active.is_(True))
                    .order_by(VocabularyEntry.id.asc())
                    .limit(4)
                )
            ).scalars().all()
            if len(vocabulary) < 3:
                continue

            exam = Exam(
                language_code=language.code,
                title=f"Đề thi MVP {language.name}",
                description="Đề thi mẫu để test luồng làm bài và chấm điểm.",
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
                    prompt=f"Chọn nghĩa đúng của từ '{correct_word.word}'",
                    payload={
                        "options": [
                            {"id": "a", "text": short_text(correct_word.meaning_vi or correct_word.meaning_en)},
                            {"id": "b", "text": short_text(distractors[0].meaning_vi or distractors[0].meaning_en)},
                            {"id": "c", "text": short_text(distractors[1].meaning_vi or distractors[1].meaning_en)},
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
                    prompt=f"Nhập từ phù hợp với nghĩa: {short_text(distractors[0].meaning_vi or distractors[0].meaning_en)}",
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
                    prompt=f"Chọn từ đúng với nghĩa: {short_text(distractors[1].meaning_vi or distractors[1].meaning_en)}",
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
            inserted += 1

        await session.commit()

    print(f"Seeded exam content, inserted {inserted} exams")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Chi seed cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()
    selected_languages = set(args.languages) if args.languages else None
    asyncio.run(seed(selected_languages=selected_languages))


if __name__ == "__main__":
    main()
