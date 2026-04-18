from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from contextlib import suppress
from typing import Deque

import redis.asyncio as redis

from app.core.config import settings


logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self) -> None:
        self._redis: redis.Redis | None = None
        self._redis_ready = False
        self._memory: dict[str, Deque[float]] = defaultdict(deque)
        self._allowed = 0
        self._blocked = 0

    async def start(self) -> None:
        if not settings.rate_limit_enabled or not settings.rate_limit_redis_enabled:
            logger.info("Rate limit Redis is disabled; using local in-process limiter")
            return

        try:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
            await self._redis.ping()
            self._redis_ready = True
            logger.info("Rate limiter Redis connected")
        except Exception:
            self._redis_ready = False
            logger.exception("Rate limiter Redis unavailable; falling back to local limiter")

    async def stop(self) -> None:
        if self._redis:
            with suppress(Exception):
                await self._redis.close()
        self._redis_ready = False

    async def check(self, *, key: str, limit: int, window_seconds: int) -> tuple[bool, int, int]:
        if not settings.rate_limit_enabled or limit <= 0:
            return True, limit, 0

        if self._redis_ready and self._redis is not None:
            try:
                return await self._check_redis(key=key, limit=limit, window_seconds=window_seconds)
            except Exception:
                self._redis_ready = False
                logger.exception("Rate limiter Redis failed; falling back to local limiter")

        return self._check_memory(key=key, limit=limit, window_seconds=window_seconds)

    async def _check_redis(self, *, key: str, limit: int, window_seconds: int) -> tuple[bool, int, int]:
        now = int(time.time())
        bucket = now // window_seconds
        redis_key = f"vmora:rate:{key}:{bucket}"
        count = await self._redis.incr(redis_key)  # type: ignore[union-attr]
        if count == 1:
            await self._redis.expire(redis_key, window_seconds + 2)  # type: ignore[union-attr]

        retry_after = max(1, window_seconds - (now % window_seconds))
        allowed = count <= limit
        remaining = max(0, limit - int(count))
        self._count(allowed)
        return allowed, remaining, retry_after if not allowed else 0

    def _check_memory(self, *, key: str, limit: int, window_seconds: int) -> tuple[bool, int, int]:
        now = time.time()
        bucket = self._memory[key]
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            self._count(False)
            return False, 0, retry_after

        bucket.append(now)
        self._count(True)
        return True, max(0, limit - len(bucket)), 0

    def _count(self, allowed: bool) -> None:
        if allowed:
            self._allowed += 1
        else:
            self._blocked += 1

    @property
    def redis_ready(self) -> bool:
        return self._redis_ready

    def stats(self) -> dict[str, object]:
        return {
            "enabled": settings.rate_limit_enabled,
            "redis_ready": self._redis_ready,
            "allowed": self._allowed,
            "blocked": self._blocked,
            "local_keys": len(self._memory),
        }


rate_limiter = RateLimiter()


async def start_rate_limiter() -> None:
    await rate_limiter.start()


async def stop_rate_limiter() -> None:
    await rate_limiter.stop()
