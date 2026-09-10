from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from .preprocessing import normalize_text, normalize_texts


def train_retrieval(texts, report_ids, destination: Path) -> None:
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, strip_accents="unicode")
    matrix = vectorizer.fit_transform(normalize_texts(texts))
    destination.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, destination / "vectorizer.joblib")
    joblib.dump({"report_ids": np.asarray(report_ids), "matrix": matrix}, destination / "corpus.joblib")


def retrieve(report_text: str, artifact_dir: str | Path, top_k: int = 5) -> list[dict[str, float | str]]:
    artifact_dir = Path(artifact_dir)
    vectorizer = joblib.load(artifact_dir / "vectorizer.joblib")
    corpus = joblib.load(artifact_dir / "corpus.joblib")
    query = vectorizer.transform([normalize_text(report_text)])
    similarities = (query @ corpus["matrix"].T).toarray().ravel()
    indices = np.argsort(similarities)[::-1][:top_k]
    return [{"report_id": str(corpus["report_ids"][i]), "similarity": float(similarities[i])} for i in indices]
