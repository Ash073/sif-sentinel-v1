"""Copilot API route — POST /api/v1/copilot/ask.

The Safety Copilot is an assistive, RAG-powered service that answers
investigative safety questions using live database context.

Authority boundary
------------------
The Copilot CANNOT modify SIF levels, risk scores, LSR assignments,
barrier status, precursor patterns, or review decisions.
All responses are advisory and must be treated as investigative assistance,
not authoritative safety decisions.
"""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DBSession
from app.models.user import User
from app.schemas.copilot import CopilotRequest, CopilotResponse
from app.services.nlp.copilot_service import CopilotService

router = APIRouter(prefix="/copilot", tags=["Safety Copilot"])


@router.post(
    "/ask",
    response_model=CopilotResponse,
    summary="Ask the Safety Copilot a data-grounded investigation question",
    description=(
        "RAG-powered safety investigation assistant. "
        "Retrieves live precursor patterns, SIF trends, and barrier failure data "
        "as grounding context before querying the configured LLM. "
        "Responses are assistive only — not authoritative safety decisions."
    ),
)
async def ask_copilot(
    request: CopilotRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> CopilotResponse:
    """Ask the Safety Copilot a safety investigation question.

    The question is answered using live database context (precursor patterns,
    SIF trend, barrier failures). If the LLM is unavailable, a deterministic
    fallback summary is returned.

    - **query**: The safety investigation question (5–1000 characters).
    - **site_id**: Optional site UUID to scope the context to a single site.
    """
    service = CopilotService(db)
    return await service.ask(query=request.query, site_id=request.site_id)
