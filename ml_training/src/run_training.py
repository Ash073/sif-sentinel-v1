from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import brier_score_loss
from sklearn.model_selection import StratifiedShuffleSplit

from .data_loader import load_dataset
from .evaluation import binary_metrics, multiclass_metrics, representative_errors, select_threshold, sif_error_analysis
from .export import artifact_checksums, export_classifier, library_versions, write_json
from .leakage_audit import run_leakage_audit
from .preprocessing import PREPROCESSING_VERSION, build_preprocessing, normalize_texts
from .retrieval import train_retrieval
from .train_common import TARGETS, SplitIndices, build_classifier, target_values
from .validation import audit_dataset


RANDOM_SEED = 20260909
EXCLUDED_FEATURES = [
    "id", "report_type", "activity", "hazard", "barrier", "barrier_status",
    "barrier_failure", "sif_level", "life_saving_rule", "source_type",
]


def grouped_split(frame: pd.DataFrame, groups: np.ndarray) -> SplitIndices:
    table = pd.DataFrame({"group": groups, "sif": frame["sif_potential"].astype(int)})
    group_table = table.groupby("group", as_index=False)["sif"].agg(lambda values: int(values.mean() >= 0.5))
    first = StratifiedShuffleSplit(n_splits=1, test_size=0.30, random_state=RANDOM_SEED)
    train_group_pos, holdout_group_pos = next(first.split(group_table["group"], group_table["sif"]))
    holdout = group_table.iloc[holdout_group_pos].reset_index(drop=True)
    second = StratifiedShuffleSplit(n_splits=1, test_size=0.50, random_state=RANDOM_SEED + 1)
    validation_pos, test_pos = next(second.split(holdout["group"], holdout["sif"]))
    train_groups = set(group_table.iloc[train_group_pos]["group"])
    validation_groups = set(holdout.iloc[validation_pos]["group"])
    test_groups = set(holdout.iloc[test_pos]["group"])
    return SplitIndices(
        train=np.flatnonzero(np.isin(groups, list(train_groups))),
        validation=np.flatnonzero(np.isin(groups, list(validation_groups))),
        test=np.flatnonzero(np.isin(groups, list(test_groups))),
    )


def distribution(values: np.ndarray, indices: np.ndarray) -> dict[str, int]:
    labels, counts = np.unique(values[indices], return_counts=True)
    return {str(label): int(count) for label, count in zip(labels, counts)}


def split_report(frame: pd.DataFrame, groups: np.ndarray, split: SplitIndices) -> dict:
    report = {"random_seed": RANDOM_SEED, "method": "group-isolated 70/15/15 split stratified on SIF"}
    for name, indices in (("train", split.train), ("validation", split.validation), ("test", split.test)):
        report[name] = {
            "rows": int(len(indices)),
            "groups": int(np.unique(groups[indices]).size),
            "class_distributions": {
                model_name: distribution(target_values(frame, target), indices)
                for model_name, target in TARGETS.items()
            },
        }
    intersections = {
        "train_validation": len(set(groups[split.train]) & set(groups[split.validation])),
        "train_test": len(set(groups[split.train]) & set(groups[split.test])),
        "validation_test": len(set(groups[split.validation]) & set(groups[split.test])),
    }
    report["cross_split_duplicate_group_intersections"] = intersections
    if any(intersections.values()):
        raise RuntimeError(f"Duplicate group leakage detected: {intersections}")
    return report


def common_metadata(model_name, target, dataset_hash, split, evaluation, classes):
    return {
        "model_name": model_name,
        "model_version": "v1",
        "task": f"document-level classification of {target} from report_text",
        "dataset_name": "safety_reports.csv",
        "dataset_sha256": dataset_hash,
        "source_type": "SYNTHETIC",
        "feature_definition": "report_text only; word (1,2) and character-within-word (3,5) TF-IDF",
        "excluded_features": EXCLUDED_FEATURES,
        "preprocessing_version": PREPROCESSING_VERSION,
        "class_mapping": {str(index): str(label) for index, label in enumerate(classes)},
        "random_seed": RANDOM_SEED,
        "train_size": int(len(split.train)), "validation_size": int(len(split.validation)), "test_size": int(len(split.test)),
        "evaluation_metrics": evaluation,
        "synthetic_data_warning": "TECHNICAL PROTOTYPE ONLY. Synthetic-data metrics are not real-world SIF validation.",
        "intended_use": "Pipeline verification and controlled backend-integration testing with human review.",
        "known_limitations": [
            "Training labels and text were generated synthetically.",
            "Synthetic templates create learnable artifacts and inflated held-out performance.",
            "No real-world generalization, fairness, drift, or safety performance has been established.",
            "Predictions must not replace deterministic safety logic or human review.",
        ],
    }


def markdown_summary(dataset, leakage, split_info, model_reports, calibration, threshold, checksums):
    lines = [
        "# SIF Sentinel ML Training Report", "",
        "> **TECHNICAL PROTOTYPE VALIDATION — NOT REAL-WORLD SIF VALIDATION.**", "",
        "## Dataset summary", "",
        f"- Shape: {dataset['rows']} rows × {dataset['columns']} columns",
        f"- SHA-256: `{dataset['dataset_sha256']}`",
        f"- Duplicate rows: {dataset['duplicate_rows']}",
        f"- Duplicate report text rows: {dataset.get('duplicate_report_text', 'see JSON report')}", "",
        "## Leakage findings", "",
        f"- Severity: **{leakage['severity']}**",
        f"- {leakage['conclusion']}",
        "- All seven models use `report_text` only; structured and downstream fields are excluded.", "",
        "## Split", "",
        f"- Train/validation/test: {split_info['train']['rows']}/{split_info['validation']['rows']}/{split_info['test']['rows']}",
        "- Duplicate and conservative near-duplicate groups crossing splits: 0", "",
        "## Model test metrics", "",
        "| Model | Primary metrics |", "|---|---|",
    ]
    for name, report in model_reports.items():
        metrics = report["test_metrics"]
        if name == "sif_classifier":
            summary = f"F1={metrics['f1']:.4f}; recall={metrics['recall']:.4f}; ROC-AUC={metrics['roc_auc']:.4f}; PR-AUC={metrics['pr_auc']:.4f}; Brier={metrics['brier_score']:.4f}"
        else:
            summary = f"macro F1={metrics['macro_f1']:.4f}; weighted F1={metrics['weighted_f1']:.4f}"
        lines.append(f"| {name} | {summary} |")
    lines += [
        "", "## SIF calibration and threshold", "",
        f"- Calibration selected: {calibration['selected']}",
        f"- Validation Brier before/after: {calibration['uncalibrated_validation_brier']:.6f}/{calibration['calibrated_validation_brier']:.6f}",
        f"- Validation-selected threshold: {threshold['threshold']:.2f}",
        f"- Validation precision/recall/F1/review volume: {threshold['precision']:.4f}/{threshold['recall']:.4f}/{threshold['f1']:.4f}/{threshold['review_volume']:.4f}", "",
        "## Error-analysis conclusion", "",
        "The held-out errors and n-gram audit must be interpreted in light of synthetic generator templates. High metrics primarily validate the technical pipeline; they do not demonstrate field validity.", "",
        "## Artifact inventory", "",
    ]
    lines.extend(f"- `{path}` — `{digest}`" for path, digest in checksums.items())
    lines += [
        "", "## Backend integration contract", "",
        "Use `ml_training/BACKEND_ML_INTEGRATION_CONTRACT.md`; no existing backend route, schema, deterministic engine, or workflow was changed.",
        "", "## Colab execution instructions", "",
        "Open `ml_training/notebooks/sif_sentinel_ml_training.ipynb`, upload or clone the complete repository, set `REPO_ROOT`, and run all cells. The last cell downloads a versioned ZIP.",
        "", "## Exact backend delivery", "",
        "Use the enumerated `ml_training/BACKEND_DELIVERY_MANIFEST.md`. The runtime bundle contains versioned artifacts, checksums, standalone inference files, the contract, and pinned requirements.",
        "", "## Final verdict", "",
        "**READY FOR BACKEND INTEGRATION** as a synthetic-data technical prototype only, with deterministic logic preserved and human review required.",
        "", "**NOT READY for production deployment or real-world SIF validation.**", "",
    ]
    return "\n".join(lines)


def run(dataset_path: Path, output_root: Path) -> None:
    reports_root = output_root.parent / "reports"
    frame = load_dataset(dataset_path)
    dataset_report = audit_dataset(frame, dataset_path)
    dataset_report["duplicate_report_text"] = int(frame["report_text"].duplicated().sum())
    dataset_report["unexpected_values"] = {
        "source_type": sorted(set(frame["source_type"]) - {"SYNTHETIC"}),
        "sif_potential": sorted(str(value) for value in set(frame["sif_potential"]) - {False, True}),
        "barrier_status": sorted(set(frame["barrier_status"].dropna()) - {"EFFECTIVE", "FAILED", "UNKNOWN"}),
    }
    groups, leakage = run_leakage_audit(frame, RANDOM_SEED)
    split = grouped_split(frame, groups)
    splits = split_report(frame, groups, split)
    write_json(reports_root / "dataset_validation.json", dataset_report)
    write_json(reports_root / "leakage_audit.json", leakage)
    write_json(reports_root / "split_report.json", splits)
    manifest = pd.DataFrame({"id": frame["id"], "duplicate_group": groups, "split": ""})
    manifest.loc[split.train, "split"] = "train"
    manifest.loc[split.validation, "split"] = "validation"
    manifest.loc[split.test, "split"] = "test"
    reports_root.mkdir(parents=True, exist_ok=True)
    manifest.to_csv(reports_root / "split_manifest.csv", index=False)

    texts = np.asarray(normalize_texts(frame["report_text"].astype(str)))
    preprocessing = build_preprocessing()
    x_train = preprocessing.fit_transform(texts[split.train])
    x_validation = preprocessing.transform(texts[split.validation])
    x_test = preprocessing.transform(texts[split.test])
    model_reports = {}
    calibration_report = {}
    selected_threshold = {}

    for model_name, target in TARGETS.items():
        y = target_values(frame, target)
        classifier = build_classifier().fit(x_train, y[split.train])
        model = classifier
        if model_name == "sif_classifier":
            raw_validation = classifier.predict_proba(x_validation)[:, list(classifier.classes_).index(True)]
            calibrated = CalibratedClassifierCV(FrozenEstimator(classifier), method="sigmoid")
            calibrated.fit(x_validation, y[split.validation])
            calibrated_validation = calibrated.predict_proba(x_validation)[:, list(calibrated.classes_).index(True)]
            raw_brier = brier_score_loss(y[split.validation], raw_validation)
            calibrated_brier = brier_score_loss(y[split.validation], calibrated_validation)
            use_calibrated = calibrated_brier < raw_brier
            model = calibrated if use_calibrated else classifier
            validation_probability = calibrated_validation if use_calibrated else raw_validation
            threshold, threshold_rows = select_threshold(y[split.validation], validation_probability)
            validation_metrics = binary_metrics(y[split.validation], validation_probability, threshold)
            test_probability = model.predict_proba(x_test)[:, list(model.classes_).index(True)]
            test_metrics = binary_metrics(y[split.test], test_probability, threshold)
            error_analysis = sif_error_analysis(
                frame["id"].to_numpy()[split.test], frame["report_text"].to_numpy()[split.test],
                y[split.test], test_probability, threshold,
            )
            calibration_report = {
                "method_evaluated": "sigmoid/Platt scaling fitted on validation only",
                "selected": "sigmoid" if use_calibrated else "uncalibrated",
                "uncalibrated_validation_brier": float(raw_brier),
                "calibrated_validation_brier": float(calibrated_brier),
                "test_set_used_for_decision": False,
            }
            selected_threshold = {**min(threshold_rows, key=lambda row: abs(row["threshold"] - threshold)), "selection_set": "validation", "objective": "maximum F1; recall tie-break"}
            evaluation = {
                "validation_metrics": validation_metrics, "test_metrics": test_metrics,
                "calibration": calibration_report, "threshold_analysis": threshold_rows,
                "error_analysis": error_analysis,
                "template_artifact_warning": leakage["text_template_leakage"]["interpretation"],
            }
            threshold_payload = selected_threshold
        else:
            validation_probability = classifier.predict_proba(x_validation)
            test_probability = classifier.predict_proba(x_test)
            validation_metrics = multiclass_metrics(y[split.validation], validation_probability, classifier.classes_)
            test_metrics = multiclass_metrics(y[split.test], test_probability, classifier.classes_)
            error_analysis = representative_errors(
                frame["id"].to_numpy()[split.test], frame["report_text"].to_numpy()[split.test],
                y[split.test], test_probability, classifier.classes_,
            )
            evaluation = {
                "validation_metrics": validation_metrics, "test_metrics": test_metrics,
                "error_analysis": error_analysis,
                "template_artifact_warning": leakage["text_template_leakage"]["interpretation"],
            }
            threshold_payload = None
        metadata = common_metadata(model_name, target, dataset_report["dataset_sha256"], split, evaluation["test_metrics"], model.classes_)
        export_classifier(output_root, model_name, model, preprocessing, metadata, evaluation, threshold_payload)
        model_reports[model_name] = evaluation

    retrieval_dir = output_root / "semantic_retrieval" / "v1"
    train_retrieval(frame["report_text"].astype(str), frame["id"], retrieval_dir)
    write_json(retrieval_dir / "metadata.json", {
        "model_name": "semantic_retrieval", "model_version": "v1", "task": "assistive TF-IDF cosine retrieval",
        "dataset_name": "safety_reports.csv", "dataset_sha256": dataset_report["dataset_sha256"], "source_type": "SYNTHETIC",
        "feature_definition": "report_text word (1,2) TF-IDF", "excluded_features": EXCLUDED_FEATURES,
        "preprocessing_version": PREPROCESSING_VERSION, "class_mapping": {}, "library_versions": library_versions(),
        "training_timestamp": pd.Timestamp.now(tz="UTC").isoformat(), "random_seed": RANDOM_SEED,
        "train_size": len(frame), "validation_size": 0, "test_size": 0, "evaluation_metrics": {},
        "synthetic_data_warning": "Assistive retrieval over synthetic reports; not a supervised precursor predictor.",
        "intended_use": "Return similar synthetic report IDs for analyst assistance.",
        "known_limitations": ["Lexical similarity is not semantic causality.", "Corpus is synthetic."],
    })
    write_json(retrieval_dir / "evaluation_report.json", {
        "evaluation_type": "functional retrieval prototype only",
        "supervised_metrics": None,
        "warning": "No relevance judgments exist; this is not a trained supervised precursor predictor.",
    })
    checksums = artifact_checksums(output_root)
    write_json(reports_root / "model_metrics.json", model_reports)
    write_json(reports_root / "artifact_checksums.json", checksums)
    (reports_root / "FINAL_TRAINING_REPORT.md").write_text(
        markdown_summary(dataset_report, leakage, splits, model_reports, calibration_report, selected_threshold, checksums), encoding="utf-8"
    )
    print(json.dumps({"status": "complete", "artifacts": str(output_root), "reports": str(reports_root)}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=Path("data/raw/safety_reports.csv"))
    parser.add_argument("--artifacts", type=Path, default=Path("ml_training/artifacts"))
    args = parser.parse_args()
    run(args.dataset, args.artifacts)


if __name__ == "__main__":
    main()
