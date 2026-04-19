from __future__ import annotations

import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_token
from app.db.session import AsyncSessionLocal
from app.models.session_token import SessionToken
from app.models.user import User
from app.services.metrics import metrics
from app.services.rate_limit import rate_limiter
from app.services.realtime import manager


router = APIRouter(prefix="/v1/realtime", tags=["realtime"])


def websocket_client_key(websocket: WebSocket) -> str:
    forwarded_for = websocket.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_host = websocket.client.host if websocket.client else "unknown"
    return forwarded_for or client_host


async def authenticate_websocket(websocket: WebSocket) -> User | None:
    token = websocket.query_params.get("token", "").strip()
    if not token:
        return None

    async with AsyncSessionLocal() as session:
        token_result = await session.execute(select(SessionToken).where(SessionToken.token_hash == hash_token(token)))
        session_token = token_result.scalar_one_or_none()
        if session_token is None:
            return None

        user_result = await session.execute(select(User).where(User.id == session_token.user_id))
        return user_result.scalar_one_or_none()


@router.websocket("/ws")
async def realtime_ws(websocket: WebSocket):
    client_key = websocket_client_key(websocket)
    allowed, _, retry_after = await rate_limiter.check(
        key=f"ws:ip:{client_key}",
        limit=settings.rate_limit_ws_connect_per_minute,
        window_seconds=settings.rate_limit_window_seconds,
    )
    if not allowed:
        metrics.realtime_rejected()
        await websocket.close(code=1013, reason=f"Too many connections. Retry after {retry_after}s")
        return

    user = await authenticate_websocket(websocket)
    if user is None:
        metrics.realtime_rejected()
        await websocket.close(code=1008)
        return

    allowed, _, retry_after = await rate_limiter.check(
        key=f"ws:user:{user.id}",
        limit=settings.rate_limit_ws_connect_per_minute,
        window_seconds=settings.rate_limit_window_seconds,
    )
    if not allowed or not manager.can_accept(user_id=user.id):
        metrics.realtime_rejected()
        await websocket.close(code=1013, reason=f"Realtime busy. Retry after {retry_after or 10}s")
        return

    await manager.connect(user_id=user.id, websocket=websocket)
    metrics.realtime_accepted()

    try:
        await websocket.send_json(
            {
                "event": "system:connected",
                "payload": {
                    "user_id": user.id,
                    "learning_language_code": user.learning_language_code,
                },
            }
        )

        while True:
            raw_message = await asyncio.wait_for(
                websocket.receive_text(),
                timeout=settings.websocket_idle_timeout_seconds,
            )
            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                continue

            if message.get("event") == "system:ping":
                await websocket.send_json(
                    {
                        "event": "system:pong",
                        "payload": {
                            "server_time": int(time.time()),
                            "client_time": message.get("client_time"),
                        },
                    }
                )
    except asyncio.TimeoutError:
        await websocket.close(code=1001, reason="Realtime heartbeat timeout")
    except WebSocketDisconnect:
        manager.disconnect(user_id=user.id, websocket=websocket)
    except Exception:
        manager.disconnect(user_id=user.id, websocket=websocket)
        raise
    finally:
        manager.disconnect(user_id=user.id, websocket=websocket)
