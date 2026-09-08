from typing import Any

from pydantic import BaseModel


class ModelMetadata(BaseModel):
    model_name: str
    model_version: str
    architecture: str
    trained_at: str
    metrics: dict[str, Any]


class ModelFeedback(BaseModel):
    total_predictions: int
    reviewed_predictions: int
    approved_predictions: int
    corrected_predictions: int
    correction_rate: float | None
    human_review_metrics: dict[str, Any] | str


class ModelPerformance(BaseModel):
    offline_model_metrics: dict[str, Any]
    human_review_metrics: ModelFeedback
