from fastapi import APIRouter, Depends

from app.api.deps import DBSession, require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.schemas.rule import LifeSavingRuleAnalytics, LifeSavingRuleRead
from app.services.rules_service import RulesService

router = APIRouter(prefix="/rules", tags=["Life-Saving Rules"])
_roles = (UserRole.ADMIN, UserRole.HSE_MANAGER, UserRole.HSE_ANALYST, UserRole.REVIEWER, UserRole.VIEWER)


@router.get("", response_model=list[LifeSavingRuleRead])
async def rules(db: DBSession, _: User = Depends(require_roles(*_roles))) -> list[LifeSavingRuleRead]:
    return await RulesService(db).list()


@router.get("/{rule_id}", response_model=LifeSavingRuleRead)
async def rule(rule_id: str, db: DBSession, _: User = Depends(require_roles(*_roles))) -> LifeSavingRuleRead:
    return await RulesService(db).get(rule_id)


@router.get("/{rule_id}/analytics", response_model=LifeSavingRuleAnalytics)
async def rule_analytics(rule_id: str, db: DBSession, _: User = Depends(require_roles(*_roles))) -> LifeSavingRuleAnalytics:
    return await RulesService(db).analytics(rule_id)
