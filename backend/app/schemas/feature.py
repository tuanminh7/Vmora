from typing import Any

from pydantic import BaseModel, Field


class AdminDashboardOut(BaseModel):
    user_count: int
    language_count: int
    course_count: int
    lesson_count: int
    vocabulary_count: int
    practice_count: int
    exam_count: int
    ticket_count: int


class LanguageAdminInput(BaseModel):
    code: str = Field(min_length=2, max_length=10)
    name: str = Field(min_length=1, max_length=120)


class LevelAdminInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    code: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    order_index: int = 1


class RoadmapAdminInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    level_id: int | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class RoadmapStageAdminInput(BaseModel):
    roadmap_id: int
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    order_index: int = 1


class CourseAdminInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    level_id: int | None = None
    roadmap_id: int | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    is_free: bool = True
    is_published: bool = True
    order_index: int = 1


class CourseSectionAdminInput(BaseModel):
    course_id: int
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    is_published: bool = True
    order_index: int = 1


class LessonAdminInput(BaseModel):
    section_id: int
    stage_id: int | None = None
    title: str = Field(min_length=1, max_length=255)
    summary: str | None = None
    content: str | None = None
    order_index: int = 1
    estimated_minutes: int = 10
    is_free_preview: bool = True
    is_published: bool = True


class VocabularyAdminInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    word: str = Field(min_length=1, max_length=255)
    reading: str | None = None
    part_of_speech: str | None = None
    meaning_en: str = Field(min_length=1)
    meaning_vi: str | None = None
    example: str | None = None
    example_meaning_vi: str | None = None
    source_name: str = Field(min_length=1, max_length=120)
    source_url: str = Field(min_length=1)
    is_active: bool = True


class PracticeAdminInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    lesson_id: int | None = None
    code: str = Field(min_length=1, max_length=120)
    activity_type: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    prompt: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    order_index: int = 1
    is_free: bool = True
    is_active: bool = True


class PackageAdminInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    code: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price_vnd: int = 0
    duration_days: int | None = None
    is_free: bool = False
    is_active: bool = True


class SimpleStatusOut(BaseModel):
    ok: bool
    message: str


class ExamQuestionOut(BaseModel):
    id: int
    question_type: str
    prompt: str
    payload: dict[str, Any]
    points: int
    order_index: int


class ExamOut(BaseModel):
    id: int
    language_code: str
    title: str
    description: str | None
    level_code: str | None
    certificate_code: str | None = None
    duration_minutes: int
    passing_score: int
    is_active: bool
    questions: list[ExamQuestionOut] = []


class ExamSubmitInput(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)


class ExamSubmitOut(BaseModel):
    attempt_id: int
    exam_id: int
    correct_count: int
    total_questions: int
    score_percent: int
    passed: bool
    feedback: str


class NotebookEntryInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    tag: str | None = Field(default=None, max_length=80)


class NotebookEntryOut(NotebookEntryInput):
    id: int
    created_at: str
    updated_at: str


class NotebookReminderInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    remind_at: str = Field(min_length=1)


class NotebookReminderOut(NotebookReminderInput):
    id: int
    is_active: bool
    created_at: str


class StudyStreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    last_check_in_at: str | None
    updated_at: str


class UserVocabularyInput(BaseModel):
    language_code: str = Field(min_length=2, max_length=10)
    word: str = Field(min_length=1, max_length=255)
    meaning: str | None = None
    note: str | None = None
    vocabulary_entry_id: int | None = None
    level_code: str = Field(default="basic", min_length=1, max_length=40)


class UserVocabularyOut(UserVocabularyInput):
    id: int
    is_selected: bool
    is_in_practice: bool
    created_at: str


class VocabularyBankSelectionInput(BaseModel):
    is_selected: bool


class VocabularyBankPracticeInput(BaseModel):
    is_in_practice: bool


class NotificationOut(BaseModel):
    id: int
    title: str
    content: str
    notification_type: str
    is_read: bool
    created_at: str


class SupportTicketInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)


class SupportTicketOut(BaseModel):
    id: int
    title: str
    content: str
    status: str
    admin_reply: str | None
    created_at: str
    updated_at: str


class UserSettingInput(BaseModel):
    theme_mode: str = Field(default="light", min_length=1, max_length=20)
    background_code: str = Field(default="default", min_length=1, max_length=80)


class UserSettingOut(UserSettingInput):
    id: int
    updated_at: str


class PetProfileInput(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    pet_type: str | None = Field(default=None, max_length=80)
    color_theme: str | None = Field(default=None, max_length=80)
    voice_code: str | None = Field(default=None, max_length=80)


class PetProfileOut(BaseModel):
    id: int
    name: str
    pet_type: str
    level: int
    experience: int
    mood: str
    color_theme: str
    voice_code: str
    updated_at: str


class PetVoiceInput(BaseModel):
    message: str = Field(min_length=1)


class PetVoiceMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


class CommunityPostInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    language_code: str | None = Field(default=None, max_length=10)
    image_url: str | None = Field(default=None, max_length=500000)


class CommunityPostUpdateInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    image_url: str | None = Field(default=None, max_length=500000)


class CommunityCommentInput(BaseModel):
    content: str = Field(min_length=1)


class CommunityReactionInput(BaseModel):
    reaction_type: str = Field(min_length=1, max_length=20)


class CommunityReportInput(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class CommunityCommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    user_public_user_id: str
    user_name: str | None
    user_avatar_url: str | None = None
    content: str
    created_at: str


class CommunityPostOut(BaseModel):
    id: int
    user_id: int
    user_public_user_id: str
    user_name: str | None
    user_avatar_url: str | None = None
    language_code: str | None
    title: str
    content: str
    image_url: str | None = None
    created_at: str
    reactions: dict[str, int] = Field(default_factory=dict)
    my_reaction: str | None = None
    share_count: int = 0
    comments: list[CommunityCommentOut] = []


class CommunityReactionSummaryOut(BaseModel):
    post_id: int
    reactions: dict[str, int] = Field(default_factory=dict)
    my_reaction: str | None = None


class CommunityShareSummaryOut(BaseModel):
    post_id: int
    share_count: int = 0


class DirectMessageInput(BaseModel):
    content: str = Field(min_length=1)


class DirectMessageOut(BaseModel):
    id: int
    sender_user_id: int
    sender_public_user_id: str
    sender_name: str | None
    sender_avatar_url: str | None = None
    recipient_user_id: int
    recipient_public_user_id: str
    recipient_name: str | None
    recipient_avatar_url: str | None = None
    content: str
    created_at: str


class LeaderboardItemOut(BaseModel):
    user_id: int
    user_name: str | None
    language_code: str | None
    completed_lessons: int
    practice_attempts: int
    exam_attempts: int
    tournament_attempts: int = 0
    score: int


class UserStatsOut(BaseModel):
    completed_lessons: int
    practice_attempts: int
    best_practice_score: int
    exam_attempts: int
    best_exam_score: int
    tournament_attempts: int = 0
    estimated_points: int


class TournamentQuestionOut(BaseModel):
    id: int
    prompt: str
    options: list[dict[str, Any]] = []
    order_index: int
    section: str | None = None
    question_type: str = "single_choice"
    audio_text: str | None = None
    audio_replay_limit: int | None = None
    passage_id: str | None = None
    passage_title: str | None = None
    passage_text: str | None = None


class TournamentOut(BaseModel):
    id: int
    language_code: str
    title: str
    description: str | None
    duration_minutes: int
    passing_score: int
    reward_title: str | None
    reward_description: str | None
    is_active: bool
    is_registered: bool = False
    question_count: int = 0
    participant_count: int = 0
    room_status: str = "waiting"
    starts_at: str | None = None
    ends_at: str | None = None
    waiting_room_opened_at: str | None = None
    room_started_at: str | None = None
    questions: list[TournamentQuestionOut] = []


class TournamentRegisterOut(BaseModel):
    tournament_id: int
    registered: bool
    message: str


class TournamentRoomStartOut(BaseModel):
    tournament_id: int
    room_status: str
    room_started_at: str
    message: str


class TournamentSubmitInput(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)


class TournamentSubmitOut(BaseModel):
    attempt_id: int
    tournament_id: int
    correct_count: int
    total_questions: int
    score_percent: int
    passed: bool
    reward_title: str | None
    feedback: str
    rank: int | None = None
    leaderboard_size: int = 0


class TournamentLeaderboardItemOut(BaseModel):
    user_id: int
    user_name: str | None
    score_percent: int
    correct_count: int
    total_questions: int
    reward_title: str | None = None


class FriendLinkOut(BaseModel):
    id: int
    user_id: int
    friend_user_id: int
    friend_public_user_id: str
    friend_name: str | None
    friend_email: str
    friend_avatar_url: str | None = None
    status: str
    created_at: str


class CommunityUserOut(BaseModel):
    id: int
    public_user_id: str
    email: str
    full_name: str | None
    avatar_url: str | None = None
    learning_language_code: str | None = None


class GroupRoomInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    passcode: str = Field(min_length=1, max_length=50)


class GroupRoomJoinInput(BaseModel):
    room_code: str = Field(min_length=1, max_length=24)
    passcode: str = Field(min_length=1, max_length=50)


class GroupRoomOut(BaseModel):
    id: int
    name: str
    room_code: str
    owner_user_id: int
    owner_public_user_id: str
    owner_name: str | None
    owner_avatar_url: str | None = None
    is_private: bool
    is_owner: bool
    member_count: int
    created_at: str


class GroupRoomMessageInput(BaseModel):
    content: str = Field(default="")
    image_url: str | None = Field(default=None, max_length=500000)
    audio_url: str | None = Field(default=None, max_length=500000)
    audio_name: str | None = Field(default=None, max_length=255)


class GroupRoomMessageOut(BaseModel):
    id: int
    room_id: int
    user_id: int
    user_public_user_id: str
    user_name: str | None
    user_avatar_url: str | None = None
    content: str
    image_url: str | None = None
    audio_url: str | None = None
    audio_name: str | None = None
    created_at: str
