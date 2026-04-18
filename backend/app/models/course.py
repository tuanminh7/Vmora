from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    language_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("languages.code"),
        nullable=False,
        index=True,
    )
    level_id: Mapped[int | None] = mapped_column(
        ForeignKey("levels.id"),
        nullable=True,
        index=True,
    )
    roadmap_id: Mapped[int | None] = mapped_column(
        ForeignKey("roadmaps.id"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class CourseSection(Base):
    __tablename__ = "course_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("course_sections.id"), nullable=False, index=True)
    stage_id: Mapped[int | None] = mapped_column(
        ForeignKey("roadmap_stages.id"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    is_free_preview: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
