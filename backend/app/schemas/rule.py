from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LifeSavingRuleRead(BaseModel):
    id: UUID
    code: str
    name: str
    description: str
    keywords: list[str]
    hazards: list[str]
    barriers: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LifeSavingRuleAnalytics(BaseModel):
    life_saving_rule: str
    total_reports: int
    sif_reports: int
    sif_density: float
