from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import UTC, datetime


PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        iterations_str, salt_b64, digest_b64 = stored_hash.split("$", 2)
        iterations = int(iterations_str)
        salt = base64.b64decode(salt_b64.encode())
        expected_digest = base64.b64decode(digest_b64.encode())
    except (ValueError, TypeError):
        return False

    provided_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return secrets.compare_digest(provided_digest, expected_digest)


def generate_session_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(UTC)

