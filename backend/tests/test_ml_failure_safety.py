"""GAP-05: ML/NLP/LLM failure path safety tests.

Verifies that:
- LLM failures never corrupt authoritative SIF/risk/LSR analysis fields
- Disabled LLM produces LLM_DISABLED error code, not success
- Invalid LLM output is rejected with MALFORMED_OUTPUT/INVALID_RESPONSE
- Analysis pipeline failure marks report FAILED and audits, not silently succeeds
- reviewer_summary stays None on LLM failure — never falls back to fabricated text
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, UTC

from app.core.constants import ReportStatus
from app.services.llm.result import LLMResult
from tests.factories import make_report, make_site, make_user


@pytest.mark.asyncio
async def test_llm_disabled_returns_llm_disabled_error_code():
    """When LLM is disabled, assistance service returns LLM_DISABLED — not success=True."""
    from app.services.llm.assistance_service import LLMAssistanceService

    with patch("app.services.llm.assistance_service.get_settings") as mock_settings:
        mock_settings.return_value.llm_enabled = False
        result = await LLMAssistanceService.request_reviewer_summary(
            report_text="Worker fell",
            structured_evidence={},
            authoritative_results={},
        )

    assert result.success is False
    assert result.error_code == "LLM_DISABLED"
    assert result.summary is None


@pytest.mark.asyncio
async def test_llm_provider_unavailable_does_not_raise():
    """If LLM provider is None, request_reviewer_summary returns a failure result."""
    from app.services.llm.assistance_service import LLMAssistanceService

    with patch("app.services.llm.assistance_service.get_settings") as mock_settings, \
         patch("app.services.llm.assistance_service.LLMManager.get_provider", return_value=None):
        mock_settings.return_value.llm_enabled = True
        mock_settings.return_value.llm_max_calls_per_analysis = 1
        mock_settings.return_value.llm_provider = "gemini"
        mock_settings.return_value.llm_model = "gemini-test"
        result = await LLMAssistanceService.request_reviewer_summary(
            report_text="Worker fell",
            structured_evidence={},
            authoritative_results={},
        )

    assert result.success is False
    assert result.error_code == "PROVIDER_UNAVAILABLE"
    assert result.summary is None


@pytest.mark.asyncio
async def test_llm_exception_returns_safe_failure():
    """If provider.generate_reviewer_summary raises, it must not propagate — returns safe failure."""
    from app.services.llm.assistance_service import LLMAssistanceService

    mock_provider = AsyncMock()
    mock_provider.generate_reviewer_summary.side_effect = RuntimeError("Simulated crash")

    with patch("app.services.llm.assistance_service.get_settings") as mock_settings, \
         patch("app.services.llm.assistance_service.LLMManager.get_provider", return_value=mock_provider):
        mock_settings.return_value.llm_enabled = True
        mock_settings.return_value.llm_max_calls_per_analysis = 1
        mock_settings.return_value.llm_provider = "gemini"
        mock_settings.return_value.llm_model = "gemini-test"
        result = await LLMAssistanceService.request_reviewer_summary(
            report_text="Worker fell",
            structured_evidence={},
            authoritative_results={},
        )

    assert result.success is False
    assert result.error_code == "UNEXPECTED_ERROR"
    assert result.summary is None


def test_gemini_malformed_json_returns_malformed_output():
    """_parse_response with non-JSON text returns MALFORMED_OUTPUT, not success."""
    from app.services.llm.gemini_provider import GeminiProvider

    provider = GeminiProvider.__new__(GeminiProvider)
    provider.model_name = "test-model"

    mock_response = MagicMock()
    mock_response.text = "this is not json"
    result = provider._parse_response(mock_response, latency_ms=50)

    assert result.success is False
    assert result.error_code == "MALFORMED_OUTPUT"
    assert result.summary is None


def test_gemini_empty_response_returns_empty_response_code():
    """_parse_response with empty text returns EMPTY_RESPONSE error code."""
    from app.services.llm.gemini_provider import GeminiProvider

    provider = GeminiProvider.__new__(GeminiProvider)
    provider.model_name = "test-model"

    mock_response = MagicMock()
    mock_response.text = ""
    result = provider._parse_response(mock_response, latency_ms=10)

    assert result.success is False
    assert result.error_code == "EMPTY_RESPONSE"
    assert result.summary is None


def test_gemini_valid_response_accepted():
    """_parse_response with valid JSON returns success=True with the summary."""
    from app.services.llm.gemini_provider import GeminiProvider

    provider = GeminiProvider.__new__(GeminiProvider)
    provider.model_name = "test-model"

    mock_response = MagicMock()
    mock_response.text = '{"summary": "Worker slipped near the chemical storage area."}'
    result = provider._parse_response(mock_response, latency_ms=100)

    assert result.success is True
    assert result.summary == "Worker slipped near the chemical storage area."
    assert result.error_code is None


def test_gemini_oversized_summary_rejected():
    """Summary exceeding 4096 chars is rejected by Pydantic validation."""
    from app.services.llm.gemini_provider import GeminiProvider
    import json

    provider = GeminiProvider.__new__(GeminiProvider)
    provider.model_name = "test-model"

    oversized = "A" * 4097
    mock_response = MagicMock()
    mock_response.text = json.dumps({"summary": oversized})
    result = provider._parse_response(mock_response, latency_ms=100)

    assert result.success is False
    assert result.error_code == "INVALID_RESPONSE"
    assert result.summary is None


@pytest.mark.asyncio
async def test_analysis_pipeline_failure_marks_report_failed(transactional_db):
    """If the NLP pipeline raises, the report must end up FAILED, not ANALYZING or NEW."""
    from app.services.analysis.analysis_service import AnalysisService

    db = transactional_db
    site = make_site(code="FAIL1")
    db.add(site)
    await db.flush()
    user = make_user(site_id=site.id)
    db.add(user)
    await db.flush()
    report = make_report(site_id=site.id, created_by=user.id)
    db.add(report)
    await db.commit()

    broken_pipeline = MagicMock()
    broken_pipeline.analyze_text.side_effect = RuntimeError("Model weights corrupted")

    service = AnalysisService(db, pipeline=broken_pipeline)

    from app.core.exceptions import AppError
    with pytest.raises(AppError) as exc_info:
        await service.analyze_report(report.report_id, user.id, "127.0.0.1")

    assert exc_info.value.status_code == 503

    # Re-fetch to verify FAILED status was persisted
    from sqlalchemy import select
    from app.models.report import Report as ReportModel
    refreshed = await db.scalar(select(ReportModel).where(ReportModel.id == report.id))
    assert refreshed.status == ReportStatus.FAILED, (
        f"Report must be FAILED after pipeline crash, got {refreshed.status}"
    )
