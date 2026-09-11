# 03 — BACKEND ARCHITECTURE
## SIF Sentinel — FastAPI Modular Monolith

---

## Architecture Pattern: Modular Monolith

We chose a **Modular Monolith** architecture — not microservices. This means:
- Everything runs in one Python process (easy to demo and deploy)
- Internally organized into clear modules (easy to split into microservices later)
- The `app/` package is divided into: api, core, db, knowledge, ml, models, repositories, schemas, services, tasks

---

## Main Application (app/main.py)

```python
app = FastAPI(
    title="SIF Sentinel Safety Intelligence API",
    version="0.1.0"
)

# Rate limiting (SlowAPI)
app.state.limiter = limiter

# Middleware stack:
app.add_middleware(MetricsMiddleware)   # Prometheus metrics
app.add_middleware(RequestIDMiddleware) # Unique request IDs for tracing
app.add_middleware(CORSMiddleware)      # Cross-origin for frontend

# Global error handlers
register_error_handlers(app)

# All API routes mounted at /api/v1
app.include_router(api_router)
```

---

## API Router — 19 Route Groups

| Route Group | Prefix | Key Functions |
|-------------|--------|---------------|
| health | /health | System health check |
| auth | /auth | Login, logout, token refresh |
| users | /users | User CRUD |
| sites | /sites | Site management |
| reports | /reports | Report CRUD + analyze |
| analysis | /analyze | Text analysis endpoints |
| reviews | /reviews | Human review workflow |
| precursors | /precursors | Precursor pattern discovery |
| risk | /risk | Risk scoring by dimension |
| dashboard | /dashboard | Analytics, charts, export |
| interventions | /interventions | Intervention recommendations |
| corrective-actions | /corrective-actions | CA lifecycle management |
| rules | /rules | Life-Saving Rules CRUD |
| models | /models | ML model registry |
| imports | /imports | CSV bulk upload |
| copilot | /copilot | AI safety copilot |
| audit-logs | /audit-logs | Full audit trail |
| ws | /ws | WebSocket (ETL progress) |

---

## Authentication System

### JWT-Based Auth
```
POST /api/v1/auth/login
  Body: {email, password}
  Response: {access_token, token_type}

POST /api/v1/auth/logout
  Adds token to blocklist table
```

- Tokens signed with HS256
- `access_token_expire_minutes` = 60 minutes
- Revoked tokens stored in `token_blocklist` table
- Password hashed with Argon2 (memory-hard, quantum-resistant)

### Role-Based Access Control (RBAC)

5 roles with different permissions:
```
ADMIN        → All operations, user management
HSE_MANAGER  → Reports, reviews, corrective actions
HSE_ANALYST  → Reports, analysis, read-only reviews
REVIEWER     → Review queue, approve/reject AI decisions
VIEWER       → Read-only access to all data
```

Route protection example:
```python
@router.post("/analyze")
async def analyze(
    user: User = Depends(require_roles(ADMIN, HSE_MANAGER, HSE_ANALYST, REVIEWER))
):
```

---

## Analysis Pipeline — Core Business Logic

### Entry Points
1. `POST /api/v1/reports/{id}/analyze` — Analyze a persisted report
2. `POST /api/v1/analyze` — Analyze arbitrary text (no persistence)
3. CSV upload → Celery ETL → auto-analyze each row

### AnalysisService.analyze_report() Flow
```
1. Load report from DB by report_id
2. Run AnalysisPipeline.analyze_text(report.report_text)
   ↓
   [NLP PIPELINE - see doc 06]
3. Store ReportAnalysis in DB (all fields)
4. Store PrecursorCandidates in DB
5. Store ModelPrediction in DB
6. Update report.status → ANALYZED or REVIEW_REQUIRED
7. Trigger LLM reviewer summary (if llm_enabled)
8. Return AnalysisResponse
```

---

## Services Layer — Business Logic

### analysis/analysis_service.py
- Orchestrates the full analysis workflow
- Creates DB records for: ReportAnalysis, PrecursorCandidates, ModelPrediction
- Calls LLMAssistanceService for optional AI-generated reviewer summary

### analytics_service.py
- Powers the dashboard
- `summary()` → total reports, SIF count, high risk, active precursors
- `sif_trend()` → time series (7d, 30d, 90d, 1y)
- `distribution()` → breakdown by activity, hazard, LSR
- `barrier_failures()` → daily barrier failure events
- `site_comparison()` → per-site metrics
- `export_csv()` → downloadable CSV of all metrics

### corrective_action_service.py
- Manages the full CA lifecycle: DRAFT → SUBMITTED → APPROVED → IN_PROGRESS → VERIFICATION_REQUIRED → VERIFIED → CLOSED
- Preserves original AI recommendation as immutable snapshot
- Tracks all user modifications with reason
- Audit logs every state transition

### intervention_service.py
- Generates intervention recommendations from analysis results
- Calls SafetyInterventionEngine (Hierarchy of Controls)
- Creates persistent InterventionRecommendation records
- Deduplicates using idempotency keys

### review_service.py
- Human review workflow
- Reviewer can: APPROVE, REJECT, or MODIFY AI findings
- If reviewer changes SIF level, stores corrected values
- Updates report status to REVIEWED

### precursor_engine/precursor_service.py
- `rebuild()` → scans all PrecursorCandidates, aggregates patterns, saves PrecursorPattern records
- `list()` → returns current patterns sorted by risk score
- `detail()` → full pattern details with representative reports
- `graph()` → returns node/edge graph for visualization (used in ReactFlow)

### risk_engine/risk_service.py
- `sites()` → ranks all sites by SIF precursor density
- `dimensions()` → risk by activity or hazard
- `barriers()` → barrier failure rates and associated risk

### nlp/copilot_service.py (Safety Copilot)
- RAG (Retrieval-Augmented Generation) system
- Retrieves live DB context: precursor patterns, barrier failures, SIF trends
- Passes as grounding JSON to Gemini
- Strict system prompt prevents hallucination
- Returns data-backed safety answers

---

## ETL Background Processing

### Celery + Redis Architecture
```
User uploads CSV
  → POST /api/v1/imports/upload
    → Celery task dispatched: process_csv_upload.delay()
      → Worker picks up task from Redis queue
        → Async processing row by row (up to 100 rows)
          → Each row: create Report → analyze → auto-classify
        → PrecursorService.rebuild() at end
        → Progress published to Redis pub/sub channel
          → WebSocket delivers progress to frontend
```

### WebSocket Progress (ws.py)
```
Client: ws://localhost:8000/api/v1/ws/etl-progress/{user_id}?token=JWT
  → JWT validated server-side
  → Subscribes to Redis pub/sub channel: etl_progress_{user_id}
  → Each CSV row processed → progress % sent to client
  → {progress: 100, status: "Import complete"} → connection closed
```

---

## Middleware Stack

| Middleware | Purpose |
|-----------|---------|
| MetricsMiddleware | Prometheus counter/histogram for every request |
| RequestIDMiddleware | Injects X-Request-ID header for distributed tracing |
| CORSMiddleware | Allows frontend (localhost:3000) cross-origin requests |
| SlowAPI Rate Limiter | 20 requests/minute on analysis endpoints |

---

## Error Handling

All errors return structured JSON:
```json
{
  "detail": "Report not found",
  "type": "NotFoundError",
  "request_id": "abc123"
}
```

Custom exception types:
- `NotFoundError` → 404
- `ConflictError` → 409
- `AuthError` → 401
- `ForbiddenError` → 403
- `ValidationError` → 422

---

## Rate Limiting

Analysis endpoints are rate-limited:
```python
@limiter.limit("20/minute")
async def analyze_text_endpoint(request: Request, ...):
```

Prevents abuse of the ML inference and LLM endpoints.

---

## Audit Logging

Every significant operation creates an AuditLog entry:
```python
AuditLog(
    user_id=user.id,
    action="REPORT_ANALYZED",
    entity_type="Report",
    entity_id=report.id,
    details={"report_id": "RPT-001", "sif_level": "HIGH"},
    ip_address="192.168.1.1",
    created_at=now()
)
```

Full API: `GET /api/v1/audit-logs/` (admin only)

---

## Health Check

`GET /api/v1/health`

Returns:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected",
  "model": "sif-transformer-distilbert-v1",
  "llm": "enabled"
}
```

Used by Docker health checks and monitoring systems.
