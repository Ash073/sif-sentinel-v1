import uuid
from sqlalchemy import Boolean, Enum, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.core.constants import UserRole
from app.db.base import Base
from app.models.mixins import UUIDTimestampMixin


class User(UUIDTimestampMixin, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False), default=UserRole.VIEWER, nullable=False, index=True)
    site_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("sites.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reports = relationship("Report", back_populates="creator", primaryjoin="User.id == Report.created_by")
    reviews = relationship("Review", back_populates="reviewer")
    audit_logs = relationship("AuditLog", back_populates="user")
