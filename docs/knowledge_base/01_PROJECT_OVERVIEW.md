# 01 — PROJECT OVERVIEW
## SIF Sentinel | SIH26165 | Oil India Limited

---

## 1. What Problem Are We Solving?

Oil India Limited (OIL) operates oil drilling and exploration across India. Workers file hundreds of safety reports every year describing:
- **Unsafe Acts** — e.g., "Worker entered vessel without gas testing"
- **Unsafe Conditions** — e.g., "Scaffold missing guardrail"
- **Near Misses** — e.g., "Dropped object narrowly missed worker"

These are all written as free-text paragraphs in English. Currently:
- Reports are manually reviewed by HSE (Health, Safety & Environment) officers
- This takes days or weeks
- Patterns across multiple sites/departments are impossible to spot manually
- By the time a pattern is found, a Serious Injury or Fatality (SIF) may have already occurred

**The risk**: A SIF event (death or permanent disability) at an oil site can cost lives, result in crores in penalties, shut down operations, and destroy reputations.

**The gap OIL identified**: There is no automated system to scan these reports, detect which ones are likely SIF precursors, and alert safety teams before a fatality happens.

---

## 2. What Is a SIF Precursor?

A SIF Precursor is a specific observable event that, if repeated or unaddressed, statistically indicates a future Serious Injury or Fatality is likely.

Example chain:
```
Activity: Confined Space Entry
  -> Hazard: Toxic Atmosphere (H2S gas)
    -> Required Barrier: Gas Testing before entry
      -> Barrier Failure: "Gas test was not performed"
        -> SIF Exposure: Worker exposed to lethal gas without warning
          -> SIF Precursor: HIGH priority
            -> Life-Saving Rule Violated: LSR-01 (Confined Space)
              -> Corrective Action: IMMEDIATE_STOP_WORK
```

Our system detects exactly this chain automatically.

---

## 3. Our Solution: SIF Sentinel

SIF Sentinel is a **full-stack AI decision-support platform** that:

1. **Ingests** safety reports (manual input or CSV bulk upload)
2. **Classifies** each report: SIF-potential vs Non-SIF-potential (ML model)
3. **Extracts** structured safety entities: Activity, Hazard, Barrier, Barrier Status
4. **Maps** to Life-Saving Rules (IOGP standard, 13 rules)
5. **Builds a Causal Safety Graph** showing the path from activity to risk
6. **Scores Risk** on a deterministic 1-100 scale
7. **Discovers Precursor Patterns** — recurring combinations that signal danger
8. **Generates Intervention Recommendations** — actionable corrective actions
9. **Enables Human Review** — safety officers validate, approve, or override AI findings
10. **Provides Dashboard Analytics** — site ranking, trend analysis, barrier failure heatmaps
11. **Safety Copilot** — RAG-powered Q&A assistant grounded in live database data

---

## 4. Why This Wins

| Criteria | SIF Sentinel |
|----------|-------------|
| Real-world impact | Saves lives in Indian oil industry |
| AI/ML depth | 4 model versions, causal reasoning, counterfactual simulation |
| Explainability | Every decision has evidence span, model factors, causal chain |
| Human-in-the-loop | Reviewers can override every AI decision |
| Domain specificity | Oil & gas domain knowledge baked into rules |
| Full-stack completeness | Working frontend, backend, ML, database, ETL |
| Scalability | Docker, async, Celery, PostgreSQL ready for OIL's real infrastructure |
| Auditability | Every action logged with user, IP, timestamp |

---

## 5. Technology Stack

### Backend
- **Python 3.11** — Main language
- **FastAPI** — REST API framework (async)
- **SQLAlchemy 2.0** — ORM (async)
- **PostgreSQL (Neon)** — Production database
- **Alembic** — Database migrations
- **Celery + Redis** — Background task queue
- **PyJWT + Argon2** — Authentication
- **Structlog** — Structured logging
- **Prometheus** — Metrics collection
- **SlowAPI** — Rate limiting

### ML / AI
- **scikit-learn** — TF-IDF vectorizer, Logistic Regression, ML pipelines
- **PyTorch + HuggingFace Transformers** — DistilBERT transformer model
- **RapidFuzz** — Fuzzy string matching for entity extraction
- **Google Gemini 2.5 Flash** — LLM for copilot and narrative generation (RAG-constrained)

### Frontend
- **Next.js 16** — React framework
- **TypeScript** — Type safety
- **TailwindCSS v4** — Styling
- **TanStack Query v5** — Data fetching
- **Recharts** — Data visualization
- **XYFlow (ReactFlow)** — Causal safety graph visualization
- **Framer Motion** — Animations
- **shadcn/ui** — Component library

---

## 6. Project Directory Structure

```
SIF - 2026/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers (19 groups)
│   │   ├── core/      # Config, constants, middleware
│   │   ├── db/        # Database session, base
│   │   ├── knowledge/ # LSR rules, taxonomy JSON
│   │   ├── ml/        # ML inference (predictor)
│   │   ├── models/    # SQLAlchemy DB models (13 tables)
│   │   ├── repositories/ # Data access layer
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── services/  # Business logic
│   │   │   ├── analysis/      # Analysis orchestration
│   │   │   ├── llm/           # Gemini LLM provider
│   │   │   ├── narrative/     # Narrative translation
│   │   │   ├── nlp/           # Core NLP pipeline
│   │   │   ├── precursor_engine/ # Pattern discovery
│   │   │   └── risk_engine/   # Risk scoring
│   │   └── tasks/     # Celery ETL tasks
│   └── alembic/       # DB migrations
├── frontend/          # Next.js application
│   ├── app/           # Pages (Next.js App Router)
│   ├── components/    # React components
│   ├── services/      # API client
│   └── hooks/         # Custom React hooks
├── ml/                # Training research
│   ├── training/      # Model training scripts
│   ├── configs/       # Training configs
│   └── evaluation/    # Model evaluation
├── artifacts/         # Trained model files (.joblib, .safetensors)
├── data/              # Training datasets
└── docs/              # Documentation
    └── knowledge_base/ # This knowledge base
```
