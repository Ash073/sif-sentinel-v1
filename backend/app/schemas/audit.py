from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    id: UUID
    user_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID | None
    details: dict
    ip_address: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogPage(BaseModel):
    items: list[AuditLogRead]
    total: int
    page: int
    page_size: int
