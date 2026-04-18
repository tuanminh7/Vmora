from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from contextlib import suppress
from typing import Any

import redis.asyncio as redis
from fastapi import WebSocket

from app.core.config import settings


logger = logging.getLogger(__name__)


class RealtimeManager:
    def __init__(self) -> None:
        self._user_connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._redis: redis.Redis | None = None
        self._pubsub: redis.client.PubSub | None = None
        self._listener_task: asyncio.Task | None = None
        self._redis_ready = False
        self._published_messages = 0
        self._delivered_messages = 0
        self._dropped_messages = 0

    async def start(self) -> None:
        if not settings.realtime_redis_enabled:
            logger.info("Realtime Redis is disabled; using in-process delivery only")
            return

        try:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
            await self._redis.ping()
            self._pubsub = self._redis.pubsub()
            await self._pubsub.subscribe(settings.realtime_redis_channel)
            self._listener_task = asyncio.create_task(self._listen_redis())
            self._redis_ready = True
            logger.info("Realtime Redis pub/sub connected")
        except Exception:
            self._redis_ready = False
            logger.exception("Realtime Redis unavailable; falling back to local delivery")

    async def stop(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._listener_task
        if self._pubsub:
            with suppress(Exception):
                await self._pubsub.unsubscribe(settings.realtime_redis_channel)
                await self._pubsub.close()
        if self._redis:
            with suppress(Exception):
                await self._redis.close()
        self._redis_ready = False

    async def connect(self, *, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._user_connections[user_id].add(websocket)

    def disconnect(self, *, user_id: int, websocket: WebSocket) -> None:
        connections = self._user_connections.get(user_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._user_connections.pop(user_id, None)

    async def send_to_user(self, *, user_id: int, event: str, payload: dict[str, Any] | None = None) -> None:
        envelope = {"scope": "user", "user_id": user_id, "event": event, "payload": payload or {}}
        await self._publish_or_deliver(envelope)

    async def broadcast(self, *, event: str, payload: dict[str, Any] | None = None) -> None:
        envelope = {"scope": "broadcast", "event": event, "payload": payload or {}}
        await self._publish_or_deliver(envelope)

    async def _publish_or_deliver(self, envelope: dict[str, Any]) -> None:
        if self._redis_ready and self._redis is not None:
            try:
                await self._redis.publish(settings.realtime_redis_channel, json.dumps(envelope, ensure_ascii=False))
                self._published_messages += 1
                return
            except Exception:
                self._redis_ready = False
                logger.exception("Realtime Redis publish failed; falling back to local delivery")

        await self._deliver(envelope)

    async def _listen_redis(self) -> None:
        if self._pubsub is None:
            return

        async for message in self._pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                envelope = json.loads(message.get("data") or "{}")
                await self._deliver(envelope)
            except Exception:
                logger.exception("Invalid realtime Redis message")

    async def _deliver(self, envelope: dict[str, Any]) -> None:
        if envelope.get("scope") == "user":
            await self._deliver_to_user(
                user_id=int(envelope["user_id"]),
                event=envelope["event"],
                payload=envelope.get("payload") or {},
            )
            return

        if envelope.get("scope") == "broadcast":
            for user_id in list(self._user_connections.keys()):
                await self._deliver_to_user(
                    user_id=user_id,
                    event=envelope["event"],
                    payload=envelope.get("payload") or {},
                )

    async def _deliver_to_user(self, *, user_id: int, event: str, payload: dict[str, Any]) -> None:
        connections = list(self._user_connections.get(user_id, set()))
        for websocket in connections:
            try:
                await asyncio.wait_for(
                    websocket.send_json({"event": event, "payload": payload}),
                    timeout=settings.realtime_send_timeout_seconds,
                )
                self._delivered_messages += 1
            except Exception:
                self._dropped_messages += 1
                self.disconnect(user_id=user_id, websocket=websocket)

    def active_connection_count(self) -> int:
        return sum(len(connections) for connections in self._user_connections.values())

    def user_connection_count(self, user_id: int) -> int:
        return len(self._user_connections.get(user_id, set()))

    def can_accept(self, *, user_id: int) -> bool:
        if self.active_connection_count() >= settings.realtime_max_connections_per_instance:
            return False
        if self.user_connection_count(user_id) >= settings.realtime_max_connections_per_user:
            return False
        return True

    @property
    def redis_ready(self) -> bool:
        return self._redis_ready

    def stats(self) -> dict[str, Any]:
        return {
            "redis_ready": self._redis_ready,
            "active_users": len(self._user_connections),
            "active_connections": self.active_connection_count(),
            "max_connections_per_instance": settings.realtime_max_connections_per_instance,
            "max_connections_per_user": settings.realtime_max_connections_per_user,
            "published_messages": self._published_messages,
            "delivered_messages": self._delivered_messages,
            "dropped_messages": self._dropped_messages,
        }


manager = RealtimeManager()


async def start_realtime() -> None:
    await manager.start()


async def stop_realtime() -> None:
    await manager.stop()


async def send_user_event(user_id: int, event: str, payload: dict[str, Any] | None = None) -> None:
    await manager.send_to_user(user_id=user_id, event=event, payload=payload)


async def broadcast_event(event: str, payload: dict[str, Any] | None = None) -> None:
    await manager.broadcast(event=event, payload=payload)
