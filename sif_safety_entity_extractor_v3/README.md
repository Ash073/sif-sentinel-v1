# SIF Safety Entity Extractor

## Model Identity

Model name: sif-safety-entity-extractor
Version: v3.0.0
Architecture: DistilBERT token classification
Base model: distilbert-base-uncased

## Purpose

Extract safety-relevant entities from raw safety-report text.

The model predicts three NER entity types:

- ACTIVITY
- HAZARD
- BARRIER

## Runtime Interface

The serialized runtime wrapper exposes:

    extract(text)

The returned entities contain:

- text
- label
- canonical
- start
- end
- confidence

## Canonical Mapping

The NER output is followed by a context-aware canonical mapping layer.

Canonical mapping is intended to connect model-extracted spans to the
existing SIF safety taxonomy.

The model does not fabricate entities that were not extracted by the NER
layer.

## Downstream Responsibility

The following logic is intentionally left to the deterministic backend:

- barrier status
- negation handling
- temporal status
- structured evidence
- causal/exposure reasoning
- consequence/risk calculations

## NER Labels

O
B-ACTIVITY
I-ACTIVITY
B-HAZARD
I-HAZARD
B-BARRIER
I-BARRIER

## Evaluation

Locked test set: 71 reports

Strict exact span + exact label:

Overall F1: 0.6703
Activity F1: 0.6667
Hazard F1: 0.6316
Barrier F1: 0.7273

Additional diagnostic evaluation showed that partial/overlapping entity
recognition is stronger than strict exact-span performance, but the strict
metric is the primary reported production benchmark.

## Training

Training records: 555
Validation records: 76
Test records: 71

Selected model: V3

A targeted V5 augmentation experiment added 22 training examples but reduced
locked-test Overall F1 to 0.4918. V5 was therefore rejected and is not part
of the production artifact.

## Known Limitations

The model can produce:

- overly broad entity boundaries;
- occasional missed contextual entities;
- occasional false-positive entities;
- inconsistent handling of linguistic variants.

Canonical mapping improves recognition of supported phrase variants but does
not replace NER.

## Artifact Files

config.json
model.safetensors
tokenizer.json
tokenizer_config.json
label_map.json
metadata.json
entity_extractor.joblib

## Runtime

Python: >=3.11

The wrapper uses CUDA when available and falls back to CPU otherwise.

Maximum tokenized input length: 512 tokens.

## Integration Note

The production wrapper is serialized as:

    entity_extractor.joblib

The neural model itself is stored separately in:

    model.safetensors

The wrapper loads the model and tokenizer from the artifact directory.

The backend should preserve deterministic fallback behavior if the ML
artifact is unavailable, corrupted, or inference fails.