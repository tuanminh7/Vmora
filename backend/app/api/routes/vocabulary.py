from fastapi import APIRouter, Query
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.language import Language
from app.models.vocabulary import VocabularyEntry
from app.schemas.vocabulary import LanguageOut, VocabularyEntryOut

router = APIRouter(prefix="/v1", tags=["vocabulary"])


@router.get("/languages", response_model=list[LanguageOut])
async def get_languages():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Language).order_by(Language.name))
        languages = result.scalars().all()
        return [LanguageOut(code=item.code, name=item.name) for item in languages]


@router.get("/vocabulary", response_model=list[VocabularyEntryOut])
async def get_vocabulary(
    language_code: str = Query(..., min_length=2, max_length=10),
    limit: int = Query(20, ge=1, le=100),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VocabularyEntry)
            .where(
                VocabularyEntry.language_code == language_code,
                VocabularyEntry.is_active.is_(True),
            )
            .order_by(VocabularyEntry.id.asc())
            .limit(limit)
        )
        entries = result.scalars().all()
        return [
            VocabularyEntryOut(
                id=item.id,
                language_code=item.language_code,
                word=item.word,
                reading=item.reading,
                part_of_speech=item.part_of_speech,
                meaning_en=item.meaning_en,
                meaning_vi=item.meaning_vi,
                source_name=item.source_name,
            )
            for item in entries
        ]

