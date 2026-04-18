from pydantic import BaseModel


class PackageOut(BaseModel):
    id: int
    language_code: str
    code: str
    name: str
    description: str | None
    price_vnd: int
    duration_days: int | None
    is_free: bool
    is_active: bool


class EntitlementOut(BaseModel):
    id: int
    package_id: int
    package_code: str
    package_name: str
    language_code: str
    is_free: bool
    status: str
    expires_at: str | None


class CreatePaymentInput(BaseModel):
    package_id: int


class PaymentCreateOut(BaseModel):
    transaction_id: int
    order_id: str
    status: str
    is_mock: bool
    pay_url: str | None
    deeplink: str | None
    qr_code_url: str | None

 
