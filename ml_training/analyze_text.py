from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ml_training.src.inference import MODEL_OUTPUT_FIELDS, predict
from ml_training.src.predict_retrieval import predict_similar_reports


def analyze_text(report_text: str, artifacts_root="ml_training/artifacts", top_k: int = 5) -> dict:
    result = {name: predict(report_text, name, artifacts_root) for name in MODEL_OUTPUT_FIELDS}
    result["similar_reports"] = predict_similar_reports(report_text, artifacts_root, top_k)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("report_text")
    parser.add_argument("--artifacts-root", default="ml_training/artifacts")
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()
    print(json.dumps(analyze_text(args.report_text, args.artifacts_root, args.top_k), indent=2))
