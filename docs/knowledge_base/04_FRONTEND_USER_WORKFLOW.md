# 04 — FRONTEND USER WORKFLOW
## SIF Sentinel — Complete User Journey

---

## Tech Stack

- **Next.js 16** with App Router (file-based routing)
- **TypeScript** for type safety
- **TailwindCSS v4** for styling
- **TanStack Query v5** for server state and caching
- **Recharts** for charts and data visualization
- **XYFlow / ReactFlow** for causal graph visualization
- **Framer Motion** for animations
- **shadcn/ui** + **base-ui/react** for components
- **Zod** for form validation
- **react-hook-form** for form management

---

## Application Routes

| URL | Component | Purpose |
|-----|-----------|---------|
| `/` | Landing Page | Hero, features, demo CTA |
| `/login` | Login Page | Email/password authentication |
| `/register` | Register Page | New user registration |
| `/demo` | Demo Page | Interactive demo without login |
| `/dashboard` | Dashboard | Analytics overview |
| `/reports` | Reports List | All safety reports with filters |
| `/reports/new` | New Report Form | Submit a safety report |
| `/reports/[id]` | Report Detail | Full report + analysis view |
| `/reviews` | Review Queue | Pending human reviews |
| `/reviews/[id]` | Review Detail | Review and approve/reject AI |
| `/precursors` | Precursor Patterns | Recurring danger patterns |
| `/precursors/[id]` | Precursor Detail | Pattern graph + representative reports |
| `/risk` | Risk Dashboard | Site/activity/barrier risk ranking |
| `/interventions` | Interventions | AI-generated recommendations |
| `/corrective-actions` | Corrective Actions | Action tracking and lifecycle |
| `/corrective-actions/new` | New CA | Create corrective action |
| `/corrective-actions/[id]` | CA Detail | Full CA with lifecycle |
| `/copilot` | Safety Copilot | AI Q&A assistant |
| `/rules` | Life-Saving Rules | LSR reference |
| `/models` | Model Registry | ML model versions |

---

## Complete User Workflow

### WORKFLOW 1: Submit a Safety Report (HSE Analyst)

```
1. User goes to /reports/new
2. Fills form:
   - Report Type: UNSAFE_ACT / UNSAFE_CONDITION / NEAR_MISS / INCIDENT
   - Site: (dropdown from sites API)
   - Location: e.g., "Pump Station 3"
   - Department: e.g., "Maintenance"
   - Date of Incident
   - Narrative text (the report): 
     "Worker entered the storage vessel without performing gas testing. 
      H2S gas was present inside. Gas clearance certificate was not obtained."

3. Form validated with Zod schema:
   - text min 10 chars, max 20,000 chars
   - All required fields present

4. POST /api/v1/reports
   → HTTP 201 Created
   → Report saved with status=NEW
   → Idempotency key prevents duplicate submissions

5. User sees newly created report card
6. User clicks "Analyze" button

7. POST /api/v1/reports/{id}/analyze
   → ML pipeline runs (< 200ms)
   → Returns full AnalysisResponse

8. Page refreshes to show analysis results:
   - SIF Level badge: HIGH (red)
   - Probability bar: 87%
   - Activity: Confined Space Work
   - Hazard: Toxic Atmosphere
   - Barrier: Gas Testing [FAILED]
   - LSR: LSR-01 Confined Space
   - Risk Score: 75/100 (HIGH)
   - Explanation paragraph
   - Causal Safety Graph (ReactFlow)
   - Intervention recommendations
   - Review Required: YES
```

---

### WORKFLOW 2: Human Review (HSE Reviewer)

```
1. Reviewer goes to /reviews
2. Sees queue of all PENDING reviews
3. Each card shows: Report ID, Site, SIF Level, ML Probability, Date
4. Clicks on a review

5. /reviews/[id] opens:
   - Left panel: Full report text
   - Right panel: ML analysis results
   - Reviewer sees: Activity, Hazard, Barrier, SIF Level, Explanation

6. Reviewer Options:
   a) APPROVE → AI findings are correct, report moves to REVIEWED
   b) REJECT  → AI findings are wrong, report returned to ANALYZED
   c) MODIFY  → Reviewer changes specific fields:
      - Corrected SIF Level: MEDIUM (instead of HIGH)
      - Corrected Activity: Maintenance (instead of Confined Space)
      - Comment: "Activity was not confined space entry"

7. PATCH /api/v1/reviews/{id}
   {
     "decision": "MODIFY",
     "corrected_sif_level": "MEDIUM",
     "corrected_activity": "Maintenance",
     "reviewer_comment": "Activity was not confined space entry"
   }

8. Report status → REVIEWED
9. Review recorded with reviewer_id, reviewed_at, decision
10. Audit log created
```

---

### WORKFLOW 3: Bulk CSV Import (HSE Manager)

```
1. Manager goes to Reports page
2. Clicks "Import CSV" button
3. File dialog opens
4. Selects CSV file (OIL's existing safety data)
   CSV format:
   report_text, report_type, department, location, activity
   "Worker entered vessel...", NEAR_MISS, Operations, Platform B, ...

5. POST /api/v1/imports/upload (multipart/form-data)
   → HTTP 202 Accepted immediately
   → Celery task dispatched to background

6. WebSocket connection opens: ws://.../ws/etl-progress/{user_id}
7. Progress bar appears in UI
   → "Starting import..." 0%
   → "Processed 10/50 reports..." 18%
   → "Processed 45/50 reports..." 81%
   → "Rebuilding precursor patterns..." 90%
   → "Import complete" 100%

8. All 50 reports analyzed and saved
9. Precursor patterns rebuilt automatically
10. Dashboard updates with new data
```

---

### WORKFLOW 4: Dashboard Overview (HSE Manager)

```
/dashboard shows:

KPI Cards (top row):
  - Total Reports: 247
  - SIF Reports: 89 (36%)
  - High Risk: 23
  - Review Queue: 12
  - Active Precursor Patterns: 7
  - Sites Monitored: 4

Charts (middle section):
  - SIF Trend Line Chart (30 days): daily SIF rate
  - Activity Distribution Donut: top unsafe activities
  - Hazard Distribution Bar: top hazards by frequency
  - Barrier Failure Timeline: daily barrier failures
  - LSR Distribution: which life-saving rules are most violated

Bottom section:
  - Site Comparison table
  - Quick links: Recent reports, Pending reviews, Top precursors
  - Export CSV button → downloads all metrics as spreadsheet
```

---

### WORKFLOW 5: Precursor Pattern Investigation

```
1. Manager goes to /precursors
2. Sees list of active patterns, sorted by risk_score

Each pattern card shows:
  - Category: HIGH_ENERGY_BARRIER_FAILURE
  - Activity: Confined Space Work
  - Hazard: Toxic Atmosphere
  - Barrier: Gas Testing
  - Failure Type: not verified
  - Occurrences: 12 times
  - SIF Reports: 8 (66.7%)
  - Trend: INCREASING
  - Priority: CRITICAL
  - Risk Score: 0.87

3. Clicks on pattern → /precursors/[id]

Detail page shows:
  - Why It Matters: "12 recurring observations, 8 SIF-associated (66%), 5 in last 30 days"
  - Sites affected: [Duliajan, Dibrugarh, Jorhat]
  - Departments affected: [Operations, Maintenance]
  - Representative Reports (5 most recent)
  - CAUSAL GRAPH:
      [Confined Space Work] → exposes → [Toxic Atmosphere]
      [Toxic Atmosphere] → controlled by → [Gas Testing]
      [Gas Testing] → failure → [not verified]
      [not verified] → risk signal → [SIF Potential]
    (Rendered as interactive ReactFlow graph)
```

---

### WORKFLOW 6: Counterfactual "What-If" Simulation

```
From any report analysis page:

1. User sees "Counterfactual Simulation" section
2. Selects: Target Control = "Gas Testing"
3. Selects: Simulated Status = "VERIFIED" (what if gas testing had been done?)
4. Clicks "Run Simulation"

5. POST /api/v1/analyze/counterfactual
   {
     "safety_graph": {...},  # current causal graph
     "target_control": "Gas Testing",
     "simulated_status": "VERIFIED",
     "original_risk_score": 75
   }

6. Response shows:
   - Original Risk: 75 (HIGH)
   - Simulated Risk: 15 (LOW)
   - Risk Delta: -60 (REDUCED)
   - Original SIF: true → Simulated SIF: false
   - Causal Changes: "Gas Testing changed from NOT_VERIFIED to VERIFIED"
   - Interpretation: "If gas testing had been verified before entry, 
                       the incident's SIF classification would have been 
                       eliminated. Risk reduced from HIGH to LOW."
   - Assumptions: ["Gas testing is assumed to have been effective"]
```

---

### WORKFLOW 7: Corrective Action Management

```
1. From any intervention recommendation, user clicks "Create Corrective Action"

2. POST /api/v1/corrective-actions
   Stores: title, description, hierarchy_level, action_type, priority
   Original AI recommendation saved as immutable snapshot

3. CA starts as DRAFT

4. Lifecycle states:
   DRAFT → SUBMITTED (analyst submits)
   SUBMITTED → UNDER_REVIEW (manager picks up)
   UNDER_REVIEW → APPROVED (manager approves)
   UNDER_REVIEW → REJECTED (with reason)
   APPROVED → IN_PROGRESS (work begins, due date set)
   IN_PROGRESS → VERIFICATION_REQUIRED (work done, needs sign-off)
   VERIFICATION_REQUIRED → VERIFIED (verifier confirms)
   VERIFIED → CLOSED (manager closes)

5. All state transitions stored in user_modifications JSON:
   [{user_id, timestamp, field, old_value, new_value, reason}]

6. /corrective-actions page shows:
   - All CAs with status filter
   - Priority badges (CRITICAL, HIGH, MEDIUM, LOW)
   - Overdue indicators (red clock icon)
   - Export button for approved action plans
```

---

### WORKFLOW 8: Safety Copilot Q&A

```
1. User goes to /copilot
2. Types question: "What is the most critical safety risk at Site A this month?"

3. POST /api/v1/copilot/ask
   {
     "question": "What is the most critical safety risk at Site A this month?",
     "site_id": "uuid-site-a"
   }

4. System retrieves live DB context:
   - Recent precursor patterns (last 30 days)
   - Barrier failure events
   - SIF trend
   - Active corrective actions

5. Sends to Gemini 2.5 Flash with strict system prompt:
   "Answer ONLY from the provided JSON data. Never invent statistics."

6. Response displayed:
   "Based on the last 30 days of data for Site A, the highest-risk pattern 
    involves Confined Space Work with 8 SIF-associated reports (66% SIF rate) 
    and a CRITICAL priority score of 0.87. Gas Testing failures have increased 
    from 2 to 8 incidents over the past two weeks, suggesting an INCREASING 
    trend. The primary barrier failure is 'not verified' across 12 occurrences.
    
    → Recommended Action: Conduct an immediate gas testing compliance audit 
      across all confined space entry permits at Site A."
```

---

### WORKFLOW 9: Narrative Translation

```
1. From report detail page, user clicks "Generate Narrative"
2. Selects mode:
   - EXECUTIVE: Non-technical summary for management
   - INVESTIGATION: Detailed technical investigation format
   - FIELD: Plain-language for frontline workers
   - COUNTERFACTUAL: What-if prevention narrative

3. POST /api/v1/analyze/narrative
   Passes analysis context: safety_graph, causal_chains, risk_score, etc.

4. NarrativeTranslationService generates plain-English narrative:
   
   EXECUTIVE mode:
   "A near-miss incident at Site B on 09/11/2026 involving confined space 
    entry has been classified as HIGH SIF potential. The worker entered a 
    storage vessel without gas testing verification, creating direct exposure 
    to toxic atmosphere. This violated the Confined Space Life-Saving Rule 
    (LSR-01). Immediate corrective action (CRITICAL priority) is recommended."

5. Narrative displayed with: mode badge, source basis, validation status
```

---

## State Management

- **TanStack Query** handles all server state
- **react-hook-form + Zod** handles form state
- No global state management library (Zustand/Redux) needed
- Queries auto-refresh on window focus

## API Integration

All API calls go through `services/api.ts`:
```typescript
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true
});

// Auth token injected via interceptor
api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});
```
