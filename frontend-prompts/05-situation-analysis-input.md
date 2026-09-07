# Phase 5: Situation Analysis / Input Form

This phase builds the intake form for new incident/observation reports.

## Backend API Context
- `GET /api/v1/sites`: Returns a list of sites `{ id, name }`.
- `POST /api/v1/reports`: Expects `ReportCreate` schema:
  `{ report_type: string, report_text: string, site_id: UUID, location: string, department: string, activity: string, reported_at: datetime, source_type: string }`
  - `report_type` enum: "INCIDENT", "NEAR_MISS", "OBSERVATION", "INSPECTION"
  - `source_type` enum: "MANUAL", "SYSTEM", "MOBILE", "SENSOR"

## Instructions
1. Create page `app/(app)/reports/new/page.tsx`.
2. Build a multi-column form using Shadcn `Form` & `react-hook-form`.
3. Fetch sites on mount and populate a "Site" select dropdown.
4. Add fields for Location, Department, Activity (optional), and Date of Incident.
5. Add a large Textarea for `report_text` (max 100k chars, required).
6. Provide sensible defaults for `report_type` and `source_type` if not user-selectable, or expose them as dropdowns.
7. On submit, POST to `/api/v1/reports`.
8. Upon successful creation, retrieve the generated `id` and navigate to `/reports/[id]/analyze` to start the ML flow.

## Acceptance Criteria
- Form validates required fields before submission.
- Successfully creates a report in the database and routes the user to the analysis view.
