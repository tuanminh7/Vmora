import hashlib
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse

from app.api.routes.admin import router as admin_router
from app.api.routes.admin_workspace import router as admin_workspace_router
from app.api.routes.auth import router as auth_router
from app.api.routes.features import router as features_router
from app.api.routes.health import router as health_router
from app.api.routes.learning import router as learning_router
from app.api.routes.packages import router as packages_router
from app.api.routes.payments import router as payments_router
from app.api.routes.practice import router as practice_router
from app.api.routes.realtime import router as realtime_router
from app.api.routes.vocabulary import router as vocabulary_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import init_db
from app.services.metrics import metrics
from app.services.rate_limit import rate_limiter, start_rate_limiter, stop_rate_limiter
from app.services.realtime import start_realtime, stop_realtime


setup_logging()
logger = logging.getLogger(__name__)
app = FastAPI(title=settings.app_name)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.trusted_hosts,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(admin_workspace_router, prefix="/api")
app.include_router(features_router, prefix="/api")
app.include_router(learning_router, prefix="/api")
app.include_router(packages_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(practice_router, prefix="/api")
app.include_router(realtime_router, prefix="/api")
app.include_router(vocabulary_router, prefix="/api")


def get_client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_host = request.client.host if request.client else "unknown"
    auth_header = request.headers.get("authorization", "")
    if auth_header:
        token_hash = hashlib.sha256(auth_header.encode("utf-8")).hexdigest()[:20]
        return f"user-token:{token_hash}"
    return forwarded_for or client_host


def get_rate_limit_bucket(request: Request) -> tuple[str, int] | None:
    path = request.url.path
    if path in {"/", "/api/health", "/api/metrics"} or path.startswith("/docs") or path.startswith("/openapi"):
        return None
    if path.startswith("/api/v1/auth/"):
        return "auth", settings.rate_limit_auth_per_minute
    if path.startswith("/api/v1/admin"):
        return "admin", settings.rate_limit_admin_per_minute
    if request.method in {"POST", "PATCH", "DELETE"}:
        return "write", settings.rate_limit_write_per_minute
    return "default", settings.rate_limit_default_per_minute


@app.middleware("http")
async def apply_rate_limit(request: Request, call_next):
    bucket = get_rate_limit_bucket(request)
    if bucket is None:
        return await call_next(request)

    bucket_name, limit = bucket
    client_key = get_client_key(request)
    allowed, remaining, retry_after = await rate_limiter.check(
        key=f"http:{bucket_name}:{client_key}",
        limit=limit,
        window_seconds=settings.rate_limit_window_seconds,
    )
    if not allowed:
        metrics.rate_limited()
        return JSONResponse(
            status_code=429,
            content={"detail": "Qua nhieu yeu cau, hay thu lai sau."},
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response


@app.middleware("http")
async def add_request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    started_at = time.perf_counter()
    metrics.http_started()
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
        metrics.http_finished(500)
        logger.exception(
            "Unhandled request error request_id=%s method=%s path=%s elapsed_ms=%s",
            request_id,
            request.method,
            request.url.path,
            elapsed_ms,
        )
        raise

    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    response.headers["x-request-id"] = request_id
    metrics.http_finished(response.status_code)
    logger.info(
        "request_id=%s method=%s path=%s status=%s elapsed_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.on_event("startup")
async def on_startup():
    await init_db()
    await start_rate_limiter()
    await start_realtime()
    logger.info("Vmora API started")


@app.on_event("shutdown")
async def on_shutdown():
    await stop_realtime()
    await stop_rate_limiter()
    logger.info("Vmora API stopped")


@app.get("/")
async def root():
    return {"message": "Vmora API is running"}
