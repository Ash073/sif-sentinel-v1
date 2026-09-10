# Exact Backend Team Delivery — v1

Deliver these files and directories without modification:

1. `artifacts/checksums.sha256`
2. `artifacts/sif_classifier/v1/` (all five files)
3. `artifacts/activity_classifier/v1/` (all four files)
4. `artifacts/hazard_classifier/v1/` (all four files)
5. `artifacts/barrier_classifier/v1/` (all four files)
6. `artifacts/barrier_status_classifier/v1/` (all four files)
7. `artifacts/barrier_failure_classifier/v1/` (all four files)
8. `artifacts/lsr_classifier/v1/` (all four files)
9. `artifacts/semantic_retrieval/v1/` (all four files)
10. `src/__init__.py`
11. `src/inference.py`
12. `src/predict_sif.py`
13. `src/predict_activity.py`
14. `src/predict_hazard.py`
15. `src/predict_barrier.py`
16. `src/predict_barrier_status.py`
17. `src/predict_barrier_failure.py`
18. `src/predict_lsr.py`
19. `src/predict_retrieval.py`
20. `analyze_text.py`
21. `BACKEND_ML_INTEGRATION_CONTRACT.md`
22. `requirements.txt`

The training modules, notebook, source CSV, split manifest, and reports are audit/reproduction deliverables; the backend runtime does not need them. Verify every artifact against `checksums.sha256` before loading. Do not deserialize artifacts received from any untrusted source.
