from __future__ import annotations

import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy
import pandas
import scipy
import sklearn


def library_versions() -> dict[str, str]:
    return {
        "python": platform.python_version(), "scikit-learn": sklearn.__version__,
        "numpy": numpy.__version__, "pandas": pandas.__version__,
        "scipy": scipy.__version__, "joblib": joblib.__version__,
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def export_classifier(
    root: Path, name: str, model, preprocessing, metadata: dict[str, Any],
    evaluation: dict[str, Any], threshold: dict[str, Any] | None = None,
) -> Path:
    destination = root / name / "v1"
    destination.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, destination / "model.joblib")
    joblib.dump(preprocessing, destination / "preprocessing.joblib")
    metadata = {
        **metadata,
        "library_versions": library_versions(),
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "evaluation_metrics": evaluation.get("test_metrics", evaluation),
    }
    write_json(destination / "metadata.json", metadata)
    write_json(destination / "evaluation_report.json", evaluation)
    if threshold is not None:
        write_json(destination / "threshold.json", threshold)
    return destination


def artifact_checksums(root: Path) -> dict[str, str]:
    checksums = {}
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.name != "checksums.sha256":
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            checksums[path.relative_to(root).as_posix()] = digest
    (root / "checksums.sha256").write_text(
        "".join(f"{digest}  {path}\n" for path, digest in checksums.items()), encoding="utf-8"
    )
    return checksums
