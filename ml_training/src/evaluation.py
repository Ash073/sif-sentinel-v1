from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    precision_score,
    recall_score,
    roc_auc_score,
    top_k_accuracy_score,
)


def _native(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _native(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, np.ndarray)):
        return [_native(item) for item in value]
    if isinstance(value, (np.integer, np.floating, np.bool_)):
        return value.item()
    return value


def threshold_table(y_true: np.ndarray, probabilities: np.ndarray) -> list[dict[str, float]]:
    rows = []
    for threshold in np.linspace(0.05, 0.95, 91):
        prediction = probabilities >= threshold
        rows.append({
            "threshold": float(threshold),
            "precision": float(precision_score(y_true, prediction, zero_division=0)),
            "recall": float(recall_score(y_true, prediction, zero_division=0)),
            "f1": float(f1_score(y_true, prediction, zero_division=0)),
            "review_volume": float(prediction.mean()),
        })
    return rows


def select_threshold(y_true: np.ndarray, probabilities: np.ndarray) -> tuple[float, list[dict[str, float]]]:
    rows = threshold_table(y_true, probabilities)
    best = max(rows, key=lambda row: (row["f1"], row["recall"], -row["threshold"]))
    return float(best["threshold"]), rows


def binary_metrics(y_true: np.ndarray, probabilities: np.ndarray, threshold: float) -> dict[str, Any]:
    prediction = probabilities >= threshold
    fraction_positive, mean_predicted = calibration_curve(y_true, probabilities, n_bins=10, strategy="quantile")
    return _native({
        "threshold": threshold,
        "precision": precision_score(y_true, prediction, zero_division=0),
        "recall": recall_score(y_true, prediction, zero_division=0),
        "f1": f1_score(y_true, prediction, zero_division=0),
        "roc_auc": roc_auc_score(y_true, probabilities),
        "pr_auc": average_precision_score(y_true, probabilities),
        "brier_score": brier_score_loss(y_true, probabilities),
        "review_volume": prediction.mean(),
        "confusion_matrix": confusion_matrix(y_true, prediction, labels=[0, 1]),
        "calibration_curve": {
            "mean_predicted_probability": mean_predicted,
            "fraction_positive": fraction_positive,
        },
    })


def multiclass_metrics(y_true: np.ndarray, probabilities: np.ndarray, classes: np.ndarray) -> dict[str, Any]:
    indices = np.argmax(probabilities, axis=1)
    prediction = classes[indices]
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, prediction, labels=classes, zero_division=0
    )
    result: dict[str, Any] = {
        "accuracy": accuracy_score(y_true, prediction),
        "macro_f1": f1_score(y_true, prediction, average="macro", zero_division=0),
        "weighted_f1": f1_score(y_true, prediction, average="weighted", zero_division=0),
        "per_class": {
            str(label): {"precision": precision[i], "recall": recall[i], "f1": f1[i], "support": support[i]}
            for i, label in enumerate(classes)
        },
        "confusion_matrix": confusion_matrix(y_true, prediction, labels=classes),
        "class_order": classes,
    }
    if len(classes) > 2:
        top_k = min(3, len(classes) - 1)
        result["top_k_accuracy"] = top_k_accuracy_score(
            y_true, probabilities, k=top_k, labels=classes
        )
        result["top_k"] = top_k
    return _native(result)


def representative_errors(ids, texts, y_true, probabilities, classes, limit: int = 10) -> dict[str, Any]:
    predicted = classes[np.argmax(probabilities, axis=1)]
    confidence = probabilities.max(axis=1)
    errors = np.flatnonzero(predicted != y_true)
    errors = errors[np.argsort(confidence[errors])[::-1]][:limit]
    return {
        "error_count": int((predicted != y_true).sum()),
        "representative_errors": [
            {
                "id": str(ids[index]), "report_text": str(texts[index]),
                "true_label": str(y_true[index]), "predicted_label": str(predicted[index]),
                "confidence": float(confidence[index]),
            }
            for index in errors
        ],
    }


def sif_error_analysis(ids, texts, y_true, probabilities, threshold: float) -> dict[str, Any]:
    prediction = probabilities >= threshold
    confidence = np.where(prediction, probabilities, 1 - probabilities)

    def samples(mask, order, limit=10):
        candidates = np.flatnonzero(mask)
        candidates = candidates[np.argsort(order[candidates])[::-1]][:limit]
        return [
            {"id": str(ids[i]), "report_text": str(texts[i]), "true_label": bool(y_true[i]),
             "probability": float(probabilities[i]), "predicted_label": bool(prediction[i])}
            for i in candidates
        ]

    return {
        "false_positives": samples((prediction == 1) & (y_true == 0), probabilities),
        "false_negatives": samples((prediction == 0) & (y_true == 1), 1 - probabilities),
        "ambiguous_cases": samples(np.ones(len(y_true), dtype=bool), -np.abs(probabilities - threshold)),
        "highly_confident_cases": samples(np.ones(len(y_true), dtype=bool), confidence),
    }
