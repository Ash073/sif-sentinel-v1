# SIF SENTINEL — Complete Knowledge Base
### SIH 2026 | Problem Statement SIH26165 | Oil India Limited

## Knowledge Base Index

| # | Document | Purpose |
|---|----------|---------|
| 01 | [01_PROJECT_OVERVIEW.md](./01_PROJECT_OVERVIEW.md) | What is the project, problem, and solution |
| 02 | [02_ML_MODELS_DEEP_DIVE.md](./02_ML_MODELS_DEEP_DIVE.md) | All ML models explained in full detail |
| 03 | [03_BACKEND_ARCHITECTURE.md](./03_BACKEND_ARCHITECTURE.md) | Backend system design, services, APIs |
| 04 | [04_FRONTEND_USER_WORKFLOW.md](./04_FRONTEND_USER_WORKFLOW.md) | Complete user journey and UI screens |
| 05 | [05_DATABASE_SCHEMA.md](./05_DATABASE_SCHEMA.md) | Full database design and relationships |
| 06 | [06_NLP_PIPELINE.md](./06_NLP_PIPELINE.md) | How text is analyzed step by step |
| 07 | [07_RISK_ENGINE.md](./07_RISK_ENGINE.md) | Risk scoring and precursor detection |
| 08 | [08_SCALABILITY_DEPLOYMENT.md](./08_SCALABILITY_DEPLOYMENT.md) | How to scale to production |
| 09 | [09_PITCH_PRESENTATION.md](./09_PITCH_PRESENTATION.md) | Complete SIH pitch script |
| 10 | [10_QnA_CHEATSHEET.md](./10_QnA_CHEATSHEET.md) | Tough Q&A panel answers |

## One-Line Summary

> SIF Sentinel is an AI-powered industrial safety intelligence platform that ingests unsafe-act, near-miss reports from Oil India's oilfields, classifies them for Serious Injury or Fatality (SIF) potential using a trained ML pipeline, discovers recurring precursor patterns, maps them to IOGP Life-Saving Rules, and provides an interactive dashboard with actionable corrective interventions - keeping a human safety officer in the loop.

## Key Numbers

| Metric | Value |
|--------|-------|
| Problem Statement ID | SIH26165 |
| Organization | Oil India Limited (OIL) |
| Risk Score Scale | 1-100 |
| ML Model Versions | v1 -> v2 -> v4 hybrid -> v4b DistilBERT Transformer |
| Life-Saving Rules | 13 IOGP LSRs mapped |
| API Endpoints | 19 route groups, 60+ endpoints |
| DB Tables | 13 normalized tables |
| Frontend Pages | 12 pages + auth |
| Background Jobs | Celery + Redis ETL pipeline |
| LLM Integration | Google Gemini 2.5 Flash (optional, RAG-constrained) |
