from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    language_code: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("languages.code"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_vnd: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class PackageCourse(Base):
    __tablename__ = "package_courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id"), nullable=False, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)


class UserEntitlement(Base):
    __tablename__ = "user_entitlements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="momo")
    order_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    request_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    amount_vnd: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    pay_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    deeplink: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_code_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

