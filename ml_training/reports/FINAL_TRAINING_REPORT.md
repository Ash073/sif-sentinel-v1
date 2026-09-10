# SIF Sentinel ML Training Report

> **TECHNICAL PROTOTYPE VALIDATION — NOT REAL-WORLD SIF VALIDATION.**

## Dataset summary

- Shape: 10000 rows × 12 columns
- SHA-256: `3225b279a2b0809ba3a6c8e44ee50b5821e21f6f9d9c91c216ade67f6f94d691`
- Duplicate rows: 0
- Duplicate report text rows: 1352

## Leakage findings

- Severity: **SEVERE**
- Across the seven targets, structured labels deterministically or strongly encode downstream targets, and report_text is generated from label-specific templates. Only report_text is permitted, duplicate groups must be isolated, and all performance is prototype-only.
- All seven models use `report_text` only; structured and downstream fields are excluded.

## Split

- Train/validation/test: 7437/1250/1313
- Duplicate and conservative near-duplicate groups crossing splits: 0

## Model test metrics

| Model | Primary metrics |
|---|---|
| sif_classifier | F1=1.0000; recall=1.0000; ROC-AUC=1.0000; PR-AUC=1.0000; Brier=0.0000 |
| activity_classifier | macro F1=1.0000; weighted F1=1.0000 |
| hazard_classifier | macro F1=1.0000; weighted F1=1.0000 |
| barrier_classifier | macro F1=1.0000; weighted F1=1.0000 |
| barrier_status_classifier | macro F1=1.0000; weighted F1=1.0000 |
| barrier_failure_classifier | macro F1=1.0000; weighted F1=1.0000 |
| lsr_classifier | macro F1=1.0000; weighted F1=1.0000 |

## SIF calibration and threshold

- Calibration selected: sigmoid
- Validation Brier before/after: 0.001224/0.000007
- Validation-selected threshold: 0.05
- Validation precision/recall/F1/review volume: 1.0000/1.0000/1.0000/0.4400

## Error-analysis conclusion

The held-out errors and n-gram audit must be interpreted in light of synthetic generator templates. High metrics primarily validate the technical pipeline; they do not demonstrate field validity.

## Artifact inventory

- `.gitkeep` — `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b`
- `activity_classifier/v1/evaluation_report.json` — `0ee144c5497ef27af933742738c8f28065c2c16cb98bbf8a6ccd99ed2c68f6f1`
- `activity_classifier/v1/metadata.json` — `ffb8cea531fdc713ba78eb9125669c8bb5a92287d8411130087a4abca0a2f003`
- `activity_classifier/v1/model.joblib` — `356e9b4464299c824c4c37f2a0060302bf365d94629b197125be7d5cd55b0c83`
- `activity_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `barrier_classifier/v1/evaluation_report.json` — `206c9560081571bdf9b42b9154729a1fabcdf7426fe6a181a46854b85da61673`
- `barrier_classifier/v1/metadata.json` — `a5112794ba1d80d6d052c46c92624c85db438f78773b6eaaef3ba0b32ceaf908`
- `barrier_classifier/v1/model.joblib` — `66a4cc3a1d53fa0fa6299d4a0c174d27719dfb5c50ef1b92d173eca5bf1473d8`
- `barrier_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `barrier_failure_classifier/v1/evaluation_report.json` — `f02e78a2f6b1badaaad666d675b7261cd15a3daaf1c5d9de415f825e128e14e4`
- `barrier_failure_classifier/v1/metadata.json` — `a95b0fb69973584fe792d581d4ec871b69f92ea201dbc93f9af11d61fae29b9c`
- `barrier_failure_classifier/v1/model.joblib` — `a620d3de0af0a486128852db3f02f28efb107b770c3ee2206422d41e99466a63`
- `barrier_failure_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `barrier_status_classifier/v1/evaluation_report.json` — `ec321ad13f7cfd09a4aaabdb3a3dcbe5a4783be956a2b527a6cc91148b7abfbb`
- `barrier_status_classifier/v1/metadata.json` — `c7157b9874eb44c8cd11f7f7ecd9ba1c640316ca25e5f29b835e4a71bfa24c4b`
- `barrier_status_classifier/v1/model.joblib` — `a1d24c605abc33af750b8eba91776d1a8fd343f1b42295962f553c6b3ef9e5e5`
- `barrier_status_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `hazard_classifier/v1/evaluation_report.json` — `db002b0b8a2933b7d7ccede350b92f81c30029a7dfef8fa1056f158b7ca202dd`
- `hazard_classifier/v1/metadata.json` — `f003f2920a0bccfc8c07281f586a8dd0d2715950aa9c7b15cafbd6529324154d`
- `hazard_classifier/v1/model.joblib` — `e4987ae1ff454ecb7c9a5b91cdb6f5f7bcb8a55afa92f16feb73ca5f2a0cc858`
- `hazard_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `lsr_classifier/v1/evaluation_report.json` — `340bdd7fa79ac964f788feef688361fbf715881d3cdbb57d7475adac514e6244`
- `lsr_classifier/v1/metadata.json` — `4c701d41d73ca0a347baebbe4b18529ece5e51c4804b8f27f53589ffa4b150c4`
- `lsr_classifier/v1/model.joblib` — `901f062d6fde11bea953f75bce56587860db954da8f9fc667553e17f8c83296b`
- `lsr_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `semantic_retrieval/v1/corpus.joblib` — `db2822f94a3929858074a18c9745e8bfdbc879de46c097a195f854c81a3f3997`
- `semantic_retrieval/v1/evaluation_report.json` — `b8d325cbaeb3ecd600f5b3973f91d8890e0f5fa69b6621449ebbde1dde1c988b`
- `semantic_retrieval/v1/metadata.json` — `db709d870cd7c8d560c0bc3789594246e84c835bb13b21b818fcd2aac578dcad`
- `semantic_retrieval/v1/vectorizer.joblib` — `49b350d0041410a9028127f8710f883cd11225860a5c976148e694bed682c24d`
- `sif_classifier/v1/evaluation_report.json` — `8aa9c145f0b5b5636d720511ffb204448346c27ecdd619023041644d21e948d0`
- `sif_classifier/v1/metadata.json` — `2fcaf64d0942662e5bae97a814e73528a889cd366b4638ef10da4df9f45c3ac2`
- `sif_classifier/v1/model.joblib` — `d540eac3b1d70c1a9b49f9001a8db433034836873cacb4684119d44ccc44fe00`
- `sif_classifier/v1/preprocessing.joblib` — `fa7664ed9de564b510a4c80c984d052fa889a0ab1932dd3cd68a3e46232ea28c`
- `sif_classifier/v1/threshold.json` — `ed2e597eeee4855cdcb41ed967ac93a6d946500e1b85b92a2cb0c740bb7e7319`

## Backend integration contract

Use `ml_training/BACKEND_ML_INTEGRATION_CONTRACT.md`; no existing backend route, schema, deterministic engine, or workflow was changed.

## Colab execution instructions

Open `ml_training/notebooks/sif_sentinel_ml_training.ipynb`, upload or clone the complete repository, set `REPO_ROOT`, and run all cells. The last cell downloads a versioned ZIP.

## Exact backend delivery

Use the enumerated `ml_training/BACKEND_DELIVERY_MANIFEST.md`. The runtime bundle contains versioned artifacts, checksums, standalone inference files, the contract, and pinned requirements.

## Final verdict

**READY FOR BACKEND INTEGRATION** as a synthetic-data technical prototype only, with deterministic logic preserved and human review required.

**NOT READY for production deployment or real-world SIF validation.**
