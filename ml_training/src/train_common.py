from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LogisticRegression


NONE_TARGETS = {"hazard", "barrier", "barrier_failure", "life_saving_rule"}
TARGETS = {
    "sif_classifier": "sif_potential",
    "activity_classifier": "activity",
    "hazard_classifier": "hazard",
    "barrier_classifier": "barrier",
    "barrier_status_classifier": "barrier_status",
    "barrier_failure_classifier": "barrier_failure",
    "lsr_classifier": "life_saving_rule",
}


@dataclass(frozen=True)
class SplitIndices:
    train: np.ndarray
    validation: np.ndarray
    test: np.ndarray


def target_values(frame, column: str) -> np.ndarray:
    if column == "sif_potential":
        return frame[column].astype(bool).to_numpy()
    fill = "NONE" if column in NONE_TARGETS else "UNKNOWN"
    return frame[column].fillna(fill).astype(str).to_numpy()


def build_classifier() -> LogisticRegression:
    return LogisticRegression(
        solver="liblinear",
        class_weight="balanced",
        max_iter=1_000,
        random_state=20260909,
    )
