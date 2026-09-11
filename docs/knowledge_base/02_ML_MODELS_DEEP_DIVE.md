# 02 — ML MODELS DEEP DIVE
## SIF Sentinel — All Machine Learning Models Explained

---

## Overview: The ML Hierarchy

SIF Sentinel has a **model evolution system** — four generations of models, each more sophisticated:

```
v1  →  v2  →  v4 Hybrid / Semantic  →  v4b DistilBERT Transformer
(baseline)  (entity + SIF)  (sentence embeddings)  (state-of-the-art)
```

The active version is configured via `SIF_MODEL_BACKEND` environment variable.

---

## MODEL 1: Baseline v1 — TF-IDF + Logistic Regression

**File**: `artifacts/models/baseline_v1/model/sif_logreg.joblib`
**Vectorizer**: `artifacts/models/baseline_v1/vectorizer/tfidf.joblib`

### What it Does
- Converts report text into a TF-IDF feature matrix
- TF-IDF (Term Frequency-Inverse Document Frequency) counts how often safety-specific words appear relative to the whole corpus
- Logistic Regression classifies: SIF potential = YES or NO

### Training Process
1. Dataset: Synthetic + public oil/gas safety reports (labeled manually)
2. Preprocessing: Lowercase, contraction expansion, tokenization
3. Feature extraction: TF-IDF (1-gram and 2-gram, min_df=2)
4. Model: LogisticRegression(class_weight='balanced', C=1.0)
5. Threshold: 0.50 by default

### How It Predicts
```python
transformed = vectorizer.transform([text])
probability = model.predict_proba(transformed)[0][sif_index]
# SIF if probability >= 0.50
```

### Explainability
- Uses feature coefficients to identify "top predictive terms"
- "confined space", "gas test", "without permit" = high SIF weight
- Shows which words pushed the score up or down

### Limitations
- Bag-of-words: ignores word order ("gas test NOT performed" ≈ "gas test performed")
- No negation handling at model level (handled separately in NLP pipeline)
- Good baseline, 75-80% accuracy on test set

---

## MODEL 2: Enhanced v2 — TF-IDF + Logistic Regression (Domain-Tuned)

**File**: `artifacts/models/v2/model/sif_model.joblib`
**Also includes**: `entity_vectorizer.joblib`, `activity_model.joblib`, `hazard_model.joblib`, `barrier_model.joblib`

### Improvements over v1
- Larger training corpus
- Domain-specific feature engineering (safety vocabulary weighted)
- Separate ML models for entity classification:
  - **activity_model**: Classifies what activity is happening (Confined Space Work, Hot Work, etc.)
  - **hazard_model**: Classifies the hazard type (Fall Hazard, Toxic Atmosphere, etc.)
  - **barrier_model**: Classifies the safety barrier (Gas Testing, Fall Protection, etc.)

### Entity Models
These use the SAME vectorizer as the main classifier but predict entity categories:
```python
feat = entity_vectorizer.transform([normalized_text])
activity = activity_model.predict(feat)[0]   # e.g., "Confined Space Work"
hazard = hazard_model.predict(feat)[0]       # e.g., "Toxic Atmosphere"
barrier = barrier_model.predict(feat)[0]     # e.g., "Gas Testing"
```

If an entity model returns "NONE", it falls back to the rule-based heuristic extractor.

### v2 Accuracy
- SIF classifier: ~84% F1 on test set
- Entity extraction: ~79% accuracy on manually-labeled test reports

---

## MODEL 3: v4 Hybrid — Sentence Embeddings + Logistic Regression

**File**: `artifacts/models/v4_hybrid/sif_hybrid_model.joblib`

### Architecture
Combines TF-IDF features WITH semantic sentence embeddings:
- Uses a sentence-transformer (MiniLM or similar) to create dense 384-dim embeddings
- Concatenates TF-IDF sparse features with dense embeddings
- Final Logistic Regression on concatenated features

### Why Hybrid?
- TF-IDF captures keyword signals ("gas test", "without permit")
- Sentence embeddings capture semantic meaning ("personnel entered without verifying atmospheric conditions" = same as "entered tank without gas testing")
- Together: 88-90% F1

### Predict
```python
probability = model.predict_proba([normalized_text])[0][1]
# model internally handles embedding + TF-IDF concatenation
```

---

## MODEL 4: v4b Semantic — Pure Semantic Embeddings

**File**: `artifacts/models/v4_semantic/sif_semantic_model.joblib`

Similar to v4 Hybrid but uses ONLY sentence embeddings, no TF-IDF.
- More robust to vocabulary changes
- Better for reports with unusual phrasing
- Slightly lower precision, higher recall

---

## MODEL 5: v4b DistilBERT Transformer (BEST MODEL)

**Files**: `artifacts/models/v4b_transformer/`
- `config.json` — HuggingFace model config
- `model.safetensors` — Model weights (fine-tuned DistilBERT)
- `tokenizer.json`, `vocab.txt` — Tokenizer
- `metadata.json` — Model metadata
- `threshold.json` — Calibrated operating threshold

### Architecture
- **Base Model**: `distilbert-base-uncased` (66M parameters)
- **Fine-tuning**: On domain-specific oil & gas safety report dataset
- **Head**: Classification head (2 classes: SIF, NON-SIF)
- **Max Sequence Length**: 64 tokens

### Why DistilBERT?
- DistilBERT = 40% smaller than BERT, 60% faster, retains 97% of BERT's performance
- Understands context, negation, and complex sentence structure at the transformer level
- "gas test was NOT performed" vs "gas test was performed" — transformer knows the difference
- Best for SIH demo because it's impressive and practical

### How It Predicts
```python
# Step 1: Preprocess
norm = preprocess_text(text).normalized_text

# Step 2: Tokenize
inputs = tokenizer(norm, return_tensors="pt", truncation=True, max_length=64)

# Step 3: Forward pass (no gradient)
with torch.no_grad():
    logits = model(**inputs).logits

# Step 4: Softmax to probability
probability = float(torch.softmax(logits, dim=-1)[0, 1].item())

# Step 5: Threshold (calibrated, e.g., 0.82)
is_sif = probability >= threshold
```

### Calibrated Threshold
- Default threshold: 0.50
- After threshold calibration (Youden's J statistic), threshold may be 0.65-0.85
- This reduces false positives (non-SIF reports flagged as SIF)
- Stored in `threshold.json` → `selected_threshold`

### Transformer Hybrid (v4b_hybrid)
- Uses the TransformerHybridPipeline class
- Internally fine-tuned transformer + TF-IDF together
- Loaded via joblib (custom sklearn-compatible wrapper)

---

## How the SIFPredictor Chooses Models

```python
class SIFPredictor:
    def _load(self):
        version = get_settings().sif_model_backend  # e.g., "v4b"
        
        if version == "v1":        → loads baseline_v1 (TF-IDF + LogReg)
        if version == "v2":        → loads v2 (enhanced TF-IDF + LogReg)
        if version == "hybrid":    → loads v4_hybrid (embedding + TF-IDF)
        if version == "semantic":  → loads v4_semantic (pure embedding)
        if version == "v4b":       → loads v4b_transformer (DistilBERT)
        if version == "v4b_hybrid" → loads v4b_hybrid (transformer + TF-IDF)
        
        # Fallback if weights missing (dev mode)
        if model_not_found and env != production:
            self._is_fallback = True  # returns 0.50 probability
```

---

## SIFPrediction Output

Every model returns a standard `SIFPrediction` dataclass:
```python
SIFPrediction(
    sif_potential=True,          # Is this a SIF report?
    probability=0.87,            # ML model confidence
    sif_level=SIFLevel.HIGH,     # NON_SIF / LOW / MEDIUM / HIGH / REVIEW
    model_name="sif-transformer-distilbert-v1",
    model_version="v4b",
    predictive_terms=["gas test", "without"],    # Top features
    explainability_factors=[                      # How each feature contributed
        {"name": "ML Feature: gas test", "contribution": 0.342, "direction": "INCREASES"},
        {"name": "ML Feature: without", "contribution": 0.188, "direction": "INCREASES"}
    ]
)
```

---

## SIF Level Mapping

```
probability < (threshold - 0.08)   → NON_SIF
probability in ambiguity band       → REVIEW (human must decide)
probability >= threshold:
  relative >= 0.60                  → HIGH
  relative >= 0.25                  → MEDIUM
  relative < 0.25                   → LOW
```

---

## Entity Extraction ML vs Rule-Based

The system uses a **hybrid approach**:

1. **Rule-based (primary)**: Pattern matching with exact + fuzzy matching
   - Checks 14 activities, 15 hazards, 17 barriers by keyword
   - Uses RapidFuzz for typo tolerance (threshold: 88% similarity)
   
2. **ML-based (override)**: When entity_vectorizer models exist (v2+)
   - ML model predictions override heuristic if prediction != "NONE"
   - More accurate for ambiguous reports

3. **Both always run**: Results are merged; ML takes priority

---

## Training Data Summary

| Model | Training Size | Positive Rate | Source |
|-------|--------------|---------------|--------|
| v1 | ~2,000 reports | ~35% SIF | Synthetic + public |
| v2 | ~5,000 reports | ~32% SIF | Augmented synthetic |
| v4 hybrid | ~5,000 reports | ~32% SIF | Same + embeddings |
| v4b transformer | ~5,000 reports | ~32% SIF | Fine-tuned from v2 data |

---

## Model Registry API

Endpoint: `GET /api/v1/models/`

Returns all available model versions with metadata:
```json
[{
  "name": "sif-transformer-distilbert-v1",
  "version": "v4b",
  "type": "transformer",
  "accuracy_f1": 0.91,
  "threshold": 0.82,
  "is_active": true
}]
```
