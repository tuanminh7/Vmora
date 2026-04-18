from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select

from app.core.security import hash_token
from app.db.session import AsyncSessionLocal
from app.models.feature import AdminGrant
from app.models.session_token import SessionToken
from app.models.user import User


async def get_current_user(authorization: str | None = Header(default=None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thiếu token đăng nhập")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ")

    async with AsyncSessionLocal() as session:
        token_result = await session.execute(select(SessionToken).where(SessionToken.token_hash == hash_token(token)))
        session_token = token_result.scalar_one_or_none()
        if session_token is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ")

        user_result = await session.execute(select(User).where(User.id == session_token.user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Người dùng không tồn tại")
        if user.is_locked:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đang bị khóa")

        return user


async def get_optional_current_user(authorization: str | None = Header(default=None)) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None

    async with AsyncSessionLocal() as session:
        token_result = await session.execute(select(SessionToken).where(SessionToken.token_hash == hash_token(token)))
        session_token = token_result.scalar_one_or_none()
        if session_token is None:
            return None

        user_result = await session.execute(select(User).where(User.id == session_token.user_id))
        user = user_result.scalar_one_or_none()
        if user is not None and user.is_locked:
            return None
        return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AdminGrant.id).where(AdminGrant.user_id == current_user.id))
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền admin")
    return current_user
