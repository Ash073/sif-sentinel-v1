"""Shared test factories for creating minimal valid ORM objects."""
from datetime import datetime, UTC
from uuid import uuid4

from app.core.constants import ReportStatus, ReportType, SourceType
from app.models.report import Report
from app.models.site import Site
from app.models.user import User


def make_site(**kwargs) -> Site:
    uid = uuid4().hex[:6]
    defaults = dict(
        name=f"Test Site {uid}",
        code=f"TST{uid[:3].upper()}",
        location="Test Location",
        region="NA",
    )
    defaults.update(kwargs)
    return Site(**defaults)


def make_report(site_id, created_by, **kwargs) -> Report:
    uid = uuid4().hex[:8].upper()
    defaults = dict(
        report_id=f"SIF-TEST-{uid}",
        report_type=ReportType.NEAR_MISS,
        report_text="Test report text",
        site_id=site_id,
        location="Zone A",
        department="Operations",
        reported_at=datetime.now(UTC),
        source_type=SourceType.USER_SUBMITTED,
        status=ReportStatus.NEW,
        created_by=created_by,
    )
    defaults.update(kwargs)
    return Report(**defaults)


def make_user(site_id, **kwargs):
    uid = uuid4().hex[:8]
    from app.core.constants import UserRole
    defaults = dict(
        email=f"user_{uid}@sif.demo",
        password_hash="hashed",
        full_name="Test User",
        role=UserRole.ADMIN,
        site_id=site_id,
    )
    defaults.update(kwargs)
    return User(**defaults)
