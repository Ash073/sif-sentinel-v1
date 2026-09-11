# 07 — RISK ENGINE & PRECURSOR DETECTION
## SIF Sentinel — How Risk Is Calculated

---

## Part A: Per-Report Risk Score (1-100 Scale)

### Purpose
Every analyzed report gets a risk score from 1 to 100.
This tells you: how dangerous is THIS specific report?

### Formula
```
Total = Consequence + Control_Degradation + LSR_Relevance + Precursor_Recurrence
     Max: 30          Max: 30               Max: 15          Max: 25
     = 100 max
```

### Component 1: Consequence (Max 30)

| SIF Level | Score | Reason |
|-----------|-------|--------|
| HIGH | 30 | "High potential for Serious Injury or Fatality" |
| MEDIUM | 20 | "Medium potential for SIF" |
| LOW | 10 | "Low potential for SIF" |
| SIF potential only | 15 | "General SIF potential identified" |
| NON_SIF | 0 | — |

### Component 2: Control Degradation (Max 30)

| Barrier Status | Score | Reason |
|----------------|-------|--------|
| failed / bypassed / not performed | 30 | "Critical control degradation" |
| ineffective | 20 | "Control identified as ineffective" |
| not verified | 15 | "Control verification failed" |
| unknown | 10 | "Control state is unknown or ambiguous" |
| effective | 0 | — |

### Component 3: LSR Relevance (Max 15)

| Condition | Score |
|-----------|-------|
| Life-Saving Rule matched | 15 |
| No LSR match | 0 |

### Component 4: Precursor Recurrence (Max 25)

| Pattern Priority | Score |
|-----------------|-------|
| CRITICAL | 25 |
| HIGH | 20 |
| MEDIUM | 10 |
| LOW | 5 |
| None | 0 |

### Priority Mapping

| Score Range | Priority |
|-------------|---------|
| 81-100 | CRITICAL |
| 56-80 | HIGH |
| 31-55 | MEDIUM |
| 1-30 | LOW |

### Example Calculation

```
Report: "Worker entered vessel without gas testing. H2S detected inside."

Consequence:     SIF Level = HIGH  → 30
Control:         Barrier = Gas Testing, Status = not performed → 30
LSR:             LSR-01 matched → 15
Precursor:       Pattern = CRITICAL (recurring) → 25

Total = 30 + 30 + 15 + 25 = 100 (capped at 100)
Priority = CRITICAL
```

---

## Part B: Aggregate Risk Score (Site/Activity/Barrier Level)

### Purpose
Rank sites, activities, and barriers by how risky they are overall.
Used in the Risk Dashboard to answer: "Which site is most dangerous?"

### Formula (0.0 to 1.0 scale)
```python
score = (
    0.30 * sif_density +           # What % of reports are SIF?
    0.20 * frequency +             # How often does this occur?
    0.20 * barrier_failure_rate +  # How often do controls fail?
    0.15 * recency +               # How recent is the last event?
    0.10 * trend_factor(trend) +   # Is frequency increasing?
    0.05 * spread                  # How many sites affected?
)
```

### Weights Explained

| Weight | Factor | Why |
|--------|--------|-----|
| 30% | SIF Density | Most predictive of future fatality |
| 20% | Frequency | More occurrences = higher risk |
| 20% | Barrier Failure Rate | Safety controls failing = direct risk |
| 15% | Recency | Recent events more dangerous than old ones |
| 10% | Trend | Increasing trend amplifies risk |
| 5% | Site Spread | Multi-site pattern is systemic risk |

### Recency Factor
```python
recency = math.exp(-0.03 * age_days)
# An event 30 days ago has 40% less weight than today
# An event 90 days ago has 7% weight
```

### Trend Factor
```python
trend_factors = {
    "INCREASING": 1.0,      # Full weight — worsening
    "NEW": 0.8,             # New pattern — treat seriously
    "STABLE": 0.5,          # Plateau — moderate concern
    "DECREASING": 0.2,      # Getting better
    "INSUFFICIENT_DATA": 0.35
}
```

### Priority Thresholds (Aggregate)
```
score >= 0.75 → CRITICAL
score >= 0.55 → HIGH
score >= 0.30 → MEDIUM
score < 0.30  → LOW
```

---

## Part C: Precursor Pattern Discovery

### What Is a Precursor Pattern?

A recurring combination of (category, activity, hazard, barrier, failure_type) that appears across multiple reports.

Example:
```
Pattern Key: "HIGH_ENERGY_BARRIER_FAILURE|confined space work|toxic atmosphere|gas testing|not verified"
  - Seen 12 times across 3 sites
  - 8 of those = SIF potential (66.7% density)
  - 5 in last 30 days (INCREASING trend)
  - Risk Score: 0.87 (CRITICAL)
```

### Discovery Algorithm (pattern_aggregator.py)

1. Join all PrecursorCandidates with Reports and ReportAnalyses
2. Group by (category, activity, hazard, barrier, failure_type)
3. For each group:
   - Count total occurrences
   - Count SIF-associated
   - Calculate SIF density
   - Count recent (last 30 days)
   - Count distinct sites
   - Count distinct departments
   - Detect trend (INCREASING/STABLE/DECREASING)
4. Filter: only patterns with >= 3 occurrences (configurable)
5. Calculate aggregate_risk_score for each
6. Assign priority (CRITICAL/HIGH/MEDIUM/LOW)
7. Save/update PrecursorPattern records

### Trend Detection

Compares last 30 days count vs 30-60 days ago count:
```python
if recent_count > older_count * 1.5:   → INCREASING
elif recent_count < older_count * 0.5: → DECREASING
elif older_count == 0:                 → NEW
else:                                  → STABLE
```

### Minimum Occurrences Filter
Default: 3 occurrences minimum (config: `precursor_min_occurrences`)
Prevents one-off events from appearing as patterns.

---

## Part D: Risk Dashboard Dimensions

### By Site
```
GET /api/v1/risk/sites?limit=10

Returns sites ranked by risk_score, with:
  - sif_count, sif_density, barrier_failure_count
  - active_precursor_patterns, recent_reports
  - risk_score, risk_level, explanation
```

### By Activity
```
GET /api/v1/risk/dimensions?field=activity

Ranks activities:
  #1 Confined Space Work  score=0.91 (CRITICAL)
  #2 Hot Work             score=0.72 (HIGH)
  #3 Work at Height       score=0.58 (HIGH)
```

### By Barrier (Control Weakness)
```
GET /api/v1/risk/barriers

Ranks barriers by failure rate:
  #1 Gas Testing         failure_rate=0.67, associated_sif=8
  #2 Energy Isolation    failure_rate=0.45, associated_sif=5
  #3 Fall Protection     failure_rate=0.32, associated_sif=3
```

---

## Part E: The Safety Causal Graph

This is the most visually impressive part for the SIH demo.

```
Nodes:
  [Activity] → [Hazard] → [Control 1] → [Failure] → [SIF Exposure] → [Precursor]
                         → [Control 2] → [Verified]
                         → [Control 3] → [Unknown]

Node types:
  - activity: Blue, hexagon
  - hazard: Orange, triangle
  - control: Green (verified) / Red (failed) / Yellow (unknown)
  - exposure: Purple, with severity badge
  - sif_precursor: Red diamond, with priority badge

Edge labels:
  activity → hazard: "exposes worker to"
  hazard → control: "controlled by"
  control → failure: "barrier_failure"
  failure → exposure: "creates exposure"
  exposure → precursor: "classified as"
```

This graph is stored as JSON in `report_analyses.safety_graph` and rendered as a ReactFlow interactive diagram in the frontend.
