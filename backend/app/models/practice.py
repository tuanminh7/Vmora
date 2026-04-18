from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PracticeActivity(Base):
    __tablename__ = "practice_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    language_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("languages.code"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), nullable=True, index=True)
    code: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    activity_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("practice_activities.id"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    answers: Mapped[dict[str, Any] | list[Any] | str | None] = mapped_column(JSON, nullable=True)
    score_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
