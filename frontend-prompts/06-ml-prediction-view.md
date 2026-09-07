# Phase 6: ML Prediction & Risk Result View

After creating a report, we trigger the AI Intelligence engine to analyze it for Severe Incident and Fatality (SIF) potential and risk.

## Backend API Context
- `POST /api/v1/analysis/analyze`: Body: `{ text: string }` or trigger via report context. (Assume we use the report text or `/api/v1/reports/{id}/analyze`). Note: the backend uses `POST /api/v1/reports/{id}/analyze` which triggers `AnalysisService`.
- Returns `AnalysisResponse`: `{ sif_potential: bool, sif_level: str, model_probability: float, barrier_status: str, evidence_sentences: [str], risk: { score: int, priority: str, components: [] }, review_required: bool }`

## Instructions
1. Create `app/(app)/reports/[id]/analyze/page.tsx`.
2. The page should have a "Run ML Analysis" CTA if not analyzed yet. 
3. When triggered, show a complex loading state ("Analyzing NLP", "Calculating Risk", "Evaluating Barriers") to simulate deep processing.
4. On success, display the `AnalysisResponse` clearly:
   - SIF Potential (Red/Green badge).
   - Risk Score dial or bar (e.g., out of 100), showing the `priority` (LOW, MEDIUM, HIGH, CRITICAL).
   - A list of `evidence_sentences` highlighting exactly why the model made this prediction.
   - List the Risk components (`risk.components`) with their individual scores and reasons.

## Acceptance Criteria
- Triggers backend analysis successfully.
- Distinct visual difference for high SIF vs low SIF scenarios.
- Evidence sentences are clearly presented to the user.
