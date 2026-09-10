from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import joblib

MODEL_OUTPUT_FIELDS = {
    "sif_classifier": "sif_potential", "activity_classifier": "activity",
    "hazard_classifier": "hazard", "barrier_classifier": "barrier",
    "barrier_status_classifier": "barrier_status", "barrier_failure_classifier": "barrier_failure",
    "lsr_classifier": "life_saving_rule",
}


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", str(value)).replace("\x00", " ")
    return re.sub(r"\s+", " ", text).strip()


def predict(report_text: str, model_name: str, artifacts_root: str | Path = "ml_training/artifacts") -> dict:
    directory = Path(artifacts_root) / model_name / "v1"
    preprocessing = joblib.load(directory / "preprocessing.joblib")
    model = joblib.load(directory / "model.joblib")
    metadata = json.loads((directory / "metadata.json").read_text(encoding="utf-8"))
    matrix = preprocessing.transform([normalize_text(report_text)])
    probabilities = model.predict_proba(matrix)[0]
    best = int(probabilities.argmax())
    field = MODEL_OUTPUT_FIELDS[model_name]
    if model_name == "sif_classifier":
        threshold = json.loads((directory / "threshold.json").read_text(encoding="utf-8"))["threshold"]
        positive_index = list(model.classes_).index(True)
        probability = float(probabilities[positive_index])
        return {field: probability >= threshold, "probability": probability, "model_version": "sif_classifier_v1"}
    return {field: str(model.classes_[best]), "confidence": float(probabilities[best]), "model_version": f"{model_name.removesuffix('_classifier')}_v1"}
