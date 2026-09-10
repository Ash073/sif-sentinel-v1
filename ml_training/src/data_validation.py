from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd


REQUIRED_COLUMNS = [
    "id", "report_type", "report_text", "activity", "hazard", "barrier",
    "barrier_status", "barrier_failure", "sif_potential", "sif_level",
    "life_saving_rule", "source_type",
]


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_and_validate(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path, low_memory=False)
    missing = sorted(set(REQUIRED_COLUMNS) - set(frame.columns))
    extra = sorted(set(frame.columns) - set(REQUIRED_COLUMNS))
    if missing or extra:
        raise ValueError(f"Schema mismatch: missing={missing}, extra={extra}")
    if frame["id"].isna().any() or frame["id"].duplicated().any():
        raise ValueError("id must be present and unique")
    if frame["report_text"].isna().any() or frame["report_text"].astype(str).str.strip().eq("").any():
        raise ValueError("report_text must be non-empty")
    if frame["sif_potential"].isna().any():
        raise ValueError("sif_potential must be present")
    labels = set(frame["sif_potential"].unique().tolist())
    if labels != {False, True}:
        raise ValueError(f"Expected exact Boolean labels False/True, got {labels}")
    if set(frame["source_type"].unique()) != {"SYNTHETIC"}:
        raise ValueError("This pipeline is restricted to the synthetic prototype dataset")
    return frame


def _json_counts(series: pd.Series) -> dict[str, int]:
    return {
        "<MISSING>" if pd.isna(key) else str(key): int(value)
        for key, value in series.value_counts(dropna=False).items()
    }


def audit_dataset(frame: pd.DataFrame, path: Path) -> dict[str, Any]:
    lengths = frame["report_text"].astype(str).str.len()
    words = frame["report_text"].astype(str).str.findall(r"\b\w+\b").str.len()
    return {
        "dataset_path": str(path),
        "dataset_sha256": file_sha256(path),
        "rows": int(len(frame)),
        "columns": int(len(frame.columns)),
        "column_names": frame.columns.tolist(),
        "dtypes": {column: str(dtype) for column, dtype in frame.dtypes.items()},
        "missing_values": {column: int(value) for column, value in frame.isna().sum().items()},
        "duplicate_rows": int(frame.duplicated().sum()),
        "duplicate_ids": int(frame["id"].duplicated().sum()),
        "unique_values": {column: int(frame[column].nunique(dropna=False)) for column in frame.columns},
        "categorical_distributions": {
            column: _json_counts(frame[column])
            for column in frame.columns
            if column not in {"id", "report_text"}
        },
        "label_distribution": _json_counts(frame["sif_potential"]),
        "text_character_length": {
            key: float(value)
            for key, value in lengths.describe(percentiles=[0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]).items()
        },
        "text_word_length": {
            key: float(value)
            for key, value in words.describe(percentiles=[0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]).items()
        },
        "synthetic_data_warning": (
            "Prototype-only synthetic labels. Metrics do not estimate real-world SIF performance."
        ),
    }


def write_json(payload: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
