from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps.auth import get_current_user
from app.db.session import AsyncSessionLocal
from app.models.package import Package, UserEntitlement
from app.models.user import User
from app.schemas.payment import EntitlementOut, PackageOut
from app.services.entitlement import grant_entitlement
from app.services.realtime import send_user_event

router = APIRouter(prefix="/v1", tags=["packages"])


@router.get("/packages", response_model=list[PackageOut])
async def get_packages(language_code: str = Query(..., min_length=2, max_length=10)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Package)
            .where(Package.language_code == language_code, Package.is_active.is_(True))
            .order_by(Package.price_vnd.asc(), Package.id.asc())
        )
        packages = result.scalars().all()
        return [
            PackageOut(
                id=item.id,
                language_code=item.language_code,
                code=item.code,
                name=item.name,
                description=item.description,
                price_vnd=item.price_vnd,
                duration_days=item.duration_days,
                is_free=item.is_free,
                is_active=item.is_active,
            )
            for item in packages
        ]


@router.get("/me/entitlements", response_model=list[EntitlementOut])
async def get_my_entitlements(current_user: User = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserEntitlement, Package)
            .join(Package, Package.id == UserEntitlement.package_id)
            .where(UserEntitlement.user_id == current_user.id)
            .order_by(UserEntitlement.created_at.desc())
        )
        rows = result.all()
        return [
            EntitlementOut(
                id=entitlement.id,
                package_id=package.id,
                package_code=package.code,
                package_name=package.name,
                language_code=package.language_code,
                is_free=package.is_free,
                status=entitlement.status,
                expires_at=entitlement.expires_at.isoformat() if entitlement.expires_at else None,
            )
            for entitlement, package in rows
        ]


@router.post("/packages/{package_id}/activate-free", response_model=EntitlementOut)
async def activate_free_package(
    package_id: int,
    current_user: User = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        package_result = await session.execute(select(Package).where(Package.id == package_id))
        package = package_result.scalar_one_or_none()
        if package is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gói không tồn tại")
        if not package.is_free:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Đây không phải gói free")

        entitlement = await grant_entitlement(session, user_id=current_user.id, package=package)
        await session.commit()
        await session.refresh(entitlement)
        entitlement_out = EntitlementOut(
            id=entitlement.id,
            package_id=package.id,
            package_code=package.code,
            package_name=package.name,
            language_code=package.language_code,
            is_free=package.is_free,
            status=entitlement.status,
            expires_at=entitlement.expires_at.isoformat() if entitlement.expires_at else None,
        )
        await send_user_event(
            current_user.id,
            "entitlement:update",
            {"entitlement": entitlement_out.model_dump()},
        )
        return entitlement_out
