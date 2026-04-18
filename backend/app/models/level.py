from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Level(Base):
    __tablename__ = "levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    language_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("languages.code"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

