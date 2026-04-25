from datetime import timedelta
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import case, delete, select

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.core.security import generate_session_token, hash_password, hash_token, verify_password, utcnow
from app.db.session import AsyncSessionLocal
from app.models.feature import AdminGrant, PasswordResetOtp
from app.models.language import Language
from app.models.session_token import SessionToken
from app.models.user import User
from app.schemas.auth import (
    AdminContactProfileOut,
    AuthMessageOut,
    AuthTokenOut,
    LanguageUpdateInput,
    LoginInput,
    PasswordResetConfirmInput,
    PasswordResetRequestInput,
    ProfileUpdateInput,
    RegisterInput,
    UserOut,
)
from app.services.features import ensure_admin_bootstrap, is_admin

router = APIRouter(prefix="/v1", tags=["auth"])


def to_user_out(user: User, *, is_admin_user: bool = False) -> UserOut:
    return UserOut(
        id=user.id,
        public_user_id=str(user.id).zfill(5),
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        address=user.address,
        avatar_url=user.avatar_url,
        is_locked=user.is_locked,
        is_verified=user.is_verified,
        learning_language_code=user.learning_language_code,
        is_admin=is_admin_user,
    )


def to_admin_contact_profile_out(user: User) -> AdminContactProfileOut:
    return AdminContactProfileOut(
        public_user_id=str(user.id).zfill(5),
        email=user.email,
        full_name=user.full_name,
        phone_number=user.phone_number,
        address=user.address,
        avatar_url=user.avatar_url,
    )


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


@router.post("/auth/register", response_model=AuthMessageOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterInput):
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).where(User.email == payload.email.lower()))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email đã tồn tại")

        user = User(
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            pin_hash=hash_password(payload.pin),
        )
        session.add(user)
        await session.flush()

        await ensure_admin_bootstrap(session, user)
        await session.commit()

        return AuthMessageOut(message="Đăng ký thành công, hãy đăng nhập bằng Gmail và Pass.")


@router.post("/auth/login", response_model=AuthTokenOut)
async def login(payload: LoginInput):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == payload.email.lower()))
        user = result.scalar_one_or_none()

        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng",
            )

        if user.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đang bị khóa",
            )

        raw_token = generate_session_token()
        session.add(SessionToken(user_id=user.id, token_hash=hash_token(raw_token)))
        await ensure_admin_bootstrap(session, user)
        await session.commit()

        return AuthTokenOut(access_token=raw_token)


@router.post("/auth/password-reset/request", response_model=AuthMessageOut)
async def request_password_reset(payload: PasswordResetRequestInput):
    message = "Nếu email tồn tại, hệ thống đã tạo mã OTP đặt lại mật khẩu."
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == payload.email.lower()))
        user = result.scalar_one_or_none()
        if user is None:
            return AuthMessageOut(message=message)
        if not user.pin_hash or not verify_password(payload.pin, user.pin_hash):
            return AuthMessageOut(message=message)

        otp_code = generate_otp_code()
        now = utcnow()
        await session.execute(
            delete(PasswordResetOtp).where(
                PasswordResetOtp.user_id == user.id,
                PasswordResetOtp.used_at.is_(None),
            )
        )
        session.add(
            PasswordResetOtp(
                user_id=user.id,
                otp_hash=hash_token(otp_code),
                expires_at=now + timedelta(minutes=settings.password_reset_otp_minutes),
            )
        )
        await session.commit()

        return AuthMessageOut(
            message=message,
            dev_otp=otp_code if settings.password_reset_mock else None,
        )


@router.post("/auth/password-reset/confirm", response_model=AuthMessageOut)
async def confirm_password_reset(payload: PasswordResetConfirmInput):
    async with AsyncSessionLocal() as session:
        user_result = await session.execute(select(User).where(User.email == payload.email.lower()))
        user = user_result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP không hợp lệ hoặc đã hết hạn")

        now = utcnow()
        otp_result = await session.execute(
            select(PasswordResetOtp)
            .where(
                PasswordResetOtp.user_id == user.id,
                PasswordResetOtp.used_at.is_(None),
                PasswordResetOtp.expires_at >= now,
            )
            .order_by(PasswordResetOtp.created_at.desc())
        )
        otp = otp_result.scalars().first()
        if otp is None or otp.attempts >= 5:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP không hợp lệ hoặc đã hết hạn")

        if otp.otp_hash != hash_token(payload.otp_code):
            otp.attempts += 1
            await session.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP không hợp lệ hoặc đã hết hạn")

        user.password_hash = hash_password(payload.new_password)
        otp.used_at = now
        await session.execute(delete(SessionToken).where(SessionToken.user_id == user.id))
        await session.commit()
        return AuthMessageOut(message="Đã đặt lại mật khẩu, bạn có thể đăng nhập bằng mật khẩu mới.")


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: User = Depends(get_current_user),
    authorization: str | None = Header(default=None),
):
    token = authorization.removeprefix("Bearer ").strip() if authorization else ""
    async with AsyncSessionLocal() as session:
        await session.execute(delete(SessionToken).where(SessionToken.token_hash == hash_token(token)))
        await session.commit()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        admin_state = await ensure_admin_bootstrap(session, current_user)
        await session.commit()
    return to_user_out(current_user, is_admin_user=admin_state)


@router.get("/support/admin-profile", response_model=AdminContactProfileOut)
async def get_admin_contact_profile():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User)
            .join(AdminGrant, AdminGrant.user_id == User.id)
            .order_by(
                case((User.email == "admin@vmora.local", 0), else_=1),
                AdminGrant.created_at.asc(),
                User.id.asc(),
            )
            .limit(1)
        )
        admin_user = result.scalar_one_or_none()
        if admin_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chưa có admin hỗ trợ")
        return to_admin_contact_profile_out(admin_user)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: ProfileUpdateInput, current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one()

        user.full_name = payload.full_name
        user.phone_number = payload.phone_number
        user.address = payload.address
        user.avatar_url = payload.avatar_url
        await session.commit()
        await session.refresh(user)

        admin_state = await is_admin(session, user.id)
        return to_user_out(user, is_admin_user=admin_state)


@router.patch("/me/language", response_model=UserOut)
async def update_learning_language(
    payload: LanguageUpdateInput,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        language_result = await session.execute(
            select(Language).where(Language.code == payload.learning_language_code)
        )
        language = language_result.scalar_one_or_none()
        if language is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ngôn ngữ không tồn tại")

        user_result = await session.execute(select(User).where(User.id == current_user.id))
        user = user_result.scalar_one()
        user.learning_language_code = payload.learning_language_code
        await session.commit()
        await session.refresh(user)

        admin_state = await is_admin(session, user.id)
        return to_user_out(user, is_admin_user=admin_state)
