from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

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
) -> AuditLogPage:
    offset = (page - 1) * page_size
    
    total = await db.scalar(select(func.count(AuditLog.id)))
    
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    items = (await db.scalars(stmt)).all()
    
    return AuditLogPage(
        items=[AuditLogRead.model_validate(item) for item in items],
        total=total or 0,
        page=page,
        page_size=page_size
    )
