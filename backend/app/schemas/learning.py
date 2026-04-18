from pydantic import BaseModel


class LevelOut(BaseModel):
    id: int
    code: str
    title: str
    description: str | None


class RoadmapStageOut(BaseModel):
    id: int
    title: str
    description: str | None
    order_index: int


class RoadmapOut(BaseModel):
    id: int
    title: str
    description: str | None
    level: LevelOut | None
    stages: list[RoadmapStageOut]


class LessonOut(BaseModel):
    id: int
    title: str
    summary: str | None
    content: str | None
    order_index: int
    estimated_minutes: int
    is_free_preview: bool
    is_locked: bool
    is_completed: bool
    stage_id: int | None


class CourseSectionOut(BaseModel):
    id: int
    title: str
    description: str | None
    order_index: int
    lessons: list[LessonOut]


class CourseOut(BaseModel):
    id: int
    title: str
    description: str | None
    is_free: bool
    has_access: bool
    completed_lessons: int
    total_lessons: int
    progress_percent: int
    next_lesson_id: int | None
    order_index: int
    level: LevelOut | None
    sections: list[CourseSectionOut]


class LessonDetailOut(BaseModel):
    id: int
    title: str
    summary: str | None
    content: str | None
    estimated_minutes: int
    is_locked: bool
    locked_reason: str | None
    is_completed: bool


class LessonCompleteOut(BaseModel):
    lesson_id: int
    completed: bool
    next_lesson_id: int | None


class LearningOverviewOut(BaseModel):
    language_code: str
    level_count: int
    course_count: int
    roadmap: RoadmapOut | None
    courses: list[CourseOut]
