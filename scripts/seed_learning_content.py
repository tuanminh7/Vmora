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
from app.models.course import Course, CourseSection, Lesson
from app.models.language import Language
from app.models.level import Level
from app.models.roadmap import Roadmap, RoadmapStage


CUSTOM_CONTENT_FILE = ROOT_DIR / "data" / "seed" / "learning_content_en_zh.json"


LANGUAGE_CONTENT = {
    "en": {
        "level_code": "A1",
        "level_title": "A1 - Nền tảng",
        "roadmap_title": "Lộ trình tiếng Anh A1",
        "free_course": "Tiếng Anh miễn phí cho người mới",
        "paid_course": "Tiếng Anh giao tiếp mở rộng",
    },
    "ja": {
        "level_code": "N5",
        "level_title": "N5 - Nhập môn",
        "roadmap_title": "Lộ trình tiếng Nhật N5",
        "free_course": "Tiếng Nhật miễn phí cho người mới",
        "paid_course": "Tiếng Nhật N5 mở rộng",
    },
    "ko": {
        "level_code": "TOPIK1",
        "level_title": "TOPIK 1 - Nhập môn",
        "roadmap_title": "Lộ trình tiếng Hàn TOPIK 1",
        "free_course": "Tiếng Hàn miễn phí cho người mới",
        "paid_course": "Tiếng Hàn TOPIK 1 mở rộng",
    },
    "zh": {
        "level_code": "HSK1",
        "level_title": "HSK 1 - Nhập môn",
        "roadmap_title": "Lộ trình tiếng Trung HSK 1",
        "free_course": "Tiếng Trung miễn phí cho người mới",
        "paid_course": "Tiếng Trung HSK 1 mở rộng",
    },
    "de": {
        "level_code": "A1",
        "level_title": "A1 - Nền tảng",
        "roadmap_title": "Lộ trình tiếng Đức A1",
        "free_course": "Tiếng Đức miễn phí cho người mới",
        "paid_course": "Tiếng Đức giao tiếp mở rộng",
    },
}


STAGES = [
    ("Làm quen", "Nắm phát âm, chào hỏi và từ vựng cơ bản."),
    ("Xây nền", "Học cấu trúc câu, mẫu giao tiếp và phản xạ nghe đọc."),
    ("Ứng dụng", "Luyện bài học ngắn, ôn tập và chuẩn bị kiểm tra."),
]


FREE_SECTIONS = [
    (
        "Bắt đầu học",
        "Các bài đầu tiên để người dùng vào học ngay với gói free.",
        [
            ("Chào hỏi cơ bản", "Học cách chào hỏi và giới thiệu bản thân.", "Bài học này tập trung vào từ vựng chào hỏi, câu mẫu ngắn và cách dùng trong tình huống hằng ngày."),
            ("Từ vựng thiết yếu", "Làm quen với nhóm từ thường gặp nhất.", "Người học ghi nhớ từ phổ biến, cách đọc và nghĩa để chuẩn bị cho ôn luyện."),
            ("Câu mẫu đầu tiên", "Ghép từ vựng thành câu đơn giản.", "Bài học hướng dẫn dùng từ vừa học trong các mẫu câu ngắn, dễ áp dụng."),
        ],
    )
]


PAID_SECTIONS = [
    (
        "Mở rộng kỹ năng",
        "Các bài học nâng cao hơn dành cho gói mua.",
        [
            ("Nghe và phản xạ", "Luyện nghe câu ngắn và chọn ý đúng.", "Bài học dùng audio và câu hỏi ngắn để tăng phản xạ nghe hiểu."),
            ("Viết câu ngắn", "Luyện viết câu đơn giản theo chủ đề.", "Người học thực hành viết câu dựa trên từ vựng, ngữ pháp và ví dụ đã học."),
            ("Ôn tập cuối chặng", "Tổng hợp lại kiến thức của chặng.", "Bài học giúp người học kiểm tra lại từ vựng, câu mẫu và điểm cần luyện thêm."),
        ],
    )
]


def load_custom_content() -> dict:
    if not CUSTOM_CONTENT_FILE.exists():
        return {}
    return json.loads(CUSTOM_CONTENT_FILE.read_text(encoding="utf-8"))


def normalize_sections(sections: list[dict]) -> list[tuple[str, str, list[tuple[str, str, str]]]]:
    normalized = []
    for section in sections:
        lessons = []
        for lesson in section.get("lessons", []):
            lessons.append((lesson["title"], lesson["summary"], lesson["content"]))
        normalized.append((section["title"], section["description"], lessons))
    return normalized


async def get_or_create_level(session, language_code: str, config: dict) -> Level:
    result = await session.execute(
        select(Level).where(Level.language_code == language_code, Level.code == config["level_code"])
    )
    level = result.scalar_one_or_none()
    if level:
        return level

    level = Level(
        language_code=language_code,
        code=config["level_code"],
        title=config["level_title"],
        description="Cấp độ đầu tiên để người học bắt đầu theo lộ trình.",
        order_index=1,
    )
    session.add(level)
    await session.flush()
    return level


async def get_or_create_roadmap(session, language_code: str, config: dict, level: Level) -> Roadmap:
    result = await session.execute(
        select(Roadmap).where(Roadmap.language_code == language_code, Roadmap.title == config["roadmap_title"])
    )
    roadmap = result.scalar_one_or_none()
    if roadmap:
        return roadmap

    roadmap = Roadmap(
        language_code=language_code,
        level_id=level.id,
        title=config["roadmap_title"],
        description="Lộ trình mẫu dùng để nối luồng khóa học, học tập và bài học đầu tiên.",
    )
    session.add(roadmap)
    await session.flush()

    for index, (title, description) in enumerate(STAGES, start=1):
        session.add(
            RoadmapStage(
                roadmap_id=roadmap.id,
                title=title,
                description=description,
                order_index=index,
            )
        )

    await session.flush()
    return roadmap


async def get_stages(session, roadmap: Roadmap) -> list[RoadmapStage]:
    result = await session.execute(
        select(RoadmapStage)
        .where(RoadmapStage.roadmap_id == roadmap.id)
        .order_by(RoadmapStage.order_index.asc())
    )
    return result.scalars().all()


async def create_course_if_missing(
    session,
    language_code: str,
    level: Level,
    roadmap: Roadmap,
    stages: list[RoadmapStage],
    title: str,
    description: str,
    is_free: bool,
    order_index: int,
    sections_payload: list,
) -> bool:
    result = await session.execute(
        select(Course).where(Course.language_code == language_code, Course.title == title)
    )
    course = result.scalar_one_or_none()
    changed = False

    if course is None:
        course = Course(
            language_code=language_code,
            level_id=level.id,
            roadmap_id=roadmap.id,
            title=title,
            description=description,
            is_free=is_free,
            order_index=order_index,
        )
        session.add(course)
        await session.flush()
        changed = True
    else:
        course.level_id = level.id
        course.roadmap_id = roadmap.id
        course.description = description
        course.is_free = is_free
        course.order_index = order_index

    first_stage_id = stages[0].id if stages else None
    for section_index, (section_title, section_description, lessons) in enumerate(sections_payload, start=1):
        section_result = await session.execute(
            select(CourseSection).where(CourseSection.course_id == course.id, CourseSection.title == section_title)
        )
        section = section_result.scalar_one_or_none()
        if section is None:
            section = CourseSection(
                course_id=course.id,
                title=section_title,
                description=section_description,
                order_index=section_index,
            )
            session.add(section)
            await session.flush()
            changed = True
        else:
            section.description = section_description
            section.order_index = section_index

        for lesson_index, (lesson_title, summary, content) in enumerate(lessons, start=1):
            lesson_result = await session.execute(
                select(Lesson).where(Lesson.section_id == section.id, Lesson.title == lesson_title)
            )
            lesson = lesson_result.scalar_one_or_none()
            if lesson is None:
                session.add(
                    Lesson(
                        section_id=section.id,
                        stage_id=first_stage_id,
                        title=lesson_title,
                        summary=summary,
                        content=content,
                        order_index=lesson_index,
                        estimated_minutes=8 + lesson_index * 2,
                        is_free_preview=is_free or lesson_index == 1,
                    )
                )
                changed = True
            else:
                lesson.stage_id = first_stage_id
                lesson.summary = summary
                lesson.content = content
                lesson.order_index = lesson_index
                lesson.estimated_minutes = 8 + lesson_index * 2
                lesson.is_free_preview = is_free or lesson_index == 1

    await session.flush()
    return changed


async def seed(languages: set[str] | None = None) -> None:
    inserted_courses = 0
    custom_content = load_custom_content()

    await init_db()

    async with AsyncSessionLocal() as session:
        for language_code, config in LANGUAGE_CONTENT.items():
            if languages and language_code not in languages:
                continue
            language_result = await session.execute(select(Language).where(Language.code == language_code))
            if language_result.scalar_one_or_none() is None:
                continue

            level = await get_or_create_level(session, language_code, config)
            roadmap = await get_or_create_roadmap(session, language_code, config, level)
            stages = await get_stages(session, roadmap)

            free_title = config["free_course"]
            free_description = "Khoa hoc free de nguoi dung bat dau ngay ma khong can mua goi."
            free_sections = FREE_SECTIONS
            paid_title = config["paid_course"]
            paid_description = "Khoa hoc tra phi de mo rong noi dung va ky nang luyen tap."
            paid_sections = PAID_SECTIONS

            custom_language = custom_content.get(language_code)
            if custom_language:
                level.code = custom_language.get("level_code", level.code)
                level.title = custom_language.get("level_title", level.title)
                roadmap.title = custom_language.get("roadmap_title", roadmap.title)

                free_course_payload = custom_language.get("free_course", {})
                paid_course_payload = custom_language.get("paid_course", {})
                free_title = free_course_payload.get("title", free_title)
                free_description = free_course_payload.get("description", free_description)
                free_sections = normalize_sections(free_course_payload.get("sections", [])) or free_sections
                paid_title = paid_course_payload.get("title", paid_title)
                paid_description = paid_course_payload.get("description", paid_description)
                paid_sections = normalize_sections(paid_course_payload.get("sections", [])) or paid_sections

            free_created = await create_course_if_missing(
                session=session,
                language_code=language_code,
                level=level,
                roadmap=roadmap,
                stages=stages,
                title=free_title,
                description=free_description,
                is_free=True,
                order_index=1,
                sections_payload=free_sections,
            )
            paid_created = await create_course_if_missing(
                session=session,
                language_code=language_code,
                level=level,
                roadmap=roadmap,
                stages=stages,
                title=paid_title,
                description=paid_description,
                is_free=False,
                order_index=2,
                sections_payload=paid_sections,
            )
            inserted_courses += int(free_created) + int(paid_created)

        await session.commit()

    print(f"Seeded learning content, inserted {inserted_courses} courses")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Chi seed cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()
    languages = set(args.languages) if args.languages else None
    asyncio.run(seed(languages=languages))


if __name__ == "__main__":
    main()
