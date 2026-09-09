"""Operational queries must exclude deleted reports and their retained evidence.

These tests seed authoritative rows directly: no ML runtime or provider is needed.
The rows stay referenced in the session to exercise identity-map bypass hazards.
"""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.orm import aliased, selectinload

from app.core.constants import (
    BarrierStatus, CorrectiveActionStatus, InterventionReviewStatus,
    ReportStatus, ReportType, ReviewDecision, SIFLevel, SourceType, UserRole,
)
from app.core.exceptions import AppError
from app.models.corrective_action import CorrectiveAction
from app.models.intervention_recommendation import InterventionRecommendation
from app.models.life_saving_rule import LifeSavingRule
from app.models.model_prediction import ModelPrediction
from app.models.precursor_candidate import PrecursorCandidate
from app.models.precursor_pattern import PrecursorPattern
from app.models.report import Report
from app.models.report_analysis import ReportAnalysis
from app.models.review import Review
from app.models.site import Site
from app.models.user import User
from app.schemas.corrective_action import CorrectiveActionCreate
from app.schemas.intervention import InterventionReviewRequest
from app.schemas.review import ReviewDecisionRequest, ReviewStatusFilter
from app.services.analysis.analysis_service import AnalysisService
from app.services.analytics_service import AnalyticsService
from app.services.corrective_action_service import CorrectiveActionService
from app.services.intervention_service import InterventionService
from app.services.model_service import get_feedback
from app.services.precursor_engine.precursor_service import PrecursorService
from app.services.report_service import ReportService
from app.services.review_service import ReviewService
from app.services.risk_engine.risk_service import RiskService
from app.services.rules_service import RulesService


def _report(site, actor, index, *, deleted=False):
    return Report(
        report_id=f"SOFT-{uuid4().hex[:12]}-{index}",
        report_type=ReportType.UNSAFE_ACT,
        report_text="Maintenance began before energy isolation was verified.",
        site_id=site.id, created_by=actor.id, location="Unit 1",
        department="Maintenance", reported_at=datetime.now(UTC) - timedelta(days=1),
        source_type=SourceType.USER_SUBMITTED,
        status=ReportStatus.REVIEW_REQUIRED if deleted else ReportStatus.REVIEWED,
        is_deleted=deleted,
        deleted_at=datetime.now(UTC) if deleted else None,
        deleted_by=actor.id if deleted else None,
    )


def _analysis(report, *, deleted=False):
    return ReportAnalysis(
        report_id=report.id, sif_potential=deleted,
        sif_level=SIFLevel.HIGH if deleted else SIFLevel.NON_SIF,
        model_probability=0.95 if deleted else 0.1,
        risk_score=90 if deleted else 20,
        risk_priority="CRITICAL" if deleted else "LOW",
        activity="Deleted activity" if deleted else "Maintenance",
        hazard="Deleted hazard" if deleted else "Stored energy",
        barrier="Deleted barrier" if deleted else "Energy isolation",
        barrier_status=BarrierStatus.FAILED if deleted else BarrierStatus.EFFECTIVE,
        barrier_failure="failed" if deleted else None,
        life_saving_rule="Energy Isolation", rule_confidence=0.9,
        overall_confidence=0.9, analysis_status="REVIEW_REQUIRED" if deleted else "COMPLETED",
        model_version="seeded", evidence_span="energy isolation", explanation="Seeded evidence",
    )


def _intervention(report_id=None, pattern_id=None, evidence=None):
    return InterventionRecommendation(
        report_id=report_id, precursor_pattern_id=pattern_id,
        idempotency_key=f"soft-delete-{uuid4().hex}", intervention_rule_id="barrier-verify",
        category="BARRIER_VERIFY", title="Verify isolation", description="Verify the recorded barrier",
        rationale="Seeded evidence", priority="CRITICAL", action_type="VERIFICATION",
        review_required=True, evidence_snapshot=evidence or {}, source_rule="seeded",
        engine_version="v1", review_status="PENDING",
    )


@pytest_asyncio.fixture
async def retained_rows(db_session):
    actor = User(email=f"soft-{uuid4().hex}@example.test", password_hash="unused",
                 full_name="Seeded admin", role=UserRole.ADMIN)
    site = Site(name="Live Site", code=f"SD-{uuid4().hex[:8]}", location="Unit 1", region="Test")
    rule = LifeSavingRule(code=f"LSR-{uuid4().hex[:8]}", name="Energy Isolation", description="Seeded rule")
    db_session.add_all([actor, site, rule])
    await db_session.flush()
    live = _report(site, actor, 1)
    deleted = _report(site, actor, 2, deleted=True)
    db_session.add_all([live, deleted])
    await db_session.flush()
    analyses = [_analysis(live), _analysis(deleted, deleted=True)]
    db_session.add_all(analyses)
    await db_session.flush()
    reviews, actions, interventions = [], [], []
    for report, analysis in zip((live, deleted), analyses, strict=True):
        review = Review(report_id=report.id, analysis_id=analysis.id, reviewer_id=actor.id,
                        decision=ReviewDecision.PENDING if report.is_deleted else ReviewDecision.APPROVE,
                        reviewed_at=datetime.now(UTC))
        action = CorrectiveAction(report_id=report.id, intervention_code="TEST-ISOLATION",
                                  title="Verify isolation", description="Verify energy isolation",
                                  hierarchy_level="ENGINEERING_CONTROL", action_type="VERIFICATION",
                                  priority="HIGH", status=CorrectiveActionStatus.DRAFT,
                                  original_recommendation={}, user_modifications=[], created_by=actor.id)
        intervention = _intervention(report_id=report.id)
        prediction = ModelPrediction(report_id=report.id, model_name="seeded", model_version="v1",
                                     predicted_label="SIF", probability=0.95, prediction_json={})
        db_session.add_all([review, action, intervention, prediction])
        reviews.append(review)
        actions.append(action)
        interventions.append(intervention)
    await db_session.commit()
    return SimpleNamespace(actor=actor, site=site, rule=rule, live=live, deleted=deleted,
                           analyses=analyses, reviews=reviews, actions=actions, interventions=interventions)


@pytest.mark.asyncio
async def test_normal_report_lookup_pagination_and_admin_inspection(db_session, retained_rows):
    rows = retained_rows
    service = ReportService(db_session, rows.actor)
    items, total = await service.list(page=1, page_size=20)
    assert total == 1
    assert [item.id for item in items] == [rows.live.id]
    with pytest.raises(AppError) as error:
        await service.get(rows.deleted.report_id)
    assert error.value.status_code == 404
    deleted, total = await service.list_deleted(page=1, page_size=20)
    assert total == 1
    assert [item.id for item in deleted] == [rows.deleted.id]
    assert deleted[0].deleted_by == rows.actor.id
    # An inspection must not make the same cached entity operationally visible.
    with pytest.raises(AppError) as error:
        await service.get(rows.deleted.report_id)
    assert error.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [None, UserRole.VIEWER, UserRole.REVIEWER, UserRole.HSE_MANAGER])
async def test_deleted_report_inspection_requires_explicit_admin(db_session, retained_rows, role):
    user = None if role is None else SimpleNamespace(role=role, site_id=None)
    with pytest.raises(AppError) as error:
        await ReportService(db_session, user).list_deleted(page=1, page_size=20)
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_deleted_inspection_endpoint_is_admin_only(client, admin_headers, retained_rows):
    response = client.get("/api/v1/reports/deleted", headers=admin_headers)
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [str(retained_rows.deleted.id)]
    assert client.get("/api/v1/reports/deleted").status_code in (401, 403)
    email = f"viewer-{uuid4().hex}@example.test"
    registration = client.post("/api/v1/auth/register", json={
        "email": email, "password": "test-password-123", "full_name": "Viewer",
    })
    assert registration.status_code == 201
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "test-password-123"}).json()["access_token"]
    assert client.get("/api/v1/reports/deleted", headers={"Authorization": f"Bearer {token}"}).status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("operation", ["review_get", "review_decide", "action_get", "action_submit",
                                        "action_audit", "action_create", "intervention_get",
                                        "intervention_review", "analysis_get", "report_close", "report_reset"])
async def test_deleted_children_cannot_be_read_or_mutated(db_session, retained_rows, operation):
    rows = retained_rows
    actions = CorrectiveActionService(db_session, rows.actor)
    if operation == "review_get":
        call = ReviewService(db_session).get(rows.reviews[1].id)
    elif operation == "review_decide":
        call = ReviewService(db_session).decide(rows.reviews[1].id,
            ReviewDecisionRequest(decision=ReviewDecision.APPROVE), rows.actor.id, None)
    elif operation == "action_get":
        call = actions.get(rows.actions[1].id)
    elif operation == "action_submit":
        call = actions.submit(rows.actions[1].id, rows.actor.id)
    elif operation == "action_audit":
        call = actions.get_audit_trail(rows.actions[1].id)
    elif operation == "action_create":
        call = actions.create_action(CorrectiveActionCreate(report_id=rows.deleted.id,
            intervention_code="NEW", title="Verify", description="Verify barrier",
            hierarchy_level="ENGINEERING_CONTROL", action_type="VERIFICATION", priority="HIGH"), rows.actor.id)
    elif operation == "intervention_get":
        call = InterventionService(db_session).get(rows.interventions[1].id)
    elif operation == "intervention_review":
        call = InterventionService(db_session).review(rows.interventions[1].id,
            InterventionReviewRequest(decision=InterventionReviewStatus.ACCEPTED), rows.actor.id, None)
    elif operation == "analysis_get":
        call = AnalysisService(db_session).get_analysis(rows.deleted.report_id)
    elif operation == "report_close":
        call = ReportService(db_session, rows.actor).close(rows.deleted.report_id, rows.actor.id, None)
    else:
        call = ReportService(db_session, rows.actor).reset(rows.deleted.report_id, rows.actor.id, None)
    with pytest.raises(AppError) as error:
        await call
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_child_lists_summaries_and_exports_exclude_deleted(db_session, retained_rows):
    rows = retained_rows
    reviews, total = await ReviewService(db_session).list(1, 20, ReviewStatusFilter.ALL)
    assert total == 1 and [item.id for item in reviews] == [rows.reviews[0].id]
    pending, total = await ReviewService(db_session).list(1, 20, ReviewStatusFilter.PENDING)
    assert pending == [] and total == 0
    actions, total = await CorrectiveActionService(db_session).list_actions()
    assert total == 1 and [item.id for item in actions] == [rows.actions[0].id]
    interventions, total = await InterventionService(db_session).list()
    assert total == 1 and [item.id for item in interventions] == [rows.interventions[0].id]
    interventions, total = await InterventionService(db_session).list(report_human_id=rows.deleted.report_id)
    assert interventions == [] and total == 0
    summary = await InterventionService(db_session).summary()
    assert summary.total == summary.critical == summary.pending == 1
    assert summary.by_category == {"BARRIER_VERIFY": 1}
    # Both records would be exportable except for the parent visibility rule.
    rows.actions[0].status = CorrectiveActionStatus.APPROVED
    rows.actions[1].status = CorrectiveActionStatus.APPROVED
    await db_session.commit()
    exported = await CorrectiveActionService(db_session).export_approved_actions()
    assert [item.action_id for item in exported] == [str(rows.actions[0].id)]


@pytest.mark.asyncio
async def test_deleted_reports_do_not_affect_dashboard_or_trends(db_session, retained_rows):
    analytics = AnalyticsService(db_session)
    summary = await analytics.summary()
    assert summary.total_reports == 1
    assert summary.total_sif_reports == summary.high_risk_reports == summary.review_required == 0
    assert summary.review_queue_count == 0
    assert summary.corrective_actions.total == 1
    assert summary.sif_rate == summary.high_risk_rate == 0
    for window in ("7d", "30d", "90d", "1y"):
        trend = await analytics.sif_trend(window)
        assert sum(point.total_reports for point in trend) == 1
        assert sum(point.sif_reports for point in trend) == 0
        assert await analytics.barrier_failures(window) == []
    for field in ("activity", "hazard", "lsr"):
        items = await analytics.distribution(field)
        assert sum(item.count for item in items) == 1
        assert all("Deleted" not in item.name for item in items)
    assert sum(item.count for item in await analytics.site_comparison()) == 1
    csv = await analytics.export_csv()
    assert "Total Reports,1" in csv
    assert "Total SIF Reports,0" in csv


@pytest.mark.asyncio
async def test_deleted_reports_do_not_affect_risk_feedback_or_rule_metrics(db_session, retained_rows):
    risk = RiskService(db_session)
    sites = await risk.sites(None, None, 50)
    assert len(sites) == 1 and sites[0].report_count == 1 and sites[0].sif_count == 0
    for field in ("activity", "hazard"):
        items = await risk.dimensions(field, None, None, 50)
        assert len(items) == 1 and items[0].report_count == 1
        assert "Deleted" not in items[0].name
    barriers = await risk.barriers(None, None, 50)
    assert len(barriers) == 1 and barriers[0].total_occurrences == 1 and barriers[0].failed_count == 0
    feedback = await get_feedback(db_session)
    assert feedback["total_predictions"] == feedback["reviewed_predictions"] == feedback["approved_predictions"] == 1
    rules = await RulesService(db_session).analytics(str(retained_rows.rule.id))
    assert rules["total_reports"] == 1 and rules["sif_reports"] == 0


@pytest.mark.asyncio
async def test_report_aliases_aggregates_and_relationship_loads_are_filtered(db_session, retained_rows):
    rows = retained_rows
    report_alias = aliased(Report)
    assert await db_session.scalar(select(func.count(report_alias.id))) == 1
    assert list(await db_session.scalars(select(report_alias.report_id))) == [rows.live.report_id]
    site = await db_session.scalar(select(Site).where(Site.id == rows.site.id).options(selectinload(Site.reports)))
    assert [report.id for report in site.reports] == [rows.live.id]
    # A service must issue a visibility-aware lookup even when the entity is cached.
    with pytest.raises(AppError) as error:
        await ReportService(db_session, rows.actor).get(rows.deleted.report_id)
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_precursor_reads_recompute_stale_metrics_and_hide_changed_advice(db_session, retained_rows):
    rows = retained_rows
    reports = [_report(rows.site, rows.actor, index) for index in range(3, 7)]
    db_session.add_all(reports)
    await db_session.flush()
    for report in reports:
        db_session.add(_analysis(report))
        db_session.add(PrecursorCandidate(report_id=report.id, category="CONTROL_FAILURE",
            activity="maintenance", hazard="stored energy", barrier="energy isolation", failure_type="not verified"))
    await db_session.commit()
    service = PrecursorService(db_session)
    assert await service.rebuild(commit=True) == 1
    pattern = (await db_session.scalars(select(PrecursorPattern))).one()
    pattern_id = pattern.id
    advice = (await db_session.scalars(select(InterventionRecommendation).where(
        InterventionRecommendation.precursor_pattern_id == pattern_id))).one()
    advice_id = advice.id
    assert (await service.detail(pattern_id)).occurrence_count == 4
    # Deliberately bypass service rebuild: reads must tolerate historical/stale aggregates.
    reports[-1].is_deleted = True
    reports[-1].deleted_at = datetime.now(UTC)
    reports[-1].deleted_by = rows.actor.id
    await db_session.commit()
    listed = await service.list()
    assert len(listed) == 1 and listed[0].occurrence_count == 3
    assert (await service.list(site_id=rows.site.id))[0].occurrence_count == 3
    detail = await service.detail(pattern_id)
    assert detail.occurrence_count == 3 and detail.recent_count == 3
    assert {item.report_id for item in detail.representative_reports} == {item.report_id for item in reports[:-1]}
    graph = await service.graph(pattern_id)
    assert next(node for node in graph.nodes if node.id == "activity").statistics["occurrences"] == 3
    assert next(node for node in graph.nodes if node.id == "failure").statistics["recent_count"] == 3
    interventions, _ = await InterventionService(db_session).list()
    assert advice_id not in {item.id for item in interventions}
    with pytest.raises(AppError) as error:
        await InterventionService(db_session).get(advice_id)
    assert error.value.status_code == 404
    # The remaining two observations no longer satisfy the configured recurring threshold.
    reports[-2].is_deleted = True
    reports[-2].deleted_at = datetime.now(UTC)
    await db_session.commit()
    assert await service.list() == []
    assert (await AnalyticsService(db_session).summary()).active_precursors == 0
    for read in (service.detail, service.graph):
        with pytest.raises(AppError) as error:
            await read(pattern_id)
        assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_action_linked_only_to_deleted_report_intervention_is_hidden(db_session, retained_rows):
    rows = retained_rows
    action = CorrectiveAction(report_id=None, intervention_recommendation_id=rows.interventions[1].id,
        intervention_code="INDIRECT", title="Indirect action", description="Retained evidence",
        hierarchy_level="ENGINEERING_CONTROL", action_type="VERIFICATION", priority="HIGH",
        status=CorrectiveActionStatus.DRAFT, original_recommendation={}, user_modifications=[], created_by=rows.actor.id)
    db_session.add(action)
    await db_session.commit()
    service = CorrectiveActionService(db_session)
    with pytest.raises(AppError) as error:
        await service.get(action.id)
    assert error.value.status_code == 404
    listed, total = await service.list_actions()
    assert total == 1 and [item.id for item in listed] == [rows.actions[0].id]
    with pytest.raises(AppError) as error:
        await service.create_action(CorrectiveActionCreate(intervention_recommendation_id=rows.interventions[1].id,
            intervention_code="INDIRECT-NEW", title="Indirect", description="Deleted evidence",
            hierarchy_level="ENGINEERING_CONTROL", action_type="VERIFICATION", priority="HIGH"), rows.actor.id)
    assert error.value.status_code == 404
