from pydantic import BaseModel, Field, field_validator


class EmailInput(BaseModel):
    email: str = Field(min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("Email khong hop le")
        return email


class RegisterInput(EmailInput):
    password: str = Field(min_length=8, max_length=128)
    pin: str = Field(min_length=4, max_length=12, pattern=r"^\d+$")


class LoginInput(EmailInput):
    password: str = Field(min_length=8, max_length=128)


class PasswordResetRequestInput(EmailInput):
    pin: str = Field(min_length=4, max_length=12, pattern=r"^\d+$")


class PasswordResetConfirmInput(EmailInput):
    otp_code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthMessageOut(BaseModel):
    ok: bool = True
    message: str
    dev_otp: str | None = None


class UserOut(BaseModel):
    id: int
    public_user_id: str
    email: str
    full_name: str | None
    phone_number: str | None
    address: str | None
    avatar_url: str | None
    is_locked: bool = False
    is_verified: bool = False
    learning_language_code: str | None
    is_admin: bool = False


class AdminContactProfileOut(BaseModel):
    public_user_id: str
    email: str
    full_name: str | None
    phone_number: str | None
    address: str | None
    avatar_url: str | None


class ProfileUpdateInput(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=500)


class LanguageUpdateInput(BaseModel):
    learning_language_code: str = Field(min_length=2, max_length=10)
