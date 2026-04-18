from __future__ import annotations

import hashlib
import secrets
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feature import (
    AdminGrant,
    GroupRoom,
    Notification,
    PetProfile,
    PetVoiceMessage,
    StudyStreak,
    utc_now,
)
from app.models.user import User
from app.services.realtime import broadcast_event, send_user_event


async def is_admin(session: AsyncSession, user_id: int) -> bool:
    result = await session.execute(select(AdminGrant.id).where(AdminGrant.user_id == user_id).limit(1))
    return result.scalar_one_or_none() is not None


async def ensure_admin_bootstrap(session: AsyncSession, user: User) -> bool:
    count_result = await session.execute(select(func.count(AdminGrant.id)))
    admin_count = count_result.scalar_one()
    if admin_count > 0:
        return await is_admin(session, user.id)

    session.add(AdminGrant(user_id=user.id))
    await session.flush()
    return True


async def create_notification(
    session: AsyncSession,
    *,
    user_id: int | None,
    title: str,
    content: str,
    notification_type: str = "system",
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        content=content,
        notification_type=notification_type,
    )
    session.add(notification)
    await session.flush()
    event_payload = {
        "id": notification.id,
        "title": notification.title,
        "content": notification.content,
        "notification_type": notification.notification_type,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat(),
    }
    if user_id is None:
        await broadcast_event("notification:new", {"notification": event_payload})
    else:
        await send_user_event(user_id, "notification:new", {"notification": event_payload})
    return notification


async def get_or_create_pet(session: AsyncSession, *, user_id: int) -> PetProfile:
    result = await session.execute(select(PetProfile).where(PetProfile.user_id == user_id))
    pet = result.scalar_one_or_none()
    if pet is not None:
        return pet

    pet = PetProfile(user_id=user_id)
    session.add(pet)
    await session.flush()
    return pet


async def award_pet_experience(session: AsyncSession, *, user_id: int, points: int) -> PetProfile:
    pet = await get_or_create_pet(session, user_id=user_id)
    pet.experience += points
    pet.level = max(1, pet.experience // 100 + 1)
    pet.mood = "excited" if points >= 20 else "happy"
    pet.updated_at = utc_now()
    await session.flush()
    return pet


async def get_or_create_streak(session: AsyncSession, *, user_id: int) -> StudyStreak:
    result = await session.execute(select(StudyStreak).where(StudyStreak.user_id == user_id))
    streak = result.scalar_one_or_none()
    if streak is not None:
        return streak

    streak = StudyStreak(user_id=user_id)
    session.add(streak)
    await session.flush()
    return streak


async def check_in_streak(session: AsyncSession, *, user_id: int) -> StudyStreak:
    streak = await get_or_create_streak(session, user_id=user_id)
    today = utc_now().date()
    last_check_in = streak.last_check_in_at.date() if streak.last_check_in_at else None

    if last_check_in == today:
        return streak

    if last_check_in and (today - last_check_in).days == 1:
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_check_in_at = utc_now()
    streak.updated_at = utc_now()
    await session.flush()
    return streak


def build_pet_reply(pet: PetProfile, message: str) -> str:
    clean_message = " ".join(message.strip().split())
    if not clean_message:
        return f"{pet.name} đang chờ bạn nói chuyện."

    prefix = f"{pet.name} ({pet.pet_type}, giọng {pet.voice_code})"
    if pet.level >= 5:
        return f"{prefix}: Mình đã nghe '{clean_message}'. Cứ giữ nhịp học này, bạn đang tiến rất tốt."
    if pet.mood == "excited":
        return f"{prefix}: '{clean_message}' nghe hay đó. Làm thêm một chút nữa để mình lên level cùng bạn."
    return f"{prefix}: Mình ghi nhớ '{clean_message}'. Hôm nay mình vẫn đồng hành với bạn."


async def store_pet_exchange(session: AsyncSession, *, user_id: int, message: str, reply: str) -> list[PetVoiceMessage]:
    user_message = PetVoiceMessage(user_id=user_id, role="user", content=message)
    pet_message = PetVoiceMessage(user_id=user_id, role="pet", content=reply)
    session.add(user_message)
    session.add(pet_message)
    await session.flush()
    return [user_message, pet_message]


def hash_group_passcode(passcode: str) -> str:
    return hashlib.sha256(passcode.encode("utf-8")).hexdigest()


async def generate_group_room_code(session: AsyncSession) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        room_code = "".join(secrets.choice(alphabet) for _ in range(6))
        result = await session.execute(select(GroupRoom.id).where(GroupRoom.room_code == room_code).limit(1))
        if result.scalar_one_or_none() is None:
            return room_code
