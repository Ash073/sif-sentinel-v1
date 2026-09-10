# Backend ML Integration Contract — Phase 1

> These artifacts are a synthetic-data technical prototype. They are ready only for controlled backend integration testing, not production safety decisions or real-world SIF validation. Existing deterministic logic and API contracts remain authoritative.

## Common input

All classifiers accept one non-empty UTF-8 string:

```json
{"report_text": "Worker entered the vessel before atmospheric testing."}
```

The inference boundary must reject missing/non-string/blank text before calling a model. No structured report fields are consumed.

## Classifier outputs

| Artifact | Output schema |
|---|---|
| `sif_classifier/v1` | `{"sif_potential": true, "probability": 0.91, "model_version": "sif_classifier_v1"}` |
| `activity_classifier/v1` | `{"activity": "Confined Space Work", "confidence": 0.94, "model_version": "activity_v1"}` |
| `hazard_classifier/v1` | `{"hazard": "Toxic Atmosphere", "confidence": 0.88, "model_version": "hazard_v1"}` |
| `barrier_classifier/v1` | `{"barrier": "Gas Testing", "confidence": 0.86, "model_version": "barrier_v1"}` |
| `barrier_status_classifier/v1` | `{"barrier_status": "FAILED", "confidence": 0.90, "model_version": "barrier_status_v1"}` |
| `barrier_failure_classifier/v1` | `{"barrier_failure": "not performed", "confidence": 0.84, "model_version": "barrier_failure_v1"}` |
| `lsr_classifier/v1` | `{"life_saving_rule": "Confined Space", "confidence": 0.92, "model_version": "lsr_v1"}` |

Hazard, barrier, barrier failure, and life-saving-rule classifiers can return the literal class `NONE`. Barrier status is one of `EFFECTIVE`, `FAILED`, or `UNKNOWN`. Confidence/probability values are finite numbers in `[0, 1]`.

The SIF Boolean is derived from the versioned validation-selected threshold in `threshold.json`, not an assumed value of 0.50. The probability is the positive-class probability.

## Retrieval output

Input is `report_text` plus an integer `top_k`. Output is a list:

```json
[{"report_id": "SYN-01001", "similarity": 0.73}]
```

Retrieval is lexical TF-IDF cosine similarity over the synthetic corpus. It is assistive retrieval, not a trained supervised precursor predictor.

## Artifact loading

For each classifier, load `preprocessing.joblib`, `model.joblib`, `metadata.json`, and—for SIF—`threshold.json`. Apply the deterministic normalization in `ml_training/src/preprocessing.py`, transform the single text, then call `predict_proba`. `ml_training/src/inference.py` is the reference implementation.

## Failure behavior and controls

- Artifact absence, checksum mismatch, deserialization error, non-finite output, or unknown model version must fail closed to the existing deterministic/human-review path.
- ML output must be additive and must not overwrite deterministic risk, precursor, intervention, or review outcomes.
- Log the model version and threshold version with every prediction.
- Do not expose internal vectorizer matrices or accept serialized objects from clients.
