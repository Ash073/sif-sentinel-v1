from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.core.constants import UserRole
from app.schemas.common import ORMModel


class UserRegister(ORMModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128, examples=["demo-password-123"])
    full_name: str = Field(min_length=1, max_length=255)
    site_id: UUID | None = None


class UserRead(ORMModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    site_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(ORMModel):
    role: UserRole | None = None
    is_active: bool | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    site_id: UUID | None = None


class UserPage(ORMModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int


class UserRoleUpdate(ORMModel):
    role: UserRole
