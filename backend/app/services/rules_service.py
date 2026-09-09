"""Rules service — Life-Saving Rule retrieval and analytics.

Responsibility: LSR database access and analytics aggregation.
Routes delegate all DB operations to this service.
"""

from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.life_saving_rule import LifeSavingRule
from app.models.report_analysis import ReportAnalysis
from app.models.report import Report
from app.services.precursor_engine.pattern_aggregator import latest_analysis_subquery


from app.models.user import User
from app.services.audit_service import record_audit

class RulesService:
    def __init__(self, db: AsyncSession, current_user: User | None = None) -> None:
        self.db = db
        self.current_user = current_user

    async def list(self) -> list[LifeSavingRule]:
        """Return all active Life-Saving Rules ordered by code."""
        return list(
            await self.db.scalars(
                select(LifeSavingRule)
                .where(LifeSavingRule.is_active.is_(True))
                .order_by(LifeSavingRule.code)
            )
        )

    async def get(self, rule_id: str) -> LifeSavingRule:
        """Get a single rule by UUID or code string. Raises NotFoundError if missing."""
        try:
            identifier = UUID(str(rule_id))
        except ValueError:
            condition = LifeSavingRule.code == rule_id
        else:
            condition = LifeSavingRule.id == identifier
        item = await self.db.scalar(select(LifeSavingRule).where(condition))
        if not item:
            raise NotFoundError("rule")
        return item

    async def analytics(self, rule_id: str) -> dict:
        """Return SIF density analytics for a Life-Saving Rule.

        Looks up the rule first (raises NotFoundError if not found), then
        aggregates ReportAnalysis rows matching the rule's name.
        """
        item = await self.get(rule_id)
        latest = latest_analysis_subquery()
        total, sif = (
            await self.db.execute(
                select(
                    func.count(),
                    func.coalesce(
                        func.sum(case((ReportAnalysis.sif_potential.is_(True), 1), else_=0)),
                        0,
                    ),
                ).select_from(ReportAnalysis).join(Report, Report.id == ReportAnalysis.report_id)
                .join(latest, (latest.c.report_id == ReportAnalysis.report_id) & (latest.c.latest_created == ReportAnalysis.created_at))
                .where(ReportAnalysis.life_saving_rule == item.name, Report.is_deleted.is_(False))
            )
        ).one()
        total, sif = int(total), int(sif)
        return {
            "life_saving_rule": item.name,
            "total_reports": total,
            "sif_reports": sif,
            "sif_density": round(sif / total, 3) if total else 0.0,
        }

    async def create(self, payload) -> LifeSavingRule:
        rule = LifeSavingRule(**payload.model_dump())
        self.db.add(rule)
        await self.db.flush()
        if self.current_user:
            await record_audit(self.db, user_id=self.current_user.id, action="RULE_CREATED", entity_type="rule", entity_id=rule.id, details=payload.model_dump(), ip_address=None)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def update(self, rule_id: str, payload) -> LifeSavingRule:
        rule = await self.get(rule_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(rule, key, value)
        if self.current_user:
            await record_audit(self.db, user_id=self.current_user.id, action="RULE_UPDATED", entity_type="rule", entity_id=rule.id, details=payload.model_dump(exclude_unset=True), ip_address=None)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def delete(self, rule_id: str) -> None:
        rule = await self.get(rule_id)
        if self.current_user:
            await record_audit(self.db, user_id=self.current_user.id, action="RULE_DELETED", entity_type="rule", entity_id=rule.id, details={"code": rule.code}, ip_address=None)
        await self.db.delete(rule)
        await self.db.commit()
