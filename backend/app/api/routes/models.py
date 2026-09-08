from typing import Any
from fastapi import APIRouter, Depends

from app.api.deps import DBSession, require_roles
from app.core.constants import UserRole
from app.core.exceptions import AppError
from app.models.user import User
from app.schemas.model_observability import (
    ModelFeedback,
    ModelMetadata,
    ModelPerformance,
)
from app.services.model_service import (
    current_model_metadata,
    get_feedback,
    get_performance,
)

router = APIRouter(prefix="/models", tags=["Models"])

_analyst_roles = (UserRole.ADMIN, UserRole.HSE_MANAGER, UserRole.HSE_ANALYST)


@router.get("", response_model=list[ModelMetadata], summary="List available analysis models")
async def list_models(_: User = Depends(require_roles(*_analyst_roles))) -> list[ModelMetadata]:
    return [current_model_metadata()]


@router.get("/feedback", response_model=ModelFeedback, summary="Human-review feedback aggregates")
async def feedback(db: DBSession, _: User = Depends(require_roles(*_analyst_roles))) -> ModelFeedback:
    return await get_feedback(db)


@router.get("/performance", response_model=ModelPerformance, summary="Separate offline evaluation from human review feedback")
async def performance(db: DBSession, _: User = Depends(require_roles(*_analyst_roles))) -> ModelPerformance:
    return await get_performance(db)


@router.get("/{model_name}", response_model=ModelMetadata, summary="Get model metadata")
async def get_model(model_name: str, _: User = Depends(require_roles(*_analyst_roles))) -> ModelMetadata:
    metadata = current_model_metadata()
    if model_name not in (metadata["model_name"], metadata["model_version"]):
        raise AppError("MODEL_NOT_FOUND", "Model not found", 404)
    return metadata


@router.get("/{model_name}/metrics", response_model=dict[str, Any], summary="Get actual saved evaluation metrics")
async def get_metrics(model_name: str, _: User = Depends(require_roles(*_analyst_roles))) -> dict[str, Any]:
    metadata = current_model_metadata()
    if model_name not in (metadata["model_name"], metadata["model_version"]):
        raise AppError("MODEL_NOT_FOUND", "Model not found", 404)
    return metadata["metrics"]
