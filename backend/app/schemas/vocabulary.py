from pydantic import BaseModel


class LanguageOut(BaseModel):
    code: str
    name: str


class VocabularyEntryOut(BaseModel):
    id: int
    language_code: str
    word: str
    reading: str | None
    part_of_speech: str | None
    meaning_en: str
    meaning_vi: str | None
    source_name: str

