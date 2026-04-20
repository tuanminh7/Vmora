import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Vmora API"
    debug: bool = False
    database_url: str = "postgresql+asyncpg://vmora:vmora@localhost:5432/vmora"
    frontend_origin: str = "http://localhost:5173"
    frontend_origins: str = "http://localhost:5173"
    allowed_hosts: str = "localhost,127.0.0.1"
    backend_public_url: str = "http://localhost:8000"
    database_auto_create: bool = True
    database_pool_size: int = 30
    database_max_overflow: int = 30
    database_pool_timeout: int = 30
    database_pool_recycle: int = 1800
    password_reset_mock: bool = True
    password_reset_otp_minutes: int = 10
    redis_url: str = "redis://localhost:6379/0"
    realtime_redis_enabled: bool = True
    realtime_redis_channel: str = "vmora:realtime"
    realtime_max_connections_per_instance: int = 6000
    realtime_max_connections_per_user: int = 3
    realtime_send_timeout_seconds: int = 5
    websocket_idle_timeout_seconds: int = 75
    websocket_ping_interval_seconds: int = 25
    rate_limit_enabled: bool = True
    rate_limit_redis_enabled: bool = True
    rate_limit_window_seconds: int = 60
    rate_limit_default_per_minute: int = 240
    rate_limit_write_per_minute: int = 80
    rate_limit_auth_per_minute: int = 20
    rate_limit_admin_per_minute: int = 300
    rate_limit_ws_connect_per_minute: int = 30
    momo_mock: bool = True
    momo_endpoint: str = "https://test-payment.momo.vn/v2/gateway/api/create"
    momo_partner_code: str = ""
    momo_access_key: str = ""
    momo_secret_key: str = ""
    momo_partner_name: str = "Vmora"
    momo_store_id: str = "VmoraStore"
    momo_redirect_url: str = "http://localhost:5173"
    momo_ipn_url: str = "http://localhost:8000/api/v1/payments/momo/ipn"
    gemini_api_keys: str = ""
    gemini_key_cooldown_seconds: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="VMORA_",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        raw = self.frontend_origins or self.frontend_origin
        return [item.strip() for item in raw.split(",") if item.strip()]

    @property
    def trusted_hosts(self) -> list[str]:
        return [item.strip() for item in self.allowed_hosts.split(",") if item.strip()]

    @property
    def gemini_api_key_pool(self) -> list[str]:
        keys: list[str] = []

        for chunk in self.gemini_api_keys.replace("\r", "\n").splitlines():
            for item in chunk.split(","):
                cleaned = item.strip()
                if cleaned:
                    keys.append(cleaned)

        for index in range(1, 11):
            cleaned = os.getenv(f"VMORA_GEMINI_API_KEY_{index}", "").strip()
            if cleaned:
                keys.append(cleaned)

        unique_keys: list[str] = []
        seen: set[str] = set()
        for key in keys:
            if key not in seen:
                seen.add(key)
                unique_keys.append(key)
        return unique_keys


settings = Settings()
