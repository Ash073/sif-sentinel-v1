# 10 — Q&A CHEATSHEET
## SIF Sentinel — Tough Questions and Model Answers

---

## CATEGORY 1: ML / AI Questions

### Q: How accurate is your ML model?
"Our best model — a fine-tuned DistilBERT transformer — achieves approximately 91% F1 score on our test set. More importantly, we have multiple model versions. If accuracy on OIL's real data is lower, we can quickly retrain with real labeled reports. The system is designed to improve over time. We also have a human review layer — any prediction below 62% confidence is automatically escalated to a human reviewer, so even if the ML makes a mistake, a human catches it."

### Q: Your training data is synthetic — how do you know it will work on real OIL reports?
"You're right, and that's a fair concern. Our training data is a combination of publicly available oil and gas safety reports and synthetic augmented data. Synthetic data was generated to match the vocabulary and phrasing patterns of actual oil industry incidents. When OIL integrates this system, we would do a transfer learning fine-tuning on their real labeled reports — 200-500 labeled examples would significantly boost accuracy. This is standard practice in production NLP systems. The architecture is designed for this exact workflow."

### Q: Why not use GPT-4 or Claude directly for classification?
"We considered this. There are three reasons we chose a specialized trained model over a general LLM for classification. First, cost and latency — a GPT-4 API call costs 10-100x more than local inference and adds 1-2 seconds of latency. We need < 200ms for real-time analysis. Second, consistency — LLMs are non-deterministic; the same report can get different classifications on different runs. Our trained model always gives the same answer for the same input, which is required for regulatory compliance. Third, controllability — a trained model with a calibrated threshold gives us precise control over false positive rates. That said, we DO use Gemini LLM for the Safety Copilot — but constrained by strict RAG to prevent hallucination."

### Q: What happens if a report is ambiguous?
"Ambiguous reports trigger a 'REVIEW' classification, not a wrong classification. We define ambiguity as: ML probability between 42-58% (the uncertainty band). These reports are automatically flagged with review_required=True and added to the human review queue. A human safety officer reviews them and makes the final decision. Our system is designed to be conservative — when in doubt, it escalates to a human."

### Q: What is DistilBERT and why did you choose it?
"DistilBERT is a compressed version of BERT (Bidirectional Encoder Representations from Transformers), developed by Hugging Face. It retains 97% of BERT's performance while being 40% smaller and 60% faster. We chose it because: it understands language context — 'gas test was NOT performed' vs 'gas test was performed' are semantically different, and the transformer handles this correctly unlike bag-of-words models. The smaller size means we can run it on CPU without needing expensive GPU infrastructure. And it's fine-tunable with relatively small domain datasets."

### Q: How do you handle negation in the text?
"This was one of our hardest engineering challenges. We handle negation at three levels. At the preprocessing level, we expand contractions — 'wasn't' becomes 'was not', 'didn't' becomes 'did not'. At the entity extraction level, we have a context window analysis — for each safety barrier mentioned, we check a 13-token window before and after for negation terms: 'not', 'without', 'missing', 'absent', 'bypassed'. At the transformer level, the DistilBERT model inherently understands negation through its attention mechanism. And at the causal reasoning level, we have explicit temporal inversion detection — 'worker entered BEFORE gas testing' is correctly identified as a negated verification."

---

## CATEGORY 2: Architecture / Technical Questions

### Q: Why FastAPI and not Django or Flask?
"FastAPI is the right choice for three reasons. First, async performance — FastAPI supports async/await natively with uvicorn, allowing thousands of concurrent requests without blocking. Django is sync by default; Flask is sync. Second, automatic API documentation — FastAPI generates OpenAPI docs automatically from our Pydantic schemas. Third, validation — Pydantic v2 validates all inputs and outputs with zero boilerplate."

### Q: Your database is remote (Neon). What if it goes down?
"Neon is a serverless PostgreSQL provider with 99.99% uptime SLA and automatic failover. But this is a valid point. For production deployment at OIL, we would use their internal infrastructure — either an on-premise PostgreSQL instance or a managed RDS on their private cloud. The system is database-agnostic — we only need to change the DATABASE_URL environment variable. SQLAlchemy handles the rest."

### Q: Why Celery and Redis for background jobs? Why not just threads?
"Python's GIL (Global Interpreter Lock) prevents true parallelism with threads. Celery with Redis provides a proper distributed task queue: tasks survive process crashes (persisted in Redis), can be scaled horizontally by adding more worker containers, support retry policies and error handling, and can be monitored through Celery Flower. For a batch import of 100 reports that takes several minutes, we need a proper background job system, not threads."

### Q: How do you prevent SQL injection?
"SQLAlchemy parameterized queries. We never write raw SQL strings with user input. All user inputs go through Pydantic validation first, then into SQLAlchemy ORM queries as typed parameters. There is no point in our codebase where user input is directly interpolated into SQL."

### Q: Your WebSocket implementation — how secure is it?
"The WebSocket endpoint validates a JWT token passed as a query parameter. This is the standard approach since WebSocket clients cannot set custom headers during the initial handshake. The token is validated against our JWT secret, the user_id in the URL must match the sub claim in the token, and we verify the user exists and is active in the database before accepting the connection."

### Q: How does idempotency work in your CSV import?
"Each report gets a unique idempotency key. If the same CSV is uploaded twice, the database UNIQUE constraint on (site_id, idempotency_key) prevents duplicate records. The import task handles this gracefully — on duplicate key, it logs and skips rather than failing. This is critical for reliable ETL pipelines where network failures might cause retries."

---

## CATEGORY 3: Domain / Business Questions

### Q: What are IOGP Life-Saving Rules?
"IOGP stands for International Association of Oil and Gas Producers. They are the global industry body that sets safety standards for the oil and gas sector. Life-Saving Rules (LSRs) are 13 rules derived from analysis of fatalities across the industry — each rule addresses one common cause of fatalities. For example, LSR-01 covers confined space entry, LSR-02 covers energy isolation (lockout/tagout), LSR-03 covers working at height. Every major oil company — Shell, BP, Total, ONGC, OIL — follows these rules. Mapping reports to LSRs allows OIL to track which rules are being violated most frequently."

### Q: Who would actually use this system at OIL?
"The system has 5 roles mapped to OIL's organizational hierarchy. HSE Analysts submit and analyze reports — these are field-level safety staff. HSE Managers oversee multiple sites, review dashboard trends, approve corrective actions — these are department heads. Reviewers form the human-in-the-loop validation layer — experienced safety officers who review AI decisions. Admins manage the system, users, and data. Viewers are executive stakeholders who read reports and dashboards. Every workflow in the system is designed around how OIL's HSE department actually works."

### Q: How do you ensure AI doesn't make wrong life-or-death decisions?
"This is our core design principle: Advisory Only. The AI never takes autonomous action. Every CRITICAL and HIGH risk classification is automatically flagged for human review. The reviewer can approve, reject, or modify any AI decision. We store the original AI recommendation permanently — even if a human modifies it, the AI's original output is preserved for audit. This is called the 'human-in-the-loop' principle, and it's standard practice for AI in safety-critical domains."

### Q: What about reports in Hindi or regional languages?
"Currently we process English reports, which is OIL's primary reporting language. The transformer model can be extended to multilingual processing by switching to mBERT or XLM-RoBERTa as the base model. For regional languages, we'd add a translation layer (Google Translate API or IndicTrans for Indian languages) before the NLP pipeline. This is a known future enhancement, not a fundamental architectural change."

---

## CATEGORY 4: Scalability Questions

### Q: Can this handle OIL's data volume?
"OIL India files approximately 10,000 safety reports annually across all operations. Our current setup handles 10,000 reports per day — 365x their current annual volume. Even if OIL digitizes 20 years of historical reports and processes them all at once, our Celery batch processing can handle it in hours, not days."

### Q: What if OIL wants to add more sites?
"Sites are just database records. Adding a new site is: POST /api/v1/sites with name, code, location, region. No code changes required. All analytics, risk scoring, and pattern detection automatically include the new site."

### Q: What if OIL wants to integrate this with their existing SAP or Oracle system?
"Our API is a standard REST API with OpenAPI documentation. Any system that can make HTTP requests can integrate with us. SAP can push new reports via POST /api/v1/reports. We can send alerts back to SAP via webhooks. For database-level integration, we can set up a read replica or event streaming via PostgreSQL logical replication."

---

## CATEGORY 5: Competitive Questions

### Q: Why not use existing safety management software like Intelex or Cority?
"Existing safety management platforms are record-keeping systems — they store reports but don't analyze them. None of them have ML-powered SIF classification, causal reasoning graphs, counterfactual simulation, or AI-driven precursor pattern detection. We're not replacing a safety management system — we're adding an intelligence layer that those systems lack. We could also integrate with those systems as a plugin."

### Q: What makes this better than a simple keyword search?
"Keyword search would flag every report mentioning 'gas testing' — both the ones where it was done correctly and the ones where it failed. Our system understands context: 'gas testing was verified' is NOT a SIF indicator. 'Gas testing was not performed' IS a SIF indicator. The difference is semantic understanding, not keyword presence. We also detect patterns across thousands of reports, compute risk scores, build causal graphs, and generate actionable interventions — none of which keyword search can do."

---

## CATEGORY 6: Demo Questions

### Q: Is this live data or mocked data?
"This is live data in a real PostgreSQL database hosted on Neon cloud. The reports were generated from our synthetic dataset and processed through the actual ML pipeline. You can submit a new report right now and watch it get analyzed in real-time."

### Q: Can I test it with my own text?
"Absolutely. Go to the Analysis page. Paste any safety-related text. Click Analyze. The ML pipeline runs in real-time and returns the full analysis — SIF level, entity extraction, causal graph, risk score, interventions — all within 200 milliseconds."

---

## Numbers to Always Have Ready

| Question | Answer |
|----------|--------|
| Analysis time | < 200ms |
| ML accuracy | ~91% F1 (v4b transformer) |
| Throughput (current) | 20+ requests/sec |
| Risk score scale | 1-100 |
| LSR rules mapped | 13 |
| Activities detected | 14 |
| Hazards detected | 15 |
| Barriers detected | 17 |
| API endpoints | 60+ |
| DB tables | 13 |
| User roles | 5 |
| Training data size | ~5,000 reports |
| Confidence threshold | 62% (auto-review below this) |
| ML versions | 4 (v1 to v4b DistilBERT) |
