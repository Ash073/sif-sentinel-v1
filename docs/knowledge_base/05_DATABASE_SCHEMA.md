# 05 — DATABASE SCHEMA
## SIF Sentinel — Complete Database Design

---

## Database: PostgreSQL (Neon cloud serverless)

ORM: SQLAlchemy 2.0 (async)
Migrations: Alembic

---

## Table Overview

| Table | Purpose |
|-------|---------|
| users | User accounts with roles |
| sites | OIL field sites/locations |
| life_saving_rules | IOGP LSR knowledge base |
| reports | Safety incident reports |
| report_analyses | ML analysis results per report |
| model_predictions | Raw ML model outputs |
| precursor_candidates | Per-report precursor signals |
| precursor_patterns | Aggregated recurring patterns |
| intervention_recommendations | AI-generated actions |
| corrective_actions | Human-managed action items |
| reviews | Human review decisions |
| audit_logs | Complete operation history |
| token_blocklist | Revoked JWT tokens |

---

## Table: users

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY,
    email       VARCHAR(320) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,   -- Argon2 hash
    full_name   VARCHAR(255) NOT NULL,
    role        ENUM('ADMIN','HSE_MANAGER','HSE_ANALYST','REVIEWER','VIEWER'),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ
);
```

Relationships:
- users → reports (one-to-many, created_by)
- users → corrective_actions (created_by, approved_by, verified_by)
- users → reviews (reviewer_id)
- users → audit_logs (user_id)

---

## Table: sites

```sql
CREATE TABLE sites (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,   -- "Duliajan Plant"
    code        VARCHAR(64) NOT NULL,    -- "DUL-01"
    location    VARCHAR(255) NOT NULL,   -- "Assam, India"
    region      VARCHAR(255) NOT NULL,   -- "Northeast"
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ
);
```

OIL has multiple sites across India. Each report is linked to a site.
Dashboard can filter/rank by site.

---

## Table: life_saving_rules

```sql
CREATE TABLE life_saving_rules (
    id          UUID PRIMARY KEY,
    code        VARCHAR(64) UNIQUE NOT NULL,  -- "LSR-01"
    name        VARCHAR(255) NOT NULL,         -- "Confined Space"
    description TEXT NOT NULL,
    keywords    JSON NOT NULL,   -- ["confined space", "gas testing", ...]
    hazards     JSON NOT NULL,   -- ["Toxic Atmosphere", "Oxygen Deficiency"]
    barriers    JSON NOT NULL,   -- ["Gas Testing", "Atmospheric Monitoring"]
    is_active   BOOLEAN DEFAULT TRUE
);
```

Pre-seeded with 13 IOGP Life-Saving Rules:
- LSR-01: Confined Space
- LSR-02: Energy Isolation (Lockout/Tagout)
- LSR-03: Working at Height
- LSR-04: Hot Work
- LSR-05: Driving Safety
- LSR-06: Lifting Operations
- LSR-07: Line Breaking
- LSR-08: Man Riding (Crane)
- LSR-09: Hot Tap / In-Service Welding
- LSR-10: Bypassing Safety Controls
- LSR-11: Diving
- LSR-12: Ground Disturbance
- LSR-13: Breathing Air

---

## Table: reports (CORE TABLE)

```sql
CREATE TABLE reports (
    id              UUID PRIMARY KEY,
    report_id       VARCHAR(64) UNIQUE NOT NULL,  -- "RPT-20260911-001"
    report_type     ENUM('UNSAFE_ACT','UNSAFE_CONDITION','NEAR_MISS','INCIDENT'),
    report_text     TEXT NOT NULL,                -- The narrative
    site_id         UUID REFERENCES sites(id),
    location        VARCHAR(255) NOT NULL,
    department      VARCHAR(255) NOT NULL,
    activity        VARCHAR(255),                 -- Optional, can be filled by NLP
    reported_at     TIMESTAMPTZ NOT NULL,
    source_type     ENUM('PUBLIC','SYNTHETIC','USER_SUBMITTED','IMPORTED'),
    status          ENUM('NEW','ANALYZING','ANALYZED','REVIEW_REQUIRED','REVIEWED','CLOSED','FAILED'),
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID REFERENCES users(id),
    idempotency_key VARCHAR(100),   -- Prevents duplicate submissions
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
);

-- Composite index for fast filtering:
CREATE INDEX ix_reports_filter ON reports (site_id, report_type, status, reported_at);
```

---

## Table: report_analyses (ANALYSIS RESULTS)

```sql
CREATE TABLE report_analyses (
    id              UUID PRIMARY KEY,
    report_id       UUID REFERENCES reports(id),
    
    -- ML Classification
    sif_potential   BOOLEAN,           -- True/False
    sif_level       ENUM('NON_SIF','LOW','MEDIUM','HIGH','REVIEW'),
    model_probability FLOAT,           -- 0.0 to 1.0
    
    -- Risk Score (Phase I)
    risk_score      FLOAT,             -- 1 to 100
    risk_priority   VARCHAR(50),       -- 'CRITICAL','HIGH','MEDIUM','LOW'
    risk_components JSON,              -- Breakdown: consequence, control, LSR, precursor
    risk_version    VARCHAR(50),       -- 'v1'
    
    -- Extracted Entities
    activity        VARCHAR(255),      -- "Confined Space Work"
    hazard          VARCHAR(255),      -- "Toxic Atmosphere"
    barrier         VARCHAR(255),      -- "Gas Testing"
    barrier_status  ENUM('EFFECTIVE','FAILED','MISSING','UNKNOWN'),
    barrier_failure TEXT,             -- "not verified"
    
    -- LSR Mapping
    life_saving_rule VARCHAR(255),     -- "LSR-01 Confined Space"
    rule_confidence  FLOAT,
    
    -- Evidence
    evidence_span    TEXT,             -- Key sentence(s) from report
    evidence_sentences JSON,
    explanation      TEXT,             -- Human-readable explanation
    overall_confidence FLOAT,
    
    -- Model Metadata
    model_version    VARCHAR(100),     -- "v4b"
    
    -- LLM Integration (Phase J)
    llm_attempted    BOOLEAN DEFAULT FALSE,
    llm_used         BOOLEAN DEFAULT FALSE,
    llm_provider     VARCHAR(50),      -- "gemini"
    llm_model_used   VARCHAR(100),     -- "gemini-2.5-flash"
    llm_timestamp    TIMESTAMPTZ,
    reviewer_summary TEXT,             -- LLM-generated reviewer briefing
    llm_error_code   VARCHAR(100),
    
    -- Causal Intelligence (Phase G)
    safety_graph     JSON,             -- Full causal graph nodes/edges
    causal_chains    JSON,             -- Extracted causal chains
    reasoning_summary TEXT,
    
    -- Audit
    precursor_priority_used VARCHAR(50),  -- Priority at analysis time
    analysis_status  VARCHAR(50) DEFAULT 'PENDING',
    created_at       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ
);
```

This is the most important table — every analysis field is stored for full auditability.

---

## Table: precursor_patterns (PATTERN ANALYTICS)

```sql
CREATE TABLE precursor_patterns (
    id              UUID PRIMARY KEY,
    pattern_key     VARCHAR(1100) UNIQUE NOT NULL,  -- composite key string
    category        VARCHAR(255),    -- "HIGH_ENERGY_BARRIER_FAILURE"
    activity        VARCHAR(255),    -- "Confined Space Work"
    hazard          VARCHAR(255),    -- "Toxic Atmosphere"
    barrier         VARCHAR(255),    -- "Gas Testing"
    failure_type    VARCHAR(255),    -- "not verified"
    
    -- Statistics
    occurrence_count INTEGER,        -- Total times pattern seen
    sif_count        INTEGER,        -- Reports with SIF potential
    sif_density      FLOAT,          -- sif_count / occurrence_count
    recent_count     INTEGER,        -- In last 30 days
    site_count       INTEGER,        -- How many sites affected
    department_count INTEGER,        -- How many departments affected
    
    -- Trend and Risk
    trend           VARCHAR(50),     -- "INCREASING","STABLE","DECREASING"
    risk_score      FLOAT,           -- 0.0 to 1.0 aggregate score
    priority        VARCHAR(50),     -- "CRITICAL","HIGH","MEDIUM","LOW"
    
    -- Temporal
    first_seen      TIMESTAMPTZ,
    last_seen       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
);
```

Patterns are rebuilt (aggregated from precursor_candidates) whenever:
- A batch import completes
- Called explicitly via API

---

## Table: corrective_actions (LIFECYCLE MANAGEMENT)

```sql
CREATE TABLE corrective_actions (
    id              UUID PRIMARY KEY,
    report_id       UUID REFERENCES reports(id),
    intervention_recommendation_id UUID REFERENCES intervention_recommendations(id),
    intervention_code VARCHAR(100) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    hierarchy_level VARCHAR(50) NOT NULL,  -- "ENGINEERING_CONTROL"
    action_type     VARCHAR(50) NOT NULL,
    priority        VARCHAR(20) NOT NULL,
    status          VARCHAR(30) DEFAULT 'DRAFT',
    
    -- Immutable AI recommendation snapshot
    original_recommendation JSON NOT NULL,
    -- All user changes tracked
    user_modifications JSON NOT NULL DEFAULT '[]',
    
    -- Assignment
    assigned_to     VARCHAR(255),
    due_date        TIMESTAMPTZ,
    
    -- Lifecycle actors
    created_by      UUID REFERENCES users(id),
    reviewed_by     UUID REFERENCES users(id),
    approved_by     UUID REFERENCES users(id),
    verified_by     UUID REFERENCES users(id),
    closed_by       UUID REFERENCES users(id),
    
    -- Lifecycle timestamps
    approved_at     TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    verified_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    
    -- Notes
    verification_notes TEXT,
    rejection_reason   TEXT,
    cancellation_reason TEXT
);
```

The `original_recommendation` snapshot means you can always prove what the AI originally suggested, even if a human later modifies it.

---

## Entity-Relationship Diagram (Simplified)

```
users ──────────── reports ────────────── sites
  |                   |
  |            report_analyses
  |                   |
reviews ──────────────┘
                       |
            precursor_candidates
                       |
            [aggregated into]
                       |
            precursor_patterns ──── intervention_recommendations
                                              |
                                    corrective_actions ──── users
                                              
audit_logs ────── users
token_blocklist ── (standalone)
```

---

## Indexes for Performance

Key indexes:
- `reports(site_id, report_type, status, reported_at)` — Dashboard queries
- `report_analyses(report_id, created_at)` — Latest analysis lookup
- `precursor_patterns(risk_score, priority, last_seen)` — Pattern sorting
- `corrective_actions(status, priority, report_id)` — CA filters
- `audit_logs(user_id, entity_type, created_at)` — Audit trail queries

---

## Data Integrity

- All foreign keys enforced at DB level
- `idempotency_key` on reports prevents duplicate submissions
- UUIDs as primary keys (no sequential integer vulnerability)
- Soft delete on reports (`is_deleted`, `deleted_at`) — data never lost
- `original_recommendation` on corrective_actions — AI decisions always auditable
