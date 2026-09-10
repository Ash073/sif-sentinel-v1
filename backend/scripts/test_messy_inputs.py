import sys
sys.path.insert(0, ".")
from app.services.nlp.analysis_pipeline import AnalysisPipeline

pipeline = AnalysisPipeline()

messy_reports = [
    "guy on rig 4 slip on oily pipe no helmet",
    "technician workin at 10m height harnes not hookd",
    "chcked gas level in tank was safe all clear",
    "crane cable look rusty and snapping while lifting heavy engine",
    "routine inspection completed everything normal"
]

print("=" * 75)
print("TESTING REALISTIC MESSY / TYPO-RIDDEN HUMAN INPUTS")
print("=" * 75)
for t in messy_reports:
    res = pipeline.analyze_text(t)
    print(f"\nRaw Input:        '{t}'")
    print(f"SIF Potential:    {res.sif_potential} (Prob: {res.sif_probability:.3f}, Level: {res.sif_level.value})")
    print(f"Life-Saving Rule: {res.life_saving_rule} (Conf: {res.rule_confidence:.2f})")
    print(f"Entities:         Act: '{res.activity}' | Haz: '{res.hazard}' | Bar: '{res.barrier}'")
    print(f"Review Required:  {res.review_required} (Overall Conf: {res.overall_confidence:.2f})")
