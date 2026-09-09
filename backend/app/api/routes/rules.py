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

from fastapi import status
from app.schemas.rule import LifeSavingRuleCreate, LifeSavingRuleUpdate
from app.schemas.common import Message

@router.post("", response_model=LifeSavingRuleRead, status_code=status.HTTP_201_CREATED, summary="Create a Life-Saving Rule")
async def create_rule(payload: LifeSavingRuleCreate, db: DBSession, _: User = Depends(require_roles(UserRole.ADMIN))) -> LifeSavingRuleRead:
    return await RulesService(db).create(payload)

@router.patch("/{rule_id}", response_model=LifeSavingRuleRead, summary="Update a Life-Saving Rule")
async def update_rule(rule_id: str, payload: LifeSavingRuleUpdate, db: DBSession, _: User = Depends(require_roles(UserRole.ADMIN))) -> LifeSavingRuleRead:
    return await RulesService(db).update(rule_id, payload)

@router.delete("/{rule_id}", response_model=Message, summary="Delete a Life-Saving Rule")
async def delete_rule(rule_id: str, db: DBSession, _: User = Depends(require_roles(UserRole.ADMIN))) -> Message:
    await RulesService(db).delete(rule_id)
    return Message(message="Life-Saving Rule deleted successfully")
