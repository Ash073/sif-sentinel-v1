import csv
import sys
sys.path.insert(0, ".")
from app.services.nlp.analysis_pipeline import AnalysisPipeline

pipeline = AnalysisPipeline()
with open("../data/raw/safety_reports.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))[:30]

print("=== Comparing Ground Truth vs Rule Mapper ===")
for i, r in enumerate(rows):
    res = pipeline.analyze_text(r["report_text"])
    gt = (r["life_saving_rule"] or "").strip()
    pred = (res.life_saving_rule or "").strip()
    if gt != pred:
        print(f"[{i}] GT: '{gt}' | PRED: '{pred}'")
        print(f"     Text: {r['report_text'][:80]}...")
