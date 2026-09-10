# SIF Sentinel ML training package

This package trains a **technical prototype** on synthetic data. It is not real-world SIF validation and must not replace deterministic safety controls or human review.

## Local execution

From the repository root:

```powershell
python -m pip install -r ml_training/requirements.txt
python -m ml_training.src.run_training
python -m ml_training.src.verify_artifacts
python ml_training/analyze_text.py "Worker stood below a suspended load while the lift was in progress."
```

Outputs are written to `ml_training/artifacts/` and `ml_training/reports/`. The training pipeline reads but does not modify `data/raw/safety_reports.csv` and does not import or modify the production backend.

## Colab

Open `notebooks/sif_sentinel_ml_training.ipynb`, upload/clone the repository, set `REPO_ROOT`, and run all cells. The final cell downloads a ZIP containing artifacts and reports.
