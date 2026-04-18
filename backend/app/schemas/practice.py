from typing import Any

from pydantic import BaseModel


class PracticeActivityOut(BaseModel):
    id: int
    language_code: str
    lesson_id: int | None
    code: str
    practice_skill: str
    activity_type: str
    title: str
    description: str | None
    prompt: str | None
    payload: dict[str, Any]
    order_index: int
    is_free: bool


class PracticeSubmitInput(BaseModel):
    answers: dict[str, Any] | list[Any] | str | None = None


class PracticeSubmitOut(BaseModel):
    activity_id: int
    attempt_id: int | None
    is_correct: bool | None
    score_percent: int
    feedback: str
    expected_answer: Any | None = None
