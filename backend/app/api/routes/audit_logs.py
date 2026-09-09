from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from pydantic import UUID4

from app.api.deps import DBSession, require_roles
from app.core.constants import UserRole
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogPage, AuditLogRead


router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("", response_model=AuditLogPage, summary="List paginated audit logs")
async def list_audit_logs(
    db: DBSession,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    entity_id: UUID4 | None = Query(default=None),
    user_id: UUID4 | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
) -> AuditLogPage:
    offset = (page - 1) * page_size
    
    filters = []
    if entity_id is not None:
        filters.append(AuditLog.entity_id == entity_id)
    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)
    if action is not None:
        filters.append(AuditLog.action == action)
    if entity_type is not None:
        filters.append(AuditLog.entity_type == entity_type)

    base_query = select(AuditLog)
    if filters:
        base_query = base_query.where(*filters)
        
    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    
    stmt = base_query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    items = (await db.scalars(stmt)).all()
    
    return AuditLogPage(
        items=[AuditLogRead.model_validate(item) for item in items],
        total=total or 0,
        page=page,
        page_size=page_size
    )
