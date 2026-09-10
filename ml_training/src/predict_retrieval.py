from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import joblib
import numpy as np


def _normalize(value: str) -> str:
    text = unicodedata.normalize("NFKC", str(value)).replace("\x00", " ")
    return re.sub(r"\s+", " ", text).strip()


def predict_similar_reports(report_text: str, artifacts_root="ml_training/artifacts", top_k: int = 5) -> list[dict]:
    directory = Path(artifacts_root) / "semantic_retrieval" / "v1"
    vectorizer = joblib.load(directory / "vectorizer.joblib")
    corpus = joblib.load(directory / "corpus.joblib")
    similarities = (vectorizer.transform([_normalize(report_text)]) @ corpus["matrix"].T).toarray().ravel()
    indices = np.argsort(similarities)[::-1][:top_k]
    return [{"report_id": str(corpus["report_ids"][i]), "similarity": float(similarities[i])} for i in indices]
