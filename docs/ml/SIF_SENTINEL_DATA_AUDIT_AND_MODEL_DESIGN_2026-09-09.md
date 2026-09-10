# SIF SENTINEL — ML Data Audit and Model Design

**Audit date:** 2026-09-09  
**Decision:** **DATA/LABELING REQUIRED BEFORE TRAINING**

## Executive decision

The two source datasets are useful safety-incident corpora, but neither contains a true `SIF potential` or `SIF level` label. The 105,996-row OSHA file is a selected severe-injury-report corpus: every row has at least one positive Hospitalized, Amputation, or Loss-of-Eye count. It therefore has no negative class for “any recorded severe outcome,” no exposure denominator, and no near-miss/control population. The 4,847-row HSE file has a valid realized-outcome label (`Fatal`/`Nonfatal`), but realized fatality is not the same construct as SIF potential.

Training a production SIF classifier from proxy labels would teach the model to reproduce realized injury outcomes and explicit outcome wording, not to estimate credible serious-injury/fatality potential. This is scientifically invalid for the stated product.

The existing data can support carefully scoped incident-coding baselines (Event, Nature of Injury, Part of Body, Source, and realized fatality), safety-domain retrieval, rule development, and creation of an annotation queue. It does not yet support production SIF classification, SIF levels, LSR mapping, precursor prediction, risk prediction, or supervised entity extraction for Activity/Hazard/Barrier/Barrier Failure/Evidence.

No model was trained, no model artifact was exported, no raw CSV was changed, and no backend code was modified.

## 1. Source inventory and provenance

### Source selection

| Dataset | Audited path | SHA-256 | Rows × columns | Encoding |
|---|---|---|---:|---|
| OSHA HSE 2015–2017 | `Dump/csv files/OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL.csv` | `e09a2b4106e024a6dd909eba76f03fa444005e753792ce3bc659d53d617d7a23` | 4,847 × 29 | UTF-8/ASCII-safe |
| OSHA Severe Injury Reports 2015–2025 | `data/raw/January2015toNovember2025.csv` | `89b7d01d5dfc5dcdb399bd4699ba3e3d5c73dc5149122c420140f3c5b1eb5966` | 105,996 × 28 | UTF-8/ASCII-safe |

`Dump/csv files/January2015toNovember2025.csv` is byte-for-byte identical to the audited large file and must not be treated as a second dataset. `data/raw/safety_reports.csv` was excluded: it is a separate 12-column pre-labeled/demo-style file with SIF/entity fields and is not the described 4.8k HSE source. Repository documentation also says current repository datasets may be synthetic or down-sampled, so provenance/licensing and acquisition lineage must be recorded before any production claim.

### HSE columns, inferred types, missingness, and cardinality

| Column | pandas type | Missing | Unique non-null |
|---|---|---:|---:|
| summary_nr | int64 | 0 | 4,844 |
| Event Date | object/date-like | 0 | 671 |
| Abstract Text | object | 0 | 4,829 |
| Event Description | object | 0 | 4,320 |
| Event Keywords | object | 0 | 4,427 |
| con_end | object | 0 | 18 |
| Construction End Use | object | 0 | 18 |
| build_stor | int64 | 0 | 25 |
| Building Stories | object | 0 | 25 |
| proj_cost | object | 0 | 8 |
| Project Cost | object | 0 | 8 |
| proj_type | object | 0 | 6 |
| Project Type | object | 0 | 6 |
| Degree of Injury | object | 0 | 2 |
| nature_of_inj | int64 | 0 | 20 |
| Nature of Injury | object | 2 | 19 |
| part_of_body | int64 | 0 | 32 |
| Part of Body | object | 2 | 29 |
| event_type | int64 | 0 | 15 |
| Event type | object | 2 | 14 |
| evn_factor | int64 | 0 | 18 |
| Environmental Factor | object | 7 | 17 |
| hum_factor | int64 | 0 | 19 |
| Human Factor | object | 7 | 18 |
| task_assigned | int64 | 0 | 2 |
| Task Assigned | object | 0 | 2 |
| hazsub | object | 0 | 31 |
| fat_cause | int64 | 0 | 30 |
| fall_ht | int64 | 0 | 1 |

Date coverage is 2015-07-01 through 2017-08-10: 803 records in 2015, 1,735 in 2016, and 2,309 in 2017. All dates parsed.

### OSHA 2015–2025 columns, inferred types, missingness, and cardinality

| Column | pandas type | Missing | Unique non-null |
|---|---|---:|---:|
| ID | int64 | 0 | 105,991 |
| UPA | int64 | 0 | 105,996 |
| EventDate | object/date-like | 0 | 3,985 |
| Employer | object | 0 | 71,454 |
| Address1 | object | 18 | 89,636 |
| Address2 | object | 96,693 (91.22%) | 8,355 |
| City | object | 17 | 8,221 |
| State | object | 0 | 56 |
| Zip | float64 under default inference | 24 | 14,398 |
| Latitude | float64 | 72 | 2,471 |
| Longitude | float64 | 72 | 4,831 |
| Primary NAICS | object | 2 | 1,287 |
| Hospitalized | int64 | 0 | 7 |
| Amputation | float64 due to 7 missing | 7 | 3 |
| Loss of Eye | float64 due to 5 missing | 5 | 2 |
| Inspection | object | 70,526 (66.54%) | 35,311 |
| Final Narrative | object | 0 | 105,930 |
| Nature | int64 | 0 | 251 |
| NatureTitle | object | 1 | 349 |
| Part of Body | int64 | 0 | 205 |
| Part of Body Title | object | 0 | 275 |
| Event | int64 | 0 | 476 |
| EventTitle | object | 1 | 649 |
| Source | int64 | 0 | 1,489 |
| SourceTitle | object | 1 | 1,957 |
| Secondary Source | float64 | 55,381 (52.25%) | 1,303 |
| Secondary Source Title | object | 55,382 (52.25%) | 1,662 |
| FederalState | int64 | 0 | 2 |

Date coverage is 2015-01-01 through 2025-11-30. Annual counts are 9,823; 10,084; 10,445; 11,156; 11,071; 8,915; 8,703; 9,110; 8,943; 9,034; and 8,712 respectively. All dates parsed.

The machine-readable audit contains every column profile and full categorical frequency table in `docs/ml/dataset_audit_metrics.json`.

## 2. Data-quality findings

### HSE dataset

- There are no exact full-row duplicates, but only 4,844 unique `summary_nr` values. `220957740` occurs twice and `220873897` three times. Inspection shows these are continuation fragments of two incidents, not ordinary duplicate rows. An incident-level reconstruction rule is required before training or splitting.
- The nominal “missing” count hides whitespace sentinels: `Construction End Use` has 3,820 blank/space values (78.81%), `Building Stories` 4,148 (85.58%), `Project Cost` 4,261 (87.91%), and `Project Type` 3,767 (77.72%). Their code columns use `0` for the same absent/unknown state. These are missing values semantically and must be normalized only after a declared rule.
- `fall_ht` is constant zero and contains no learning signal. It cannot be interpreted as observed zero-height falls without source documentation.
- `proj_cost` mixes `0` and letter codes A–G. This is a categorical code, not a numeric cost. `hazsub` mixes numeric-looking and alphanumeric codes. Automatic numeric coercion would corrupt both.
- `build_stor` ranges from 0 to 139. Values 139, 76, 73, 46, and 40 are possible but high enough to require source verification; zero frequently means unavailable rather than a real zero-story building.
- The paired code/title fields are mostly one-to-one, but `Part of Body` has one title mapping to multiple codes. Two code/title rows are incomplete for Nature, Part of Body, and Event; seven are incomplete for Environmental and Human Factor.
- `Event Description` is almost certainly display-truncated: maximum length is exactly 60 characters and the 95th and 99th percentiles are also 60.
- Degree of Injury is 2,964 Fatal (61.15%) and 1,883 Nonfatal (38.85%). This is a selected incident mix, not a population fatality rate.

### OSHA 2015–2025 dataset

- There are no exact full-row duplicates. `UPA` is unique and is the appropriate source identifier. `ID` is not unique: five IDs (`2015010015`, `...16`, `...18`, `...20`, `...21`) are reused for distinct events, so it must not be used as a primary key or split-group key.
- Hospitalized, Amputation, and Loss of Eye are non-negative integer **counts**, not binary flags. Hospitalized ranges 0–6 and Amputation 0–2. Treating values above one as invalid would be wrong.
- Every one of the 105,996 rows has at least one positive value across those three outcome counts. “Any severe outcome” is therefore 100% positive and unusable as a supervised target.
- Amputation is missing in 7 rows and Loss of Eye in 5. These missing values are not proven negatives.
- Default type inference converts ZIP codes to floats because of missing values and can erase leading zeros. ZIP must be read as a string. The raw values otherwise look like five-digit codes.
- One unmistakable coordinate error is `State=TEXAS`, `Latitude=-34.92`, `Longitude=138.6`. All coordinates pass global latitude/longitude bounds, showing why state-aware plausibility checks are still required.
- Taxonomy code/title relationships are not stable one-to-one: 84 Nature codes, 65 Part-of-Body codes, 153 Event codes, 440 Source codes, and 348 Secondary-Source codes map to multiple titles. A few titles also map to multiple codes. This may reflect taxonomy revisions, punctuation variants, or source errors; versioned crosswalks are required before consolidating labels.
- Three narratives are under 20 characters and eight have fewer than five words. These are low-information records.
- No non-ASCII or common mojibake markers were detected in either corpus. This does not establish language as English, but vocabulary inspection shows formulaic English OSHA incident prose.

### Narrative duplication

| Field | Raw duplicate rows/groups | Normalized duplicate rows/groups | Conservative near-duplicate candidates |
|---|---:|---:|---:|
| HSE Abstract Text | 36 / 18 | 40 / 20 | 11 pairs, 21 rows |
| HSE Event Description | 704 / 177 | 754 / 192 | 8 pairs, 13 rows |
| HSE Event Keywords | 573 / 153 | 573 / 153 | 13 pairs, 22 rows |
| HSE combined text | 2 / 1 | 2 / 1 | 12 pairs, 21 rows |
| OSHA Final Narrative | 106 / 40 | 117 / 45 | 19 pairs, 38 rows |

Near duplicates were conservatively screened with 64-bit unigram+bigram SimHash, Hamming distance ≤3, excluding normalized exact matches. These are candidates for manual adjudication, not asserted duplicates. There are no exact normalized matches between HSE Abstract Text and OSHA Final Narrative. All exact/near-duplicate groups must remain within a single train/validation/test partition.

## 3. Narrative/text analysis

| Field | Mean chars (median; p95; max) | Mean words (median; p95; max) | Vocabulary |
|---|---|---|---:|
| HSE Abstract Text | 413.4 (339; 951; 3,292) | 63.5 (52; 151; 514) | 9,846 |
| HSE Event Description | 49.9 (51; 60; 60) | 8.0 (8; 10; 13) | 2,633 |
| HSE Event Keywords | 50.1 (46; 100; 200) | 7.1 (7; 14; 28) | 913 |
| OSHA Final Narrative | 199.3 (182; 371; 2,134) | 32.3 (29; 61; 365) | 20,647 |

Vocabulary is case-folded and tokenized with a simple audit tokenizer; it is not a production tokenizer. Common terminology includes employee/worker, fall/fell, struck, caught, ladder, roof, forklift, machine, truck, fracture, amputation, hospitalization, lockout/tagout, guarding, protection, and electrocution. The text is short, templated, outcome-heavy, and suitable for TF-IDF baselines, domain retrieval, taxonomy coding, rule mining, and annotation pre-labeling.

Useful but unlabelled signals include:

- **Activity:** operating, cleaning, cutting, walking, working, driving, lifting, climbing, maintenance.
- **Hazard/energy:** fall from elevation, moving vehicle, caught-between/pinch point, electrical contact, falling object, chemical/fire/pressure.
- **Barrier/control:** lockout/tagout, guarding, fall protection, PPE, securing/warning and engineering controls—especially in HSE keywords and Human Factor.
- **Failure:** removed/inoperable, insufficient/lack, malfunction, unguarded, bypass-like descriptions.
- **Evidence:** the source sentence/span expressing the above.
- **Severity/outcome:** killed/died, hospitalized/admitted, amputated/severed, fractures, burns, loss of eye.

These signals are not ground-truth entity spans. `Event Keywords` and structured taxonomy fields are document-level descriptors, and Human/Environmental Factor categories are coarse, outcome-biased proxies.

## 4. What each dataset can legitimately teach

Legend: A = direct label, B = weak/proxy label, C = useful input but no label, D = no usable evidence.

| Intelligence component | Evidence in the two datasets | Verdict |
|---|---|---|
| SIF potential | B: fatality and severe outcomes are realized-outcome proxies; C: circumstances/hazards in narratives. No true potential label. | **PARTIALLY SUPPORTED** for annotation/pretraining; not supervised training |
| SIF level | B: Fatal/Nonfatal and injury categories; no approved SIF-level definition or label. | **PARTIALLY SUPPORTED** for annotation only |
| Activity extraction | B: Event/Event type and keywords are coarse document labels; C: activity wording in narratives; no spans. | **PARTIALLY SUPPORTED** |
| Hazard extraction | B: Event, Source, Environmental Factor, keywords; C: narrative; no spans/canonical hazard ontology. | **PARTIALLY SUPPORTED** |
| Barrier extraction | B: selected Human Factor/keywords categories; C: narrative mentions; no positive/negative span labels. | **PARTIALLY SUPPORTED** |
| Barrier failure detection | B: Human Factor labels such as removed/inoperable, malfunction, insufficient controls; incomplete taxonomy and no spans/status ground truth. | **PARTIALLY SUPPORTED** |
| Evidence extraction | C: narratives are source evidence; no annotated supporting spans or claim-to-span links. | **PARTIALLY SUPPORTED** for rules/annotation |
| LSR classification/mapping | D for labels; B/C only through inferred hazards/activities. No LSR ground truth. | **NOT SUPPORTED** |
| Precursor detection | D for precursor labels and pre-incident chronology; selected realized incidents only. | **NOT SUPPORTED** |
| Risk prediction | D for exposure denominator/future outcome/control population; severe-case selection prevents absolute-risk learning. | **NOT SUPPORTED** |
| Semantic similarity | C is sufficient for a safety-domain retrieval corpus; no relevance labels for evaluation. | **SUPPORTED** for unsupervised indexing, **PARTIALLY SUPPORTED** for validated ranking |

## 5. Valid target/label analysis

### Existing direct targets

#### HSE realized fatality

- **Definition:** `Degree of Injury == "Fatal"` versus `"Nonfatal"`.
- **Distribution:** 2,964 positive (61.15%); 1,883 negative (38.85%). Moderate imbalance.
- **Rationale:** valid for realized fatality coding/audit, not SIF potential.
- **Noise:** fragment rows, post-event coding errors, selected sampling, and possible title/code inconsistencies.
- **Leakage:** 2,648 of 2,964 fatal rows (89.34%) explicitly contain fatality terms; 36 nonfatal rows also do. `fat_cause`, Nature/Part-of-Body, outcome keywords, and text such as “killed”/“died” are post-outcome information.
- **SIF appropriateness:** **not appropriate as a SIF label**. It may benchmark outcome extraction only.

#### OSHA hospitalization occurrence

- **Definition:** `Hospitalized > 0`; preserve the original count separately.
- **Distribution:** 85,841 positive (80.99%), 20,155 zero (19.01%).
- **Noise:** administrative thresholds/reporting rules, seven-value count range, and narrative/title inconsistencies.
- **Leakage:** narrative hospitalization terms occur in 26,729 positives and 148 zeros. Outcome fields, treatment statements, Inspection, injury Nature, and Part of Body are post-incident.
- **SIF appropriateness:** outcome coding only; not a SIF or prospective-risk label.

#### OSHA amputation occurrence

- **Definition:** `Amputation > 0`; exclude 7 missing rows from binary-target training unless resolved.
- **Distribution:** 27,961 positive (26.38%), 78,028 zero (73.62%), 7 missing. Moderate imbalance.
- **Leakage:** 24,131 positives explicitly contain amputation/severing terms; 438 zeros also contain them, suggesting wording/label noise or broader use of “severed.”
- **SIF appropriateness:** useful for coding QA or text-to-code assistance, not SIF.

#### OSHA loss-of-eye occurrence

- **Definition:** `Loss of Eye > 0`; exclude 5 missing rows unless resolved.
- **Distribution:** 35 positive (0.033%), 105,956 zero, 5 missing—approximately 3,027:1 negative-to-positive.
- **Noise/leakage:** only 35 positives; 15 contain direct outcome wording. This is too rare for an ordinary standalone classifier or random split.
- **SIF appropriateness:** not a viable SIF target and not independently trainable without more positives/cost-sensitive evaluation.

#### OSHA injury taxonomies

- **Definition:** document-level Nature, Part of Body, Event, Source, and Secondary Source codes/titles.
- **Distribution:** 251/205/476/1,489/1,303 code values respectively, with long tails. HSE offers 19 Nature, 29 Part-of-Body, 14 Event, 17 Environmental-Factor, and 18 Human-Factor titles, led by broad “Other” categories.
- **Rationale:** valid coding-assistance targets if taxonomy versions are reconciled and rare classes are handled hierarchically.
- **Noise:** unstable code-title mappings, missing titles, “Other” dominance, taxonomy drift, and possible multi-event narratives represented by one code.
- **Leakage:** paired title/code columns leak one another. Other post-incident taxonomies may trivially imply the target. Use narrative-only input for a text-to-code task.
- **SIF appropriateness:** useful auxiliary/coding models only; not a SIF target.

### Invalid proposed targets

- `Hospitalized OR Amputation OR Loss of Eye > 0` is constant: 105,996 positive, 0 negative.
- Fatal + hospitalization + amputation + loss of eye must not be renamed “SIF.” It is a realized-outcome composite with incompatible source selection and definitions.
- Probability buckets must not be renamed SIF levels. SIF levels require independently defined, expertly labelled ordinal classes.
- Event/Nature/Source/Human/Environmental Factor are not barrier, LSR, precursor, or risk labels.

**True SIF labels are unavailable.**

## 6. Leakage rules

### Safe versus leakage-prone features by legitimate target

| Target | Safe features for a coding model | Leakage-prone/prohibited features |
|---|---|---|
| HSE realized fatality coding | Circumstance-only narrative after masking outcome/treatment spans; pre-event construction/task metadata | Degree of Injury; `fat_cause`; fatality/outcome phrases; Nature/Part of Body; post-event treatment |
| OSHA Hospitalized | Narrative only if the goal is explicitly *extract/copy the report outcome*; otherwise circumstance-only masked text | Hospitalized; hospitalization/admission/treatment phrases; Nature/Part of Body; Inspection; other outcome fields |
| OSHA Amputation | Narrative only for outcome coding; circumstances-only masked text for a nontrivial benchmark | Amputation; amputated/severed/lost-body-part phrases; Nature; Part of Body; other outcomes |
| OSHA Loss of Eye | Not recommended as standalone model | Loss of Eye; direct loss/enucleation phrases; Nature/Part of Body; other outcomes |
| Nature/Event/Part/Source coding | Final Narrative; optionally pre-event NAICS | The target code’s paired title; sibling taxonomy fields when they deterministically encode the same event; post-coded derivatives |
| Future SIF potential/level | Expert-approved circumstance text: activity, energy/hazard, height/quantity/context, control/barrier presence/status; pre-analysis metadata known at inference | All realized outcomes, Degree/Nature/Part of Body, treatment, fatality terms, Inspection results, `fat_cause`, human adjudication fields, derived risk/SIF outputs |

The “safe” designation is task-conditional. Outcome words are legitimate evidence for **outcome extraction**, but direct leakage for **prospective potential/risk prediction**. A model card must state which problem is being solved.

Employer, address, coordinates, IDs, and exact dates should normally be excluded from text models. They encourage memorization, privacy exposure, and geographic/employer shortcuts. NAICS and coarse region may be evaluated only with subgroup checks and a clear inference-time justification.

## 7. Minimum model candidate set

| Candidate | Input → target/output | Dataset/type | Baselines and metrics | Risks / deployment decision |
|---|---|---|---|---|
| Injury taxonomy coding assistant | Final Narrative → Event/Nature/Part-of-Body/Source code probabilities | OSHA; hierarchical multiclass or multilabel | Word/char TF-IDF + logistic regression or linear SVM; macro/micro F1, per-class recall, top-k accuracy, confusion by year | Taxonomy drift/long tail; **human-in-loop pilot only after crosswalk and temporal test** |
| Realized fatality coding benchmark | Masked HSE circumstance text → Fatal/Nonfatal | HSE; binary classification | TF-IDF logistic regression; PR-AUC, ROC-AUC, balanced accuracy, F2, Brier/ECE | Outcome leakage and selection bias; **research/QA only, never branded SIF** |
| Outcome coding QA | Final Narrative → Hospitalized/Amputation occurrence | OSHA; separate binary or multilabel | Rules first; TF-IDF logistic regression only if rules leave value; PR-AUC, class recall/precision, calibration | Mostly copies explicit outcome; **deploy only as discrepancy flag with review** |
| Safety semantic retrieval | Narrative → embedding; return similar incident IDs/evidence | Both; embedding/retrieval, no supervised target initially | BM25/TF-IDF cosine first; then frozen sentence embedding; Recall@k/MRR/nDCG on a manually judged query set | False similarity and taxonomy drift; **assistive retrieval can pilot with provenance shown** |
| SIF potential classifier | Circumstance-only text + allowed structured context → calibrated SIF probability | New expert-labelled production-representative set; binary | TF-IDF word+char logistic regression first; gradient boosting for structured-only; later calibrated ensemble | Missing labels/domain shift/high consequence; **not justified now** |
| Entity/evidence extraction | Narrative → ACTIVITY/HAZARD/BARRIER/BARRIER_FAILURE/EVIDENCE spans and normalized concepts | New span annotations; sequence/span extraction | Gazetteer/rules baseline, then CRF or compact transformer after label sufficiency; strict and partial span P/R/F1, concept accuracy | Ambiguous spans/ontology disagreement; **not justified now** |

Do not train a transformer first. The short, formulaic narratives make linear word/character TF-IDF baselines strong, fast, explainable, and easy to audit. A compact transformer is warranted only if a frozen temporal test shows a material, stable gain, labels are sufficient, calibration remains acceptable, and latency/operations budgets are met.

## 8. Exact SIF classifier design (after data acquisition and annotation)

### Target definition

`sif_potential = 1` only when two trained safety reviewers, applying the organization’s written SIF decision standard, conclude that the described event/condition had a credible pathway to fatal or life-altering injury under plausible, minimally different circumstances. The label is independent of the injury that actually occurred. `sif_potential = 0` requires explicit expert adjudication; absence of fatality/hospitalization is not a negative label.

Do not create `sif_level` until the organization defines mutually exclusive ordinal levels with decision examples. Levels must be annotated directly, not derived from model probability.

### Dataset construction logic

1. Establish a versioned SIF rubric, inclusion/exclusion rules, ambiguity state, and adjudication guide.
2. Add production-representative non-injury observations, near misses, minor injuries, and routine control-verification reports. The OSHA severe-only corpus cannot represent production prevalence.
3. Build a source registry with immutable SHA-256, source/license, extraction date, taxonomy version, and stable `record_key`. Use HSE `summary_nr` after continuation reconstruction and OSHA `UPA`; never OSHA `ID` alone.
4. Preserve raw text. Create a separate annotation view with spans for `ACTIVITY`, `HAZARD`, `ENERGY`, `BARRIER`, `BARRIER_STATUS`, realized `OUTCOME`, treatment, and the expert SIF rationale/evidence.
5. Dual-annotate `sif_potential`, optional approved `sif_level`, confidence, and rationale. Adjudicate disagreements. Track annotator IDs and rubric version; measure Cohen’s kappa/weighted kappa and per-class agreement.
6. Construct `analysis_text` using the same deterministic preprocessing intended for inference. For a potential model, mask annotated realized-outcome/treatment spans consistently in both training and production inference. Retain the unmasked text only for evidence display and outcome extraction.
7. Exclude direct outcome/taxonomy columns listed under leakage. Allowed structured candidates are only values genuinely available at report-analysis time and approved through ablation/fairness tests.
8. Canonicalize whitespace sentinels and continuation fragments under logged transformation rules. Do not discard exact/near duplicates silently; assign a duplicate-group ID.
9. Split by time and duplicate group: initial proposal is train 2015–2022, validation 2023, final test 2024–2025. Keep all fragments/duplicates and, where feasible, recurring employers/templates in one partition. Freeze the test set before tuning.
10. Fit word+character TF-IDF logistic regression, compare structured-only and text-only ablations, calibrate on validation data, and conduct temporal, source, event-family, geography, text-length, and ambiguity subgroup error analysis.
11. Select threshold on the validation set for a documented operational objective: maximize SIF recall subject to a minimum precision/reviewer-capacity constraint. Report the full precision–recall curve and expected review volume; do not default to 0.5.
12. Require final locked-test performance, calibration, expert error review, shadow deployment, drift monitoring, rollback, and human-review policy before activation.

### Minimum annotation volume

- **SIF potential:** 2,500–3,500 dual-reviewed, production-representative reports for a first classical baseline, sampled across years, sources, event families, and severities. Target at least 600 adjudicated positives and 600 hard negatives. If prevalence is low, continue targeted sampling rather than changing the label definition.
- **SIF level:** 3,500–5,000 if an ordinal level model is required, with at least 300–500 adjudicated examples per operational level. Merge/drop levels that cannot reach reliable agreement or support.
- Maintain a separately sampled prevalence-estimation/test cohort; an oversampled training set cannot estimate production probability without correction and calibration.

Primary metrics: PR-AUC, SIF recall/sensitivity, precision/PPV, F2, specificity, false-negative rate, Brier score, expected calibration error, calibration slope/intercept, decision-curve/review-load analysis, and 95% bootstrap confidence intervals. ROC-AUC alone is insufficient.

## 9. Entity extraction and additional annotation

The current CSVs do not contain span-level supervision for `ACTIVITY`, `HAZARD`, `BARRIER`, `BARRIER_FAILURE`, or `EVIDENCE`. Do not convert Event Keywords or Human Factor into fabricated spans.

Create an annotation schema with:

- `ACTIVITY`: task/action being performed.
- `HAZARD`: hazardous condition or energy source/exposure.
- `BARRIER`: preventive/mitigating control, including explicit absence only when text supports it.
- `BARRIER_FAILURE`: span describing failed, missing, bypassed, inadequate, or unverified control; link it to its `BARRIER`.
- `EVIDENCE`: minimal source span supporting each normalized assertion, linked to entity/claim.
- Attributes: normalized ontology ID, negation, hypothetical/actual, present/absent, barrier status, certainty, temporality, and annotator confidence.

Recommended first set: 1,200–1,500 narratives, dual-annotated with adjudication. Stratify/oversample HSE Human Factor categories and keywords likely to contain controls so the set includes at least roughly 500 BARRIER mentions and 500 BARRIER_FAILURE mentions, plus at least 800 instances each of ACTIVITY and HAZARD. EVIDENCE is annotated as the supporting span for every retained claim, not as arbitrary sentences.

Start with dictionaries/rules plus weak supervision to pre-highlight candidates; reviewers must accept/correct them. LLM-assisted pre-annotation may reduce effort but cannot be ground truth and must be blinded during quality sampling. Train a CRF or compact token/span classifier only after inter-annotator agreement and label coverage are acceptable. Use pretrained safety/general encoders for initialization rather than training language models from scratch.

For LSR mapping, add a document-level multi-label field `LSR_ID[]` with evidence spans and “no applicable rule/insufficient evidence.” Label 2,000–3,000 reports with at least 100–200 positive examples per rule where feasible. Rare rules should remain deterministic/manual until enough labels exist.

For precursor/risk prediction, acquire longitudinal site reports with event time, exposure/opportunity counts, near misses, observations, control checks, corrective actions, and subsequent outcomes. A useful pilot needs several thousand events across multiple sites/time periods and enough positive future windows for temporal evaluation; the current incident-only CSVs cannot supply this by annotation alone.

## 10. Eventual training workflow

```text
immutable raw data + provenance
→ schema/encoding validation
→ incident reconstruction and duplicate-group assignment
→ taxonomy versioning/crosswalk
→ annotation and adjudication
→ label construction under a versioned rubric
→ leakage audit and circumstance/outcome separation
→ grouped temporal train/validation/test split
→ preprocessing fitted on train only
→ majority/rule/BM25 and TF-IDF classical baselines
→ calibration and threshold selection on validation only
→ stronger model only if justified by locked improvements
→ limited hyperparameter tuning
→ final frozen temporal test
→ slice/error/uncertainty analysis with expert review
→ artifact and model-card generation
→ shadow inference and drift monitoring
→ governed production release
```

Time-based splitting is preferred because the large corpus spans eleven years and taxonomy/reporting language changes. A random split would overstate generalization through template, employer, and temporal leakage. Duplicate grouping and source grouping take precedence over the nominal date boundary when necessary.

## 11. Production artifact plan (do not create yet)

For each approved classical model version:

- `model.joblib`: fitted estimator only.
- `preprocessing.joblib`: exact fitted vectorizer/encoder/imputer and feature order; separate so transformations are explicit and testable.
- `metadata.json`: model/task/version, target and label-rubric version, source hashes, code commit, training window, split manifest hash, feature allow/deny lists, class mapping, library versions, metrics with confidence intervals, calibration method, intended use, limitations, owner, and creation time.
- `threshold.json`: selected operating threshold(s), selection dataset, objective/constraints, achieved precision/recall/review load, and fallback/review thresholds.
- Also retain a non-production `split_manifest` and evaluation report; do not place raw text or PII inside model artifacts.

If a transformer is later justified, save a versioned model directory containing weights (prefer a safe tensor format), tokenizer files, config, label map, preprocessing/masking version, `metadata.json`, and `threshold.json`. Pin runtime/library versions and verify offline loading. Do not pickle arbitrary custom training classes into a production artifact when a standard safe serialization is available.

## 12. Frozen-backend integration plan

The current integration seam is already conceptually appropriate, but its concrete return contracts must be reconciled in a later backend change: `MLAdapterProtocol.predict` is annotated as returning `dict` while `AnalysisPipeline` consumes prediction attributes; `NLPAdapterProtocol.extract_entities` has the same dict-versus-object mismatch.

Planned path after model approval:

```text
versioned model artifacts
→ SIF/NER provider adapter implementing a tested typed contract
→ AnalysisPipeline dependency injection
→ AnalysisService orchestration and human-review gating
→ ReportAnalysis authoritative analysis fields/evidence/status
→ ModelPrediction immutable raw model label/probability/version/metadata
→ /analyze and persisted report-analysis API responses
→ frontend analysis types, evidence display, uncertainty, and reviewer workflow
```

Integration requirements:

1. Add a new versioned adapter; do not replace the existing provider in place.
2. Validate artifact hashes, schema, preprocessing version, class order, threshold, and runtime compatibility at load time; fail closed to review/unavailable, not a fabricated probability.
3. Return calibrated probability, threshold decision, model/rubric version, input-mask version, evidence/contributions, warnings, and review-required reason.
4. Persist the exact model outputs in `ModelPrediction`; persist the approved interpreted fields and evidence in `ReportAnalysis`.
5. Keep deterministic LSR/risk/precursor logic separately versioned. A SIF probability must not silently become a risk score or SIF level.
6. Expose provenance and uncertainty through the existing API contract and frontend; require human review for ambiguous/out-of-distribution/low-evidence cases.
7. Shadow-test against frozen historical reports, then canary behind configuration with audit logs, latency/failure monitoring, calibration/drift checks, and rollback.

No backend edits should occur until the label rubric, data contract, model contract, and acceptance thresholds are approved.

## 13. What should not be built now

- No production “SIF classifier” trained from Fatal/Hospitalized/Amputation/Loss-of-Eye proxies.
- No SIF levels derived from probability bands.
- No absolute or prospective risk model from severe incidents without non-event/exposure denominators.
- No precursor predictor from post-incident narratives alone.
- No supervised NER built from fabricated keyword-to-span labels.
- No LSR classifier inferred from Event/Hazard categories without LSR annotation.
- No standalone loss-of-eye classifier with 35 positives.
- No transformer/deep model before reproducible linear/rule/retrieval baselines and a locked temporal evaluation.
- No random row split, no duplicate leakage, and no title/code sibling features leaking the target.
- No model artifact export or backend activation at this phase.

## Final recommendation

Proceed immediately with provenance confirmation, taxonomy crosswalk/versioning, incident-fragment reconstruction, a written SIF rubric, and a dual-review annotation pilot. In parallel, it is reasonable to design—but not yet productionize—a narrative-to-injury-code TF-IDF baseline and a BM25/TF-IDF semantic retrieval baseline after the data rules are frozen.

**Final decision: DATA/LABELING REQUIRED BEFORE TRAINING.**

Specifically required before SIF/NLP training: 2,500–3,500 dual-reviewed reports with `sif_potential`, rationale/evidence, outcome/treatment spans, and representative non-severe/near-miss controls; 3,500–5,000 if direct SIF levels are required; and 1,200–1,500 span-annotated narratives for ACTIVITY, HAZARD, BARRIER, BARRIER_FAILURE, and linked EVIDENCE. LSR requires its own 2,000–3,000 multi-label/evidence annotation set. Precursor/risk work additionally requires longitudinal exposure and future-outcome data.
