# SIF Sentinel Frontend Prompts

This directory contains 10 sequential implementation-ready prompts designed to build the Next.js frontend for the SIF Sentinel platform, communicating exactly with the provided backend APIs and data models.

## Phase Order and Execution

To build the frontend successfully without hallucinating fields or APIs, provide these prompts to your AI coding assistant (or execute them manually) strictly in this order:

1. **`01-foundation-setup.md`**: Initializes Next.js, Shadcn UI, Tailwind, and the base API client setup.
2. **`02-layout-navigation.md`**: Builds the App Shell, Sidebar, Header, and responsive layout.
3. **`03-authentication.md`**: Connects to backend `/api/v1/auth` and `/api/v1/users/me` for JWT authentication and protected routing.
4. **`04-dashboard-landing.md`**: Builds the executive dashboard landing page fetching stats from `/api/v1/dashboard`.
5. **`05-situation-analysis-input.md`**: Creates the New Incident Report form leveraging the `ReportCreate` schema.
6. **`06-ml-prediction-view.md`**: Implements the AI analysis view to trigger `/api/v1/analysis/analyze` and display SIF Potential and Risk details.
7. **`07-interventions-corrective.md`**: Connects to `/api/v1/interventions/recommendations` to render evidence-backed interventions and prevention plans.
8. **`08-human-review-workflow.md`**: Builds the reviewer queue and decision UI using `/api/v1/reviews`.
9. **`09-precursors-history.md`**: Develops the historical reports table (`/api/v1/reports`) and active precursors list (`/api/v1/precursors`).
10. **`10-polish-demo-flow.md`**: Finalizes loading states, API error handling, and prepares the application for the Golden Demo Flow.

## Dependencies

The frontend relies heavily on the FastAPI Modular Monolith backend. The backend must be running (usually on `http://localhost:8000`) before developing.
All API calls are defined via `/api/v1/*`. Ensure `NEXT_PUBLIC_API_URL` is set accordingly in your environment setup.

## Golden Demo Flow
Once completed, the demo sequence should be:
1. Login as Admin/Reviewer.
2. View Dashboard (Stats & Trends).
3. Input a New Situation (Draft Report).
4. Run ML Analysis (View Risk & Evidence).
5. Generate Interventions & Counterfactuals.
6. Review & Approve the ML Decision.
7. Explore Precursors generated over time.
