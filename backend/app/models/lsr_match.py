import uuid

from sqlalchemy import Float, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db.base import Base
from app.models.mixins import UUIDTimestampMixin


class LSRMatch(UUIDTimestampMixin, Base):
    """
    Links a ReportAnalysis to a matched LifeSavingRule with confidence and evidence.
    """
    __tablename__ = "lsr_matches"
    __table_args__ = (
        Index("ix_lsr_matches_analysis_id", "analysis_id"),
        Index("ix_lsr_matches_rule_id", "rule_id"),
    )

    analysis_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("report_analyses.id"), nullable=False)
    rule_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("life_saving_rules.id"), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    evidence_text: Mapped[str | None] = mapped_column(Text)

    analysis = relationship("ReportAnalysis")
    rule = relationship("LifeSavingRule")
