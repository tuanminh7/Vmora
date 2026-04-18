from fastapi import APIRouter

from app.db.session import check_database
from app.services.metrics import metrics
from app.services.rate_limit import rate_limiter
from app.services.realtime import manager

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    database_connected = await check_database()

    return {
        "status": "ok",
        "database": "connected" if database_connected else "disconnected",
        "redis": "connected" if manager.redis_ready or rate_limiter.redis_ready else "not_ready",
    }


@router.get("/metrics")
async def metrics_check():
    return {
        "status": "ok",
        "metrics": metrics.snapshot(),
        "realtime": manager.stats(),
        "rate_limit": rate_limiter.stats(),
    }
