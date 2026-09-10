# SIF SENTINEL

SIF SENTINEL is an advanced intelligence platform for Severe Incident and Fatality (SIF) precursor detection, risk scoring, and intervention recommendation.

## Architecture
The system consists of:
- **Frontend:** Reserved for a fresh F1 implementation; no frontend runtime is currently shipped.
- **Backend:** A FastAPI Modular Monolith (see \backend/\)
- **Intelligence Engines:** Deterministic NLP, Risk, and Intervention engines powered by trained models.

## Repository Structure
Please refer to [docs/architecture/REPOSITORY_STRUCTURE.md](docs/architecture/REPOSITORY_STRUCTURE.md) for the exact boundary definitions.
- \backend/\ - Application Runtime
- \frontend/\ - Reserved for a fresh F1 UI implementation (currently empty)
- \ml/\ - ML Research and Training
- \data/\ - Datasets
- \artifacts/\ - Generated models
- \docs/\ - Documentation
- \scripts/\ - Automation and utilities

## Quick Start (Dockerized for the Team)

The easiest way for any teammate to get the backend running locally without installing Python dependencies, PostgreSQL, or Redis, is via Docker. The application is pre-configured to connect to our live **Neon PostgreSQL database** and **Gemini API**.

```bash
cd backend
docker compose up -d --build
\*This will spin up the FastAPI server on http://localhost:8000 and a local Redis container for background processing.*
```

## Local Development (Manual)

### Frontend
To run the frontend development server:
```bash
cd frontend
pnpm install
pnpm dev
```
### Backend
If you want to run the FastAPI backend manually (without Docker):
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```
For more backend setup, testing, and execution details, see [backend/README.md](backend/README.md).

### Testing
To run the complete test suite:
```bash
cd backend
uv run pytest -q
```