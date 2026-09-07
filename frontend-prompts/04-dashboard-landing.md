# Phase 4: Dashboard and Landing Page

We need to build the Executive Dashboard that provides a high-level summary of safety metrics.

## Backend API Context
- `GET /api/v1/dashboard/summary`: Returns `{ total_reports, total_sif_reports, high_risk_reports, review_required, active_precursors, sif_rate, high_risk_rate }`
- `GET /api/v1/dashboard/timeseries`: Returns `items: [{ date, total_reports, sif_reports, high_sif_reports, sif_rate }]`
- `GET /api/v1/dashboard/barrier-failures`: Returns `items: [{ date, failed_count }]`

## Instructions
1. Create `app/(app)/page.tsx`.
2. Build top-level KPI summary cards (using Shadcn `Card`) for: Total Reports, SIF Rate (%), High Risk Rate (%), Active Precursors. 
   - Fetch data from `/api/v1/dashboard/summary`.
3. Add a charting library (like `recharts`).
4. Build a Time Series Chart component plotting `total_reports` vs `sif_reports` over time fetching from `/api/v1/dashboard/timeseries`.
5. Ensure graceful loading states using Shadcn `Skeleton` while fetching dashboard data.

## Acceptance Criteria
- Dashboard accurately reflects the JSON returned by the backend.
- Charts render cleanly and are responsive.
- Loading skeletons appear during network delay.
