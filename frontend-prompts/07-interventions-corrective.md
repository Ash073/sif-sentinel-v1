# Phase 7: Intervention & Corrective Actions

Once a report is analyzed and shows risk, the system provides AI-driven corrective actions.

## Backend API Context
- `POST /api/v1/interventions/recommendations`: Send `{ incident_text, risk_score, risk_priority, life_saving_rule, sif_level }`
- Returns `InterventionAnalysisResponse`: `{ total_recommendations, baseline_risk_score, target_risk_score, recommendations: [ { id, title, description, priority, hierarchy_level, rationale } ] }`

## Instructions
1. On the same `reports/[id]/analyze/page.tsx` (or a dedicated tab), add a section for "AI Intervention Recommendations".
2. Fetch the recommendations using the data from Phase 6.
3. Display the recommendations in cards. Sort by `priority_score` or `priority`.
4. Include badges for `hierarchy_level` (e.g., Elimination, Engineering Control, Admin Control).
5. Add an "Accept Action" button on each recommendation card.
6. When clicked, present a modal to tweak the description and assignee, then POST to `/api/v1/corrective_actions` (schema: `{ report_id, description, status: "OPEN", assigned_to: UUID, due_date: date }`).

## Acceptance Criteria
- Renders intervention recommendations clearly.
- User can convert an AI recommendation into an actual system Corrective Action.
