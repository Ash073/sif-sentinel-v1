from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from .inference import MODEL_OUTPUT_FIELDS, predict
from .predict_retrieval import predict_similar_reports


def verify(root: Path) -> dict:
    sample = "A worker entered the vessel without gas testing or an attendant."
    predictions = {name: predict(sample, name, root) for name in MODEL_OUTPUT_FIELDS}
    repeated = {name: predict(sample, name, root) for name in MODEL_OUTPUT_FIELDS}
    retrieval = predict_similar_reports(sample, root, 3)
    for name, payload in predictions.items():
        assert payload["model_version"].endswith("_v1"), name
    assert len(retrieval) == 3
    assert predictions == repeated
    checksum_lines = (root / "checksums.sha256").read_text(encoding="utf-8").splitlines()
    for line in checksum_lines:
        expected, relative = line.split("  ", 1)
        actual = hashlib.sha256((root / relative).read_bytes()).hexdigest()
        assert actual == expected, relative
    return {
        "artifact_reload": "PASS", "standalone_inference": "PASS",
        "repeat_inference_consistency": "PASS", "checksum_verification": "PASS",
        "predictions": predictions, "retrieval": retrieval,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", type=Path, default=Path("ml_training/artifacts"))
    args = parser.parse_args()
    print(json.dumps(verify(args.artifacts), indent=2))
