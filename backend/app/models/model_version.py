from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UUIDTimestampMixin


class ModelVersion(UUIDTimestampMixin, Base):
    """
    Registry of ML models (active, shadow, retired).
    """

    __tablename__ = "model_versions"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_shadow: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
