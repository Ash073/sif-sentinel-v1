# Phase 9: Precursors and History

We need to display the aggregate history of reports and the active precursors identified by the system.

## Backend API Context
- `GET /api/v1/reports`: Returns `ReportPage` `{ items: [ReportRead], total, page }`.
- `GET /api/v1/precursors`: Returns `[PrecursorSummary]` `{ id, hazard, activity, barrier, occurrence_count, sif_density, trend, risk_score, priority }`.

## Instructions
1. Create `app/(app)/reports/page.tsx` (Reports History):
   - A paginated data table showing all reports.
   - Columns: ID, Date, Site, Type, Status.
   - Row click navigates to report details `/reports/[id]`.
2. Create `app/(app)/precursors/page.tsx` (Precursors Dashboard):
   - A grid of cards or a table displaying active precursors.
   - Highlight items with `trend="INCREASING"` and `priority="HIGH"` or `priority="CRITICAL"` with red indicators.
   - Show the `sif_density` and `occurrence_count`.
   - (Optional) Render a simple node-edge graph if you query `GET /api/v1/precursors/graph`.

## Acceptance Criteria
- Both historical reports and precursors are fetched and displayed cleanly.
- Precursors highlight high-priority trends effectively.
