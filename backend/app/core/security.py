from datetime import UTC, datetime, timedelta
import uuid
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    jti = str(uuid.uuid4())
    return jwt.encode({"sub": str(user_id), "exp": expires, "jti": jti}, settings.jwt_secret_key, settings.jwt_algorithm)
