import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.core.config import settings

T = TypeVar("T")


class NoGeminiApiKeyError(RuntimeError):
    pass


class GeminiApiKeyRotator:
    def __init__(self) -> None:
        self._cursor = 0
        self._cooldowns: dict[str, float] = {}
        self._lock = asyncio.Lock()

    @property
    def keys(self) -> list[str]:
        return settings.gemini_api_key_pool

    async def acquire(self) -> str:
        keys = self.keys
        if not keys:
            raise NoGeminiApiKeyError("No Gemini API keys configured in VMORA_GEMINI_API_KEYS or VMORA_GEMINI_API_KEY_1..10.")

        now = time.monotonic()
        async with self._lock:
            for _ in range(len(keys)):
                key = keys[self._cursor % len(keys)]
                self._cursor = (self._cursor + 1) % len(keys)
                if self._cooldowns.get(key, 0) <= now:
                    return key

        raise NoGeminiApiKeyError("All Gemini API keys are temporarily rate limited.")

    async def mark_rate_limited(self, key: str, cooldown_seconds: int | None = None) -> None:
        cooldown = cooldown_seconds or settings.gemini_key_cooldown_seconds
        async with self._lock:
            self._cooldowns[key] = time.monotonic() + cooldown

    @staticmethod
    def is_rate_limit_error(error: BaseException) -> bool:
        text = str(error).lower()
        markers = ("429", "quota", "rate limit", "resource exhausted", "too many requests")
        return any(marker in text for marker in markers)

    async def run_with_rotation(self, call: Callable[[str], Awaitable[T]]) -> T:
        last_error: BaseException | None = None

        for _ in range(max(1, len(self.keys))):
            key = await self.acquire()
            try:
                return await call(key)
            except Exception as exc:
                if not self.is_rate_limit_error(exc):
                    raise
                await self.mark_rate_limited(key)
                last_error = exc

        raise NoGeminiApiKeyError("All Gemini API keys hit rate limits.") from last_error


gemini_key_rotator = GeminiApiKeyRotator()
