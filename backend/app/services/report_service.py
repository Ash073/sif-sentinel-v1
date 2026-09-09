from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ReportStatus, ReportType, SourceType, UserRole
from app.core.exceptions import AppError, NotFoundError
from app.models.report import Report
from app.repositories.report_repository import ReportRepository
from app.schemas.report import ReportCreate, ReportUpdate
from app.services.audit_service import record_audit
import structlog

logger = structlog.get_logger(__name__)

class ReportService:
    def __init__(self, db: AsyncSession, current_user: "User" = None) -> None:
        self.db, self.repo = db, ReportRepository(db)
        self.current_user = current_user

    async def create(self, payload: ReportCreate, user_id: UUID, ip_address: str | None, idempotency_key: str | None = None) -> Report:
        from app.models.site import Site
        if not await self.db.get(Site, payload.site_id):
            raise AppError("SITE_NOT_FOUND", "Site not found", 404)
            
        if idempotency_key:
            from sqlalchemy import select
            existing = await self.db.scalar(
                select(Report).where(
                    Report.site_id == payload.site_id, 
                    Report.idempotency_key == idempotency_key
                )
            )
            if existing:
                return existing
            
        if self.current_user and self.current_user.role != UserRole.ADMIN and self.current_user.site_id:
            if payload.site_id != self.current_user.site_id:
                raise AppError("FORBIDDEN", "You can only create reports for your assigned site", 403)
                
        human_id = payload.report_id or self._new_human_id()
        if await self.repo.get_by_human_id(human_id):
            raise AppError("REPORT_ID_EXISTS", "Report identifier already exists", 409)
        report = Report(
            **payload.model_dump(exclude={"report_id"}), 
            report_id=human_id, 
            created_by=user_id,
            idempotency_key=idempotency_key
        )
        self.db.add(report)
        await self.db.flush()
        await record_audit(self.db, user_id=user_id, action="REPORT_CREATED", entity_type="report", entity_id=report.id,
                           details={"report_id": report.report_id, "idempotency_key": idempotency_key}, ip_address=ip_address)
        await self.db.commit()
        await self.db.refresh(report)
        logger.info("report_created", report_id=human_id, user_id=str(user_id))
        return report

    async def get(self, human_id: str) -> Report:
        report = await self.repo.get_by_human_id(human_id)
        if not report:
            raise NotFoundError("report")
            
        if self.current_user and self.current_user.role != UserRole.ADMIN and self.current_user.site_id:
            if report.site_id != self.current_user.site_id:
                raise AppError("FORBIDDEN", "You do not have access to reports for this site", 403)
                
        return report

    async def list(
        self,
        *,
        page: int,
        page_size: int,
        site_id: UUID | None = None,
        report_type: ReportType | None = None,
        status: ReportStatus | None = None,
        source_type: SourceType | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        search: str | None = None,
    ) -> tuple[list[Report], int]:
        """Return paginated reports with optional filters.

        Delegates entirely to ReportRepository so route handlers never
        access the repository directly.
        """
        # IDOR Protection: Scoped list
        if self.current_user and self.current_user.role != UserRole.ADMIN and self.current_user.site_id:
            site_id = self.current_user.site_id

        return await self.repo.list(
            page=page,
            page_size=page_size,
            site_id=site_id,
            report_type=report_type,
            status=status,
            source_type=source_type,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )

    async def list_deleted(self, page: int, page_size: int) -> tuple[list[Report], int]:
        if self.current_user and self.current_user.role != UserRole.ADMIN:
            raise AppError("FORBIDDEN", "Only administrators can view deleted reports", 403)
        return await self.repo.list_deleted(page=page, page_size=page_size)

    async def update(self, human_id: str, payload: ReportUpdate, user_id: UUID, ip_address: str | None) -> Report:
        report = await self.get(human_id)
        if report.status != ReportStatus.NEW:
            raise AppError(
                "REPORT_NOT_EDITABLE",
                "Only a NEW report may be edited; create a corrected report after analysis.",
                409,
            )
        for name, value in payload.model_dump(exclude_unset=True).items():
            setattr(report, name, value)
        await record_audit(self.db, user_id=user_id, action="REPORT_UPDATED", entity_type="report", entity_id=report.id,
                           details={"fields": list(payload.model_dump(exclude_unset=True))}, ip_address=ip_address)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def delete(self, human_id: str, user_id: UUID, ip_address: str | None) -> None:
        report = await self.get(human_id)
        report.is_deleted = True
        report.deleted_at = datetime.now(UTC)
        report.deleted_by = user_id
        await record_audit(self.db, user_id=user_id, action="REPORT_DELETED", entity_type="report", entity_id=report.id,
                           details={"report_id": report.report_id}, ip_address=ip_address)
        await self.db.commit()

    async def close(self, human_id: str, user_id: UUID, ip_address: str | None) -> Report:
        report = await self._get_for_update(human_id)
        if report.status not in (ReportStatus.ANALYZED, ReportStatus.REVIEW_REQUIRED):
            raise AppError("INVALID_TRANSITION", f"Cannot close report from status: {report.status}", 409)
            
        report.status = ReportStatus.CLOSED
        await record_audit(self.db, user_id=user_id, action="REPORT_CLOSED", entity_type="report", entity_id=report.id,
                           details={"report_id": report.report_id}, ip_address=ip_address)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def reset(self, human_id: str, user_id: UUID, ip_address: str | None) -> Report:
        """Reset a report back to NEW state to allow re-analysis (Admin/HSE Manager only)."""
        report = await self._get_for_update(human_id)
        if report.status in (ReportStatus.NEW, ReportStatus.CLOSED):
            raise AppError("INVALID_TRANSITION", f"Cannot reset report from status: {report.status}", 409)
            
        report.status = ReportStatus.NEW
        await record_audit(self.db, user_id=user_id, action="REPORT_RESET", entity_type="report", entity_id=report.id,
                           details={"report_id": report.report_id}, ip_address=ip_address)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    @staticmethod
    def _new_human_id() -> str:
        return f"SIF-{datetime.now(UTC):%Y%m%d}-{uuid4().hex[:8].upper()}"

    async def _get_for_update(self, human_id: str) -> Report:
        from sqlalchemy import select
        report = await self.db.scalar(
            select(Report)
            .where(Report.report_id == human_id, Report.is_deleted == False)
            .with_for_update()
        )
        if not report:
            raise NotFoundError("report")
            
        if self.current_user and self.current_user.role != UserRole.ADMIN and self.current_user.site_id:
            if report.site_id != self.current_user.site_id:
                raise AppError("FORBIDDEN", "You do not have access to reports for this site", 403)
                
        return report
