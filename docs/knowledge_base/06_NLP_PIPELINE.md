# 06 — NLP PIPELINE
## SIF Sentinel — How Text Is Analyzed Step by Step

---

## Overview: The Full Pipeline

```
Raw Text (report narrative)
    |
    v
[Step 1] PREPROCESSING        preprocess_text()
    |
    v
[Step 2] ML CLASSIFICATION    SIFPredictor.predict()
    |
    v
[Step 3] STRUCTURED EVIDENCE  get_structured_evidence()
    |
    v
[Step 4] ENTITY EXTRACTION    extract_entities()
    |
    v
[Step 5] CAUSAL REASONING     SafetyCausalReasoningEngine.evaluate_causal_safety()
    |
    v
[Step 6] LSR MAPPING          map_to_life_saving_rule()
    |
    v
[Step 7] EVIDENCE EXTRACTION  extract_evidence()
    |
    v
[Step 8] CONFIDENCE SCORING   overall_confidence()
    |
    v
[Step 9] PRECURSOR CANDIDATES generate_precursor_candidates()
    |
    v
[Step 10] RISK CALCULATION    calculate_risk()
    |
    v
[Step 11] EXPLANATION GENERATION _explain()
    |
    v
PipelineResult (returned to caller)
```

---

## Step 1: Preprocessing (preprocessing.py)

Purpose: Normalize text for consistent downstream processing.

```python
def preprocess_text(text: str) -> PreprocessedText:
```

Operations performed:
1. **Unicode normalization** (NFKC): Handles smart quotes, em-dashes
2. **Contraction expansion**: 
   - "wasn't" → "was not" (critical for negation detection)
   - "didn't" → "did not"
   - "can't" → "can not"
3. **Sentence splitting**:
   - Splits on periods, exclamation marks, question marks
   - Protects abbreviations (e.g., p.s.i., approx., hr.)
   - Protects decimal numbers (e.g., 10.5 psi)
   - Protects equipment codes (e.g., P-101.A)
4. **Whitespace collapse**
5. **Tokenization**: regex `[a-z0-9]+(?:-[a-z0-9]+)?`

Output: `PreprocessedText(original_text, normalized_text, sentences, tokens)`

Example:
```
Input: "Worker entered vessel. Gas test wasn't done before entry."
Output normalized: "worker entered vessel gas test was not done before entry"
Output sentences: ["Worker entered vessel", "Gas test was not done before entry"]
```

---

## Step 2: ML Classification (predictor.py)

Already covered in doc 02 (ML Models). Summary:
- Loads configured model (v1/v2/hybrid/transformer)
- Returns SIFPrediction with probability + level + predictive_terms + explainability_factors

---

## Step 3: Structured Evidence Extraction (entity_extractor.py)

`get_structured_evidence(document)` → `StructuredEvidence`

This is sentence-level analysis. For each sentence:

### 3a. Activity Detection
Matches against 14 activity categories using exact + fuzzy matching:
- "entered vessel" → "Confined Space Work"
- "welding" → "Hot Work"
- "lifting crane" → "Lifting"

### 3b. Hazard Detection
Matches against 15 hazard categories:
- "H2S", "gas monitoring" → "Toxic Atmosphere"
- "height", "ladder" → "Fall Hazard"
- "energy isolation" → "Stored Energy"

### 3c. Control/Barrier Detection (MOST COMPLEX)
Matches against 17 barrier categories, then:

1. Finds barrier phrase in sentence
2. Extracts context window (6 tokens before, 7 tokens after)
3. Detects **negation**: "not", "without", "missing", "absent"
4. Detects **verification**: "verified", "confirmed", "applied"
5. Detects **specific patterns**: "bypassed", "expired", "not performed"
6. Detects **temporal inversion**:
   - "Worker entered vessel BEFORE gas testing was completed" → NOT VERIFIED
   - (temporal_inversion flag)
7. Assigns **verification_status**:
   - "bypassed" → status = "bypassed"
   - "without X" or "not used" → status = "not performed"
   - "missing/absent" → status = "missing"
   - "expired" → status = "expired"
   - temporal_inversion = True → status = "not verified"
   - negated + verified → status = "not verified"
   - only negated → status = "failed"
   - only verified → status = "verified"
   - "planned/discussed" → status = "unknown"

Example:
```
Sentence: "Gas testing was not verified before tank entry"
  → Barrier: "Gas Testing" found
  → Context window: ["was", "not", "verified", "before", "tank", "entry"]
  → negated=True (has "not"), verified=True (has "verified")
  → temporal=True ("before" before phrase)
  → Status: "not verified"
  → EvidenceItem(CONTROL, "Gas Testing", "Gas Testing", negated=True, 
                  verification_status="not verified", temporal_status="before")
```

### Fuzzy Matching
Uses RapidFuzz (when installed) or SequenceMatcher:
- Threshold: 88% similarity
- Only applies to phrases >= 6 characters
- "atmosferic testing" → "atmospheric testing" (typo tolerance)

---

## Step 4: Entity Extraction

`extract_entities(document)` → `ExtractedEntities`

Wraps structured evidence into a simpler format:
- Primary activity (first ACTIVITY evidence item)
- Primary hazard (first HAZARD evidence item)
- Primary barrier:
  - Prefers barriers with failed/missing/not_verified status
  - Falls back to first barrier if all are verified
- Barrier status: EFFECTIVE / FAILED / MISSING / UNKNOWN
- Barrier failure description: "not verified", "bypassed", etc.

Also applies ML entity models (v2+) to override heuristic results.

Confidence score:
```python
confidence = min(1.0, 0.18 * len(matched_terms) + (0.18 if act_str and haz_str else 0.0))
```

---

## Step 5: Causal Safety Reasoning (causal_engine.py)

`SafetyCausalReasoningEngine.evaluate_causal_safety(document, structured_evidence, model_probability)`

Builds a **SafetyReasoningGraph** — a structured knowledge graph of causal relationships:

### Knowledge Maps Built-in
```python
ACTIVITY_TO_HAZARD_MAP = {
    "Confined Space Work": ["Toxic Atmosphere", "Oxygen Deficiency", "Stored Energy"],
    "Work at Height": ["Fall Hazard"],
    "Hot Work": ["Fire", "Explosion"],
    ...
}

HAZARD_TO_CONTROL_MAP = {
    "Fall Hazard": ["Fall Protection", "Guardrail"],
    "Toxic Atmosphere": ["Gas Testing", "Atmospheric Monitoring", "Permit"],
    "Stored Energy": ["Energy Isolation", "Lockout Tagout"],
    ...
}
```

### Graph Nodes
Each node represents a safety element:
- Activity node (e.g., "Confined Space Work")
- Hazard node (e.g., "Toxic Atmosphere")  
- Control nodes (e.g., "Gas Testing" with status NOT_VERIFIED)
- Exposure node (HIGH/MEDIUM/LOW)
- SIF Precursor node (with priority)

### Causal Chains
Extracted chain: Activity → Hazard → Control failure → Exposure → SIF

### Prevention Detection
Checks for prevention language in text:
- "worker was stopped before entering"
- "refused to proceed without gas testing"
If prevention detected → SIF exposure is mitigated

### Reasoning Summary
Generated human-readable summary of causal chain:
```
"Confined Space Work was performed. Toxic Atmosphere hazard was present. 
Gas Testing (required control) was NOT VERIFIED. This created HIGH SIF exposure.
Energy Isolation barrier was also not verified. Causal path indicates SIF precursor."
```

---

## Step 6: LSR Mapping (lsr_mapper.py)

`map_to_life_saving_rule(activity, hazard, barrier, barrier_failure, text, structured_evidence)`

Maps the analysis to one of 13 IOGP Life-Saving Rules:

Algorithm:
1. Score each LSR based on:
   - Activity match (weight: 0.25)
   - Hazard match (weight: 0.30)
   - Barrier match (weight: 0.20)
   - Keyword overlap with report text (weight: 0.15)
   - Failure pattern match (weight: 0.10)
2. Return highest-scoring LSR if score > 0.25 threshold

Output:
```python
LSRMatch(
    rule="LSR-01 Confined Space",
    confidence=0.87,
    matched_keywords=["confined space", "gas testing", "vessel entry"]
)
```

---

## Step 7: Evidence Extraction

`extract_evidence(document, entities)` → `EvidenceResult`

Identifies the key evidence span:
- Scans sentences for activity + hazard + barrier overlap
- Returns the most evidential sentence(s) as evidence_span
- Collects top evidence_sentences and evidence_terms

Example:
```
evidence_span: "Gas test was not verified before tank entry"
evidence_terms: ["gas test", "not verified", "tank entry"]
```

---

## Step 8: Confidence Scoring (confidence.py)

`overall_confidence(classifier_conf, entity_conf, rule_conf, evidence_conf)` → float

Weighted combination:
```python
overall = (
    settings.classifier_weight * classifier_conf +  # 0.45
    settings.entity_weight * entity_conf +           # 0.25
    settings.rule_weight * rule_conf +               # 0.20
    settings.evidence_weight * evidence_conf         # 0.10
)
```

If overall_confidence < 0.62 (review_threshold) → review_required = True

---

## Step 9: Precursor Candidate Generation (precursor_rules.py)

`generate_precursor_candidates(structured_evidence)` → list[PrecursorCandidateItem]

Creates precursor candidates for each failed/missing/not-verified control:
```python
PrecursorCandidateItem(
    category="HIGH_ENERGY_BARRIER_FAILURE",
    activity="Confined Space Work",
    hazard="Toxic Atmosphere",
    barrier="Gas Testing",
    failure_type="not verified",
    evidence_text="Gas test was not verified before tank entry"
)
```

Categories:
- HIGH_ENERGY_BARRIER_FAILURE
- FALL_PROTECTION_FAILURE
- ISOLATION_FAILURE
- HOT_WORK_CONTROL_FAILURE
- VEHICLE_CONTROL_FAILURE
- CONTROL_FAILURE (generic)

---

## Step 10: Risk Calculation (calculator.py)

Already covered in doc 07. Returns 1-100 score with components.

---

## Step 11: Explanation Generation

`_explain(level, structured_evidence, rule, evidence, predictive_terms, review_required, ...)`

Builds a human-readable explanation string from all analysis results:
```
"Evidence identified Confined Space Work, Toxic Atmosphere. 
 The report states that Gas Testing was NOT verified. 
 This evidence maps to the LSR-01 Confined Space Life-Saving Rule. 
 The ML model identified 'gas test', 'without' as top predictive terms. 
 Human review is recommended because the assessment depends on an ambiguous 
 or unknown verification state.
 Causal reasoning: Confined Space Work → Toxic Atmosphere → Gas Testing [NOT_VERIFIED] 
 → HIGH SIF Exposure."
```

---

## Review Decision Logic

```python
review_required = (
    confidence < 0.62 or           # Low confidence
    ambiguous or                    # ML probability in 0.42-0.58 band
    not evidence.evidence_span or   # No evidence found
    high_risk_without_rule or       # HIGH/MEDIUM risk but no LSR matched
    has_unknown_barrier             # Barrier status is ambiguous
)
```

---

## Phase 5D: Counterfactual Engine (counterfactual_engine.py)

Separate from the main pipeline. Called via API when user runs "what-if" simulation:

1. Takes existing safety graph (from analysis)
2. User specifies: target_control + simulated_status
3. Creates a deep copy of graph
4. Changes control status in the copy
5. Re-evaluates SIF exposure and risk in the simulated graph
6. Computes risk_delta = simulated_risk - original_risk
7. Returns CounterfactualScenario with full comparison

Principles:
- Original graph is NEVER mutated
- Only legitimate causal changes are simulated
- Every simulation surfaces auditable assumptions

---

## Phase 5F: Intervention Engine (intervention_engine.py)

Generates actionable corrective interventions based on:
- Causal graph structure (which controls failed)
- Risk score and priority
- Life-Saving Rule matched
- Hierarchy of Controls framework

Hierarchy of Controls:
1. ELIMINATION — Remove the hazard entirely
2. SUBSTITUTION — Replace with less hazardous alternative
3. ENGINEERING_CONTROL — Physical controls (interlocks, guards)
4. ADMINISTRATIVE_CONTROL — Procedures, permits, training
5. PPE — Personal protective equipment (last resort)

For each failed control, generates:
```python
InterventionRecommendationItem(
    title="Verify Gas Testing Before Confined Space Entry",
    description="Before any personnel enters the confined space...",
    hierarchy_level="ADMINISTRATIVE_CONTROL",
    action_type="VERIFICATION_AUDIT",
    priority="CRITICAL",
    urgency="IMMEDIATE_PRE_START",
    rationale="Gas testing failure in confined space creates immediate lethal risk..."
)
```

---

## Phase 5E: Narrative Translation (narrative_service.py)

Translates technical analysis into audience-specific narratives:

Modes:
- EXECUTIVE: Non-technical, management-focused (3-5 sentences)
- INVESTIGATION: Detailed technical investigation language
- FIELD: Plain English for frontline workers
- COUNTERFACTUAL: Prevention narrative ("If X had been done...")

Can use Gemini LLM (when enabled) or deterministic template-based generation.
