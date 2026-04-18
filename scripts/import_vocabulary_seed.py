from __future__ import annotations

import asyncio
import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, init_db
from app.models.language import Language
from app.models.vocabulary import VocabularyEntry


SEED_FILE = ROOT_DIR / "data" / "normalized" / "vocabulary_seed.json"
CURATED_SEED_FILE = ROOT_DIR / "data" / "seed" / "vocabulary_en_zh.json"


LANGUAGE_MAP = {
    "en": "Tiếng Anh",
    "ja": "Tiếng Nhật",
    "ko": "Tiếng Hàn",
    "zh": "Tiếng Trung",
    "de": "Tiếng Đức",
}


def load_payload() -> list[dict]:
    payload: list[dict] = []
    if SEED_FILE.exists():
        payload.extend(json.loads(SEED_FILE.read_text(encoding="utf-8")))
    if CURATED_SEED_FILE.exists():
        payload.extend(json.loads(CURATED_SEED_FILE.read_text(encoding="utf-8")))
    return payload


async def import_seed(languages: set[str] | None = None) -> None:
    payload = load_payload()
    if languages:
        payload = [item for item in payload if item.get("language_code") in languages]
    inserted = 0
    skipped = 0

    await init_db()

    async with AsyncSessionLocal() as session:
        existing_result = await session.execute(select(Language))
        existing_languages = {language.code: language for language in existing_result.scalars().all()}

        for code, display_name in LANGUAGE_MAP.items():
            if code not in existing_languages:
                session.add(Language(code=code, name=display_name))

        await session.flush()

        for item in payload:
            exists = await session.execute(
                VocabularyEntry.__table__.select().where(
                    VocabularyEntry.language_code == item["language_code"],
                    VocabularyEntry.word == item["word"],
                    VocabularyEntry.meaning_en == item["meaning_en"],
                )
            )
            if exists.first():
                skipped += 1
                continue

            session.add(
                VocabularyEntry(
                    language_code=item["language_code"],
                    word=item["word"],
                    reading=item.get("reading"),
                    part_of_speech=item.get("part_of_speech"),
                    meaning_en=item["meaning_en"],
                    meaning_vi=item.get("meaning_vi"),
                    example=item.get("example"),
                    example_meaning_vi=item.get("example_meaning_vi"),
                    source_name=item["source_name"],
                    source_url=item["source_url"],
                )
            )
            inserted += 1

        await session.commit()
        print(f"Imported {inserted} vocabulary rows, skipped {skipped} duplicates")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Chi import cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()
    languages = set(args.languages) if args.languages else None
    asyncio.run(import_seed(languages=languages))


if __name__ == "__main__":
    main()
