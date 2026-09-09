from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LifeSavingRuleBase(BaseModel):
    code: str
    name: str
    description: str
    keywords: list[str] = []
    hazards: list[str] = []
    barriers: list[str] = []
    is_active: bool = True

class LifeSavingRuleCreate(LifeSavingRuleBase):
    pass

class LifeSavingRuleUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    keywords: list[str] | None = None
    hazards: list[str] | None = None
    barriers: list[str] | None = None
    is_active: bool | None = None

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
