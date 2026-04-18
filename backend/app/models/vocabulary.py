from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VocabularyEntry(Base):
    __tablename__ = "vocabulary_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    language_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("languages.code"),
        nullable=False,
        index=True,
    )
    word: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    reading: Mapped[str | None] = mapped_column(String(255), nullable=True)
    part_of_speech: Mapped[str | None] = mapped_column(String(120), nullable=True)
    meaning_en: Mapped[str] = mapped_column(Text, nullable=False)
    meaning_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_meaning_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

