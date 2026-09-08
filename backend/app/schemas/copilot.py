"""Schemas for the Safety Copilot RAG endpoint.

The Copilot is an assistive service only. It cannot override SIF, LSR,
risk scores, or any deterministic safety output. Responses must be treated
as investigative assistance, not authoritative safety decisions.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class CopilotRequest(BaseModel):
    """Request schema for the Safety Copilot."""

    query: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="The safety investigation question from the user.",
        examples=["Why did risk increase at Site A last month?"],
    )
    site_id: Optional[str] = Field(
        None,
        description="Optional site UUID to scope the retrieved context to a single site.",
    )


class CopilotResponse(BaseModel):
    """Response from the Safety Copilot RAG pipeline.

    Fields
    ------
    answer:
        The LLM-generated answer grounded in live database context.
        This is assistive content only — not a safety decision.
    confidence:
        Heuristic confidence score (0.0–1.0). Based on LLM success and
        data richness. < 0.5 means data was sparse; >= 0.8 means data
        was rich and LLM responded successfully.
    evidence_used:
        The list of data sources retrieved from the database and passed
        to the LLM as grounding context (e.g. "top_precursor_patterns",
        "barrier_failure_trend").
    data_window_days:
        The look-back period in days used to retrieve context.
    llm_provider:
        The LLM provider used (e.g. "gemini"). Null if fallback was used.
    llm_model:
        The specific model used. Null if fallback was used.
    is_fallback:
        True when the LLM was unavailable and a deterministic fallback
        summary was returned instead.
    """

    answer: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence_used: List[str]
    data_window_days: int = 30
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    is_fallback: bool = False
