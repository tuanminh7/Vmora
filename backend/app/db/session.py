import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base

import app.models  # noqa: F401

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_recycle=settings.database_pool_recycle,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
logger = logging.getLogger(__name__)


async def check_database() -> bool:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def init_db() -> None:
    if not settings.database_auto_create:
        logger.info("Database auto-create is disabled")
        return

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT"))
        await connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL"))
        await connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL"))
        await connection.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true NOT NULL"))
        await connection.execute(text("ALTER TABLE course_sections ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true NOT NULL"))
        await connection.execute(text("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true NOT NULL"))
        await connection.execute(text("ALTER TABLE user_vocabulary_items ADD COLUMN IF NOT EXISTS level_code VARCHAR(40) DEFAULT 'basic' NOT NULL"))
        await connection.execute(text("ALTER TABLE user_vocabulary_items ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false NOT NULL"))
        await connection.execute(text("ALTER TABLE user_vocabulary_items ADD COLUMN IF NOT EXISTS is_in_practice BOOLEAN DEFAULT false NOT NULL"))
        await connection.execute(text("ALTER TABLE pet_profiles ADD COLUMN IF NOT EXISTS color_theme VARCHAR(80) DEFAULT 'forest' NOT NULL"))
        await connection.execute(text("ALTER TABLE pet_profiles ADD COLUMN IF NOT EXISTS voice_code VARCHAR(80) DEFAULT 'warm' NOT NULL"))
        await connection.execute(text("ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_admin_id INTEGER"))
        await connection.execute(text("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS room_status VARCHAR(40) DEFAULT 'waiting' NOT NULL"))
        await connection.execute(text("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS room_started_at TIMESTAMP WITH TIME ZONE"))
        await connection.execute(text("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url TEXT"))
        await connection.execute(text("ALTER TABLE group_room_messages ADD COLUMN IF NOT EXISTS image_url TEXT"))
        await connection.execute(text("ALTER TABLE group_room_messages ADD COLUMN IF NOT EXISTS audio_url TEXT"))
        await connection.execute(text("ALTER TABLE group_room_messages ADD COLUMN IF NOT EXISTS audio_name VARCHAR(255)"))
    logger.info("Database schema ensured")
