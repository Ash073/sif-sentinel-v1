from datetime import UTC, datetime, timedelta

from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ReportStatus, SIFLevel
from app.models.report import Report
from app.models.report_analysis import ReportAnalysis
from app.models.site import Site
from app.schemas.dashboard import (
    BarrierFailurePoint,
    DashboardSummary,
    DistributionItem,
    TimeSeriesPoint,
)
from app.services.precursor_engine.pattern_aggregator import latest_analysis_subquery


from app.models.review import Review
from app.models.corrective_action import CorrectiveAction
from app.core.constants import ReviewDecision
from app.schemas.dashboard import CorrectiveActionSummary

class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def summary(self) -> DashboardSummary:
        latest = latest_analysis_subquery()
        metrics = (await self.db.execute(select(func.count(Report.id), func.coalesce(func.sum(case((ReportAnalysis.sif_potential.is_(True), 1), else_=0)), 0), func.coalesce(func.sum(case((ReportAnalysis.sif_level == SIFLevel.HIGH, 1), else_=0)), 0), func.coalesce(func.sum(case((Report.status == ReportStatus.REVIEW_REQUIRED, 1), else_=0)), 0), func.count(func.distinct(Report.site_id))).select_from(Report).outerjoin(latest, latest.c.report_id == Report.id).outerjoin(ReportAnalysis, (ReportAnalysis.report_id == latest.c.report_id) & (ReportAnalysis.created_at == latest.c.latest_created)).where(Report.is_deleted == False))).one()
        total, sif, high, review, sites = (int(value or 0) for value in metrics)
        from app.services.precursor_engine.pattern_aggregator import aggregate_patterns
        active = len(await aggregate_patterns(self.db))
        
        review_queue = await self.db.scalar(select(func.count(Review.id)).join(Report, Report.id == Review.report_id).where(Review.decision == ReviewDecision.PENDING, Report.is_deleted.is_(False))) or 0
        
        ca_summary = await self.corrective_action_summary()
        
        return DashboardSummary(
            total_reports=total,
            total_sif_reports=sif,
            high_risk_reports=high,
            review_required=review,
            active_precursors=active,
            sites_monitored=sites,
            sif_rate=round(sif / total, 3) if total else 0.0,
            high_risk_rate=round(high / total, 3) if total else 0.0,
            review_queue_count=review_queue,
            corrective_actions=ca_summary
        )

    async def corrective_action_summary(self) -> CorrectiveActionSummary:
        from app.services.corrective_action_service import CorrectiveActionService
        visible = (await CorrectiveActionService(self.db)._visible_query()).with_only_columns(CorrectiveAction.id)
        ca_metrics = (await self.db.execute(select(
            func.count(CorrectiveAction.id),
            func.coalesce(func.sum(case((CorrectiveAction.status.in_(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_PROGRESS', 'VERIFICATION_REQUIRED']), 1), else_=0)), 0),
            func.coalesce(func.sum(case(((CorrectiveAction.status.in_(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_PROGRESS', 'VERIFICATION_REQUIRED'])) & (CorrectiveAction.due_date < datetime.now(UTC)), 1), else_=0)), 0),
            func.coalesce(func.sum(case((CorrectiveAction.status.in_(['VERIFIED', 'CLOSED']), 1), else_=0)), 0)
        ).where(CorrectiveAction.id.in_(visible)))).one()
        ca_total, ca_open, ca_overdue, ca_completed = (int(value or 0) for value in ca_metrics)
        return CorrectiveActionSummary(
            total=ca_total,
            open=ca_open,
            overdue=ca_overdue,
            completed=ca_completed
        )

    async def sif_trend(self, window: str) -> list[TimeSeriesPoint]:
        days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}[window]
        start = datetime.now(UTC) - timedelta(days=days)
        latest = latest_analysis_subquery()
        dialect = self.db.bind.dialect.name
        day = func.date(Report.reported_at).label("day") if dialect == "sqlite" else cast(Report.reported_at, Date).label("day")
        statement = select(day, func.count(Report.id).label("total"), func.coalesce(func.sum(case((ReportAnalysis.sif_potential.is_(True), 1), else_=0)), 0).label("sif"), func.coalesce(func.sum(case((ReportAnalysis.sif_level == SIFLevel.HIGH, 1), else_=0)), 0).label("high")).select_from(Report).outerjoin(latest, latest.c.report_id == Report.id).outerjoin(ReportAnalysis, (ReportAnalysis.report_id == latest.c.report_id) & (ReportAnalysis.created_at == latest.c.latest_created)).where(Report.reported_at >= start, Report.is_deleted == False).group_by(day).order_by(day)
        return [TimeSeriesPoint(date=str(row.day), total_reports=int(row.total), sif_reports=int(row.sif), high_sif_reports=int(row.high), sif_rate=round(int(row.sif) / int(row.total), 3) if row.total else 0.0) for row in (await self.db.execute(statement)).all()]

    async def distribution(self, field: str) -> list[DistributionItem]:
        column = {"activity": ReportAnalysis.activity, "hazard": ReportAnalysis.hazard, "lsr": ReportAnalysis.life_saving_rule}[field]
        latest = latest_analysis_subquery()
        total = await self.db.scalar(select(func.count(Report.id)).where(Report.is_deleted == False)) or 0
        statement = select(column.label("name"), func.count(Report.id).label("count"), func.coalesce(func.sum(case((ReportAnalysis.sif_potential.is_(True), 1), else_=0)), 0).label("sif")).select_from(Report).join(ReportAnalysis, ReportAnalysis.report_id == Report.id).join(latest, (latest.c.report_id == ReportAnalysis.report_id) & (latest.c.latest_created == ReportAnalysis.created_at)).where(column.is_not(None), Report.is_deleted == False).group_by(column).order_by(func.count(Report.id).desc())
        return [DistributionItem(name=row.name, count=int(row.count), sif_count=int(row.sif), sif_density=round(int(row.sif) / int(row.count), 3) if row.count else 0.0, percentage=round(int(row.count) / total, 3) if total else 0.0) for row in (await self.db.execute(statement)).all()]

    async def site_comparison(self) -> list[DistributionItem]:
        latest = latest_analysis_subquery()
        total = await self.db.scalar(select(func.count(Report.id)).where(Report.is_deleted == False)) or 0
        statement = select(Site.name.label("name"), func.count(Report.id).label("count"), func.coalesce(func.sum(case((ReportAnalysis.sif_potential.is_(True), 1), else_=0)), 0).label("sif")).select_from(Report).join(Site, Site.id == Report.site_id).outerjoin(latest, latest.c.report_id == Report.id).outerjoin(ReportAnalysis, (ReportAnalysis.report_id == latest.c.report_id) & (ReportAnalysis.created_at == latest.c.latest_created)).where(Report.is_deleted == False).group_by(Site.name).order_by(func.count(Report.id).desc())
        return [DistributionItem(name=row.name, count=int(row.count), sif_count=int(row.sif), sif_density=round(int(row.sif) / int(row.count), 3) if row.count else 0.0, percentage=round(int(row.count) / total, 3) if total else 0.0) for row in (await self.db.execute(statement)).all()]

    async def barrier_failures(self, window: str) -> list[BarrierFailurePoint]:
        days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}[window]
        latest = latest_analysis_subquery()
        dialect = self.db.bind.dialect.name
        day = func.date(Report.reported_at).label("day") if dialect == "sqlite" else cast(Report.reported_at, Date).label("day")
        statement = select(day, func.count(Report.id).label("failed")).select_from(Report).join(ReportAnalysis, ReportAnalysis.report_id == Report.id).join(latest, (latest.c.report_id == ReportAnalysis.report_id) & (latest.c.latest_created == ReportAnalysis.created_at)).where(Report.reported_at >= datetime.now(UTC) - timedelta(days=days), ReportAnalysis.barrier_failure.is_not(None), Report.is_deleted == False).group_by(day).order_by(day)
        return [BarrierFailurePoint(date=str(row.day), failed_count=int(row.failed)) for row in (await self.db.execute(statement)).all()]

    async def export_csv(self) -> str:
        import io
        import csv
        summary = await self.summary()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Reports", summary.total_reports])
        writer.writerow(["Total SIF Reports", summary.total_sif_reports])
        writer.writerow(["High Risk Reports", summary.high_risk_reports])
        writer.writerow(["Review Required", summary.review_required])
        writer.writerow(["Active Precursors", summary.active_precursors])
        writer.writerow(["Sites Monitored", summary.sites_monitored])
        writer.writerow(["SIF Rate", summary.sif_rate])
        writer.writerow(["High Risk Rate", summary.high_risk_rate])
        writer.writerow(["Review Queue Count", summary.review_queue_count])
        
        writer.writerow([])
        writer.writerow(["Corrective Actions", "Count"])
        writer.writerow(["Total CA", summary.corrective_actions.total])
        writer.writerow(["Open CA", summary.corrective_actions.open])
        writer.writerow(["Overdue CA", summary.corrective_actions.overdue])
        writer.writerow(["Completed CA", summary.corrective_actions.completed])
        
        writer.writerow([])
        writer.writerow(["Site", "Total Reports", "SIF Count", "SIF Density"])
        sites = await self.site_comparison()
        for site in sites:
            writer.writerow([site.name, site.count, site.sif_count, site.sif_density])
            
        return output.getvalue()
