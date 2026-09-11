# 11 — TEAM ROLES & RESPONSIBILITIES
## SIF Sentinel — Who Knows What

---

## Suggested Team Responsibilities

| Area | What to Know | Key Files |
|------|-------------|-----------|
| ML/AI | Models v1-v4b, pipeline, accuracy | 02_ML_MODELS_DEEP_DIVE.md |
| NLP | Entity extraction, causal engine | 06_NLP_PIPELINE.md |
| Backend | FastAPI, API routes, services | 03_BACKEND_ARCHITECTURE.md |
| Database | Schema, relationships, indexes | 05_DATABASE_SCHEMA.md |
| Frontend | User workflows, pages, charts | 04_FRONTEND_USER_WORKFLOW.md |
| Risk Engine | Scoring formula, precursors | 07_RISK_ENGINE.md |
| DevOps | Docker, scaling, deployment | 08_SCALABILITY_DEPLOYMENT.md |
| Pitch Lead | Full story, outcomes | 09_PITCH_PRESENTATION.md |
| All members | Q&A answers | 10_QnA_CHEATSHEET.md |

---

## One-Sentence Explanations Per Component

Use these when you only have 10 seconds to explain something:

**SIF Sentinel**: "An AI platform that reads oil industry safety reports and automatically detects which ones could lead to a fatality — before the fatality happens."

**ML Classifier**: "A fine-tuned DistilBERT transformer model trained on oil safety reports that scores each report from 0-100% for Serious Injury or Fatality potential."

**Entity Extractor**: "A rule-based + ML hybrid system that reads a safety report and extracts what happened (activity), what the danger was (hazard), and whether the safety control worked (barrier status)."

**Causal Graph**: "A visual knowledge graph that shows exactly how an activity created a hazard, how a safety control failed, and what SIF exposure resulted — like a flowchart of what went wrong."

**Life-Saving Rules**: "13 global oil industry safety rules from IOGP. When a report violates one of these rules, it's automatically flagged — these rules exist because following them literally saves lives."

**Precursor Patterns**: "When the same combination of activity + hazard + barrier failure appears repeatedly across multiple reports, that's a pattern. Patterns mean the problem is systemic, not random."

**Risk Score**: "A 1-100 number calculated from four factors: how severe the SIF potential is, how badly the safety control failed, whether a Life-Saving Rule was violated, and whether this is a recurring pattern."

**Corrective Actions**: "AI-generated action items that tell safety officers exactly what to do to fix a risk — with priority levels and a full lifecycle from draft to verified."

**Safety Copilot**: "An AI assistant powered by Gemini that can answer questions about your safety data — but it can ONLY answer from your actual database, never from imagination."

**Counterfactual Simulation**: "A what-if calculator: 'If this safety control had worked, what would the risk score have been?' Turns post-analysis into prevention lessons."

---

## What Makes Each Component Impressive to Judges

| Component | Impressive Because |
|-----------|-------------------|
| DistilBERT classifier | State-of-the-art NLP, not just keyword matching |
| Causal reasoning engine | Builds knowledge graphs from free text |
| Counterfactual simulator | First-of-kind in safety management software |
| Hierarchy of Controls | Follows real engineering safety framework |
| RAG Copilot | LLM grounded in data, not hallucinating |
| Narrative translation | Same data, 4 different audiences |
| Full-stack completeness | Frontend + Backend + ML + DB + DevOps all working |
| Human-in-the-loop design | Not AI replacing humans, AI assisting humans |
| Real-time WebSocket ETL | Live import progress — production feature |
| Audit logging | Compliance-ready from day one |

---

## Demo Script for 5-Minute Demo

1. (30s) Open dashboard → show KPI cards, trend charts
2. (30s) Navigate to Reports → show list with filters
3. (45s) Create new report → submit narrative text → click Analyze
4. (45s) Show analysis result: SIF level, causal graph, risk score
5. (30s) Run counterfactual simulation (what-if gas testing was done)
6. (30s) Go to Precursors → show CRITICAL pattern details and graph
7. (30s) Go to Copilot → ask question → show data-grounded answer
8. (30s) Show Risk Dashboard → site ranking
9. (30s) Show Corrective Actions lifecycle

Total: ~5 minutes

---

## Emergency Answers (If System Is Down)

If the live system is unavailable during presentation:

1. Show screenshots/recordings from `artifacts/` directory
2. Walk through the code: "This is our SIFPredictor class, here is how it loads the transformer model..."
3. Show API docs at `/docs` if backend is still running
4. Use the demo video recording if prepared

Never say "the system is broken." Say: "We're experiencing a technical hiccup with the live demo. Let me show you the architecture and walk you through what would happen in production."
