"""Safety Copilot RAG service.

This service implements Retrieval-Augmented Generation (RAG) for the
Safety Copilot. It retrieves live database context (precursor patterns,
barrier failures, SIF trend) and passes it as grounding JSON to the
configured LLM provider (Gemini), using a dedicated system instruction
that constrains the model to data-grounded safety answers only.

Authority boundary
------------------
This service is assistive ONLY. It never modifies SIF levels, risk scores,
LSR assignments, barrier status, precursor patterns, or review decisions.
The LLM is constrained by a strict system prompt to answer only from the
provided JSON context.
"""

from __future__ import annotations

import json
import time
from typing import Any, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.schemas.copilot import CopilotResponse
from app.services.analytics_service import AnalyticsService
from app.services.precursor_engine.precursor_service import PrecursorService

logger = structlog.get_logger(__name__)

_DATA_WINDOW_DAYS = 30

# ── Copilot-specific system prompt ────────────────────────────────────────────
# This is deliberately separate from the reviewer-summary prompt in
# gemini_provider.py. The Copilot prompt allows free-form Q&A scoped to data.
_COPILOT_SYSTEM_PROMPT = """You are an AI Safety Copilot for SIF Sentinel, an industrial safety intelligence platform used by HSE (Health, Safety & Environment) professionals.

STRICT RULES — you MUST follow all of these:
1. You MUST ONLY answer based on the JSON data context provided. Do not use general knowledge to invent safety statistics.
2. If the data shows a specific statistic or trend, state it exactly using the numbers from the data (e.g. "barrier failure events increased from 2 to 8 over the past week").
3. Recommend ONE targeted, data-backed intervention based on the retrieved patterns.
4. If the data is insufficient to answer the question, explicitly state: "The available data for this period is insufficient to answer this question with confidence."
5. Never claim you can predict, prevent, or guarantee the prevention of incidents.
6. Never override a human safety officer's decision.
7. Format your response in 2–4 concise paragraphs. Be specific, data-driven, and direct.
8. Do not repeat the raw JSON back to the user.
9. End your response with a one-sentence recommended action prefixed with: "→ Recommended Action:"
10. Return ONLY a valid JSON object with a single key "summary" whose value is your plain-text response. Do not wrap the JSON in markdown code fences."""


class CopilotService:
    """RAG orchestration for the Safety Copilot."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._settings = get_settings()

    async def ask(
        self, query: str, site_id: Optional[str] = None
    ) -> CopilotResponse:
        """Execute the full RAG pipeline and return a CopilotResponse.

        Steps
        -----
        1. Retrieve live context from the database.
        2. Serialize context as a strict JSON string.
        3. Construct the grounding prompt.
        4. Call the LLM provider directly via Gemini client.
        5. Parse and return the structured response.
        6. If the LLM fails, return a deterministic fallback summary.
        """
        t_start = time.monotonic()

        # Step 1 — Retrieve context ─────────────────────────────────────────
        context, evidence_used = await self._retrieve_context(site_id)

        # Step 2 — Serialize ────────────────────────────────────────────────
        json_context = json.dumps(context, default=str, ensure_ascii=False, indent=2)

        # Step 3 — Build user prompt ────────────────────────────────────────
        user_prompt = (
            f"=== LIVE DATABASE CONTEXT (last {_DATA_WINDOW_DAYS} days) ===\n"
            f"{json_context}\n\n"
            f"SAFETY QUESTION: {query}\n\n"
            f"Produce the answer JSON:"
        )

        # Step 4 — Call LLM ─────────────────────────────────────────────────
        if not self._settings.llm_enabled:
            logger.info("copilot.llm_disabled")
            return self._build_fallback_response(
                context=context,
                evidence_used=evidence_used,
                reason="LLM_DISABLED",
            )

        # Import Gemini inline — all google-genai imports must stay isolated
        try:
            from google import genai  # type: ignore[import]
            from google.genai import types as genai_types  # type: ignore[import]
        except ImportError:
            logger.warning("copilot.gemini_sdk_missing")
            return self._build_fallback_response(
                context=context, evidence_used=evidence_used, reason="SDK_MISSING"
            )

        if not self._settings.llm_api_key:
            logger.warning("copilot.no_api_key")
            return self._build_fallback_response(
                context=context, evidence_used=evidence_used, reason="NO_API_KEY"
            )

        try:
            client = genai.Client(api_key=self._settings.llm_api_key)
            response = await client.aio.models.generate_content(
                model=self._settings.llm_model,
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=_COPILOT_SYSTEM_PROMPT,
                    temperature=0.3,  # Lower temp for data-grounded answers
                    max_output_tokens=self._settings.llm_max_output_tokens,
                    response_mime_type="application/json",
                ),
            )
        except TimeoutError:
            elapsed_ms = round((time.monotonic() - t_start) * 1000)
            logger.warning("copilot.llm_timeout", elapsed_ms=elapsed_ms)
            return self._build_fallback_response(
                context=context, evidence_used=evidence_used, reason="TIMEOUT"
            )
        except Exception as exc:
            elapsed_ms = round((time.monotonic() - t_start) * 1000)
            logger.error(
                "copilot.llm_error",
                error_type=type(exc).__name__,
                elapsed_ms=elapsed_ms,
            )
            return self._build_fallback_response(
                context=context, evidence_used=evidence_used, reason="LLM_ERROR"
            )

        elapsed_ms = round((time.monotonic() - t_start) * 1000)

        # Step 5 — Parse response ───────────────────────────────────────────
        answer = self._parse_llm_response(response)
        if answer is None:
            logger.warning("copilot.llm_parse_failure", elapsed_ms=elapsed_ms)
            return self._build_fallback_response(
                context=context, evidence_used=evidence_used, reason="MALFORMED_OUTPUT"
            )

        logger.info(
            "copilot.ask.success",
            elapsed_ms=elapsed_ms,
            model=self._settings.llm_model,
        )

        confidence = self._compute_confidence(context=context, llm_success=True)

        return CopilotResponse(
            answer=answer,
            confidence=confidence,
            evidence_used=evidence_used,
            data_window_days=_DATA_WINDOW_DAYS,
            llm_provider="gemini",
            llm_model=self._settings.llm_model,
            is_fallback=False,
        )

    # ── Private helpers ─────────────────────────────────────────────────────

    async def _retrieve_context(
        self, site_id: Optional[str]
    ) -> tuple[dict[str, Any], list[str]]:
        """Retrieve and structure live database context for RAG grounding."""
        analytics = AnalyticsService(self.db)
        precursor_svc = PrecursorService(self.db)
        evidence_used: list[str] = []

        # Dashboard summary ─────────────────────────────────────────────────
        summary = await analytics.summary()
        evidence_used.append("dashboard_summary")

        # SIF trend (30d) ───────────────────────────────────────────────────
        sif_trend = await analytics.sif_trend("30d")
        evidence_used.append("sif_rate_trend_30d")

        # Barrier failure trend (30d) ───────────────────────────────────────
        barrier_failures = await analytics.barrier_failures("30d")
        evidence_used.append("barrier_failure_trend_30d")

        # Top 3 precursor patterns by risk score ────────────────────────────
        top_precursors = await precursor_svc.list(
            site_id=site_id,
            sort="risk_score",
            limit=3,
        )
        if not isinstance(top_precursors, list):
            top_precursors = []
        evidence_used.append("top_precursor_patterns")

        total_barrier_events = sum(
            getattr(p, "failed_count", 0) for p in barrier_failures
        )

        context: dict[str, Any] = {
            "data_window": f"last_{_DATA_WINDOW_DAYS}_days",
            "site_filter": site_id if site_id else "all_sites",
            "summary": {
                "total_reports": summary.total_reports,
                "total_sif_reports": summary.total_sif_reports,
                "high_risk_reports": summary.high_risk_reports,
                "active_precursors": summary.active_precursors,
                "sites_monitored": summary.sites_monitored,
                "sif_rate": summary.sif_rate,
                "high_risk_rate": summary.high_risk_rate,
                "review_required": summary.review_required,
            },
            "top_precursor_patterns": [
                {
                    "activity": getattr(p, "activity", None),
                    "hazard": getattr(p, "hazard", None),
                    "barrier": getattr(p, "barrier", None),
                    "failure_type": getattr(p, "failure_type", None),
                    "risk_score": round(float(getattr(p, "risk_score", 0.0)), 3),
                    "trend": getattr(p, "trend", "STABLE"),
                    "occurrence_count": getattr(p, "occurrence_count", 0),
                    "sif_count": getattr(p, "sif_count", 0),
                    "priority": getattr(p, "priority", None),
                    "why_it_matters": getattr(p, "why_it_matters", None),
                }
                for p in top_precursors[:3]
            ],
            "barrier_failure_trend": [
                {
                    "date": str(getattr(p, "date", "")),
                    "failed_count": getattr(p, "failed_count", 0),
                }
                for p in barrier_failures[-7:]
            ],
            "sif_rate_trend": [
                {
                    "date": str(getattr(p, "date", "")),
                    "sif_rate": round(float(getattr(p, "sif_rate", 0.0)), 3),
                    "total_reports": getattr(p, "total_reports", 0),
                    "sif_reports": getattr(p, "sif_reports", 0),
                }
                for p in sif_trend[-14:]
            ],
            "total_barrier_failure_events_30d": total_barrier_events,
        }

        return context, evidence_used

    @staticmethod
    def _parse_llm_response(response: Any) -> Optional[str]:
        """Parse the Gemini response, expecting {"summary": "..."} JSON."""
        try:
            raw_text = (response.text or "").strip()
            # Strip markdown fences if model wrapped the JSON despite instructions
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            if not raw_text:
                return None
            parsed = json.loads(raw_text)
            summary = parsed.get("summary", "")
            return summary if isinstance(summary, str) and summary else None
        except (json.JSONDecodeError, AttributeError, TypeError):
            return None

    def _build_fallback_response(
        self,
        context: dict[str, Any],
        evidence_used: list[str],
        reason: str,
    ) -> CopilotResponse:
        """Build a deterministic fallback when the LLM is unavailable."""
        summary = context.get("summary", {})
        precursors = context.get("top_precursor_patterns", [])

        lines = [
            f"The AI language model is temporarily unavailable ({reason}). "
            f"Here is a deterministic data summary based on the last {_DATA_WINDOW_DAYS} days:",
            "",
            f"• Total reports: {summary.get('total_reports', 'N/A')} | "
            f"SIF reports: {summary.get('total_sif_reports', 'N/A')} | "
            f"SIF rate: {round(float(summary.get('sif_rate', 0)) * 100, 1)}%",
            f"• High risk reports: {summary.get('high_risk_reports', 'N/A')} | "
            f"Active precursor patterns: {summary.get('active_precursors', 'N/A')} | "
            f"Pending reviews: {summary.get('review_required', 'N/A')}",
            f"• Total barrier failure events: {context.get('total_barrier_failure_events_30d', 'N/A')}",
        ]

        if precursors:
            lines.append("")
            lines.append("Top precursor patterns by risk score:")
            for i, p in enumerate(precursors, 1):
                lines.append(
                    f"  {i}. [{p.get('priority', '—')}] "
                    f"{p.get('activity', '—')} → {p.get('hazard', '—')} "
                    f"(risk: {p.get('risk_score', '—')}, trend: {p.get('trend', '—')}, "
                    f"occurrences: {p.get('occurrence_count', '—')})"
                )

        lines.append("")
        lines.append(
            "→ Recommended Action: Review the highest-risk precursor pattern listed "
            "above with your HSE team and verify associated safety barriers are in place."
        )

        return CopilotResponse(
            answer="\n".join(lines),
            confidence=0.45,
            evidence_used=evidence_used,
            data_window_days=_DATA_WINDOW_DAYS,
            llm_provider=None,
            llm_model=None,
            is_fallback=True,
        )

    def _compute_confidence(
        self, context: dict[str, Any], llm_success: bool
    ) -> float:
        """Heuristic confidence based on data richness and LLM success."""
        if not llm_success:
            return 0.45

        summary = context.get("summary", {})
        total_reports = int(summary.get("total_reports", 0))
        precursor_count = len(context.get("top_precursor_patterns", []))
        trend_points = len(context.get("sif_rate_trend", []))

        score = 0.70
        if total_reports >= 50:
            score += 0.08
        if precursor_count >= 3:
            score += 0.07
        if trend_points >= 7:
            score += 0.05
        if context.get("site_filter") != "all_sites":
            score += 0.03

        return round(min(score, 0.98), 2)
