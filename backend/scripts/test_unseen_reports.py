import sys
sys.path.insert(0, ".")
from app.services.nlp.analysis_pipeline import AnalysisPipeline

pipeline = AnalysisPipeline()

test_cases = [
    {
        "title": "Case 1: Work at Height (Unseen Text)",
        "text": "Rigger was seen standing on a pipe rack 12 feet above ground with lanyard unclipped while fixing valve."
    },
    {
        "title": "Case 2: Confined Space (Unseen Text)",
        "text": "Contractor entered separator vessel without waiting for gas test clearance certificate."
    },
    {
        "title": "Case 3: Energy Isolation / LOTO (Unseen Text)",
        "text": "Technician opened electrical panel box with live 440V circuit without applying lock and tag."
    },
    {
        "title": "Case 4: Line of Fire / Suspended Load (Unseen Text)",
        "text": "Crew walked directly under suspended crane boom carrying heavy drill pipe during lift."
    },
    {
        "title": "Case 5: Non-SIF Minor Hazard (Unseen Text)",
        "text": "Small oil stain noticed on concrete walkway near workshop door, cleaned up with absorbent pad, no slipping incident."
    }
]

print("=" * 80)
print("TESTING REAL-WORLD UNSEEN SAFETY REPORTS AGAINST COMPLETE SIF SENTINEL PIPELINE")
print("=" * 80)

for tc in test_cases:
    res = pipeline.analyze_text(tc["text"])
    print(f"\n>>> {tc['title']}")
    print(f"Raw Text:        '{tc['text']}'")
    print(f"SIF Potential:    {res.sif_potential} (Level: {res.sif_level.value}, Probability: {res.sif_probability:.4f})")
    print(f"Life-Saving Rule: {res.life_saving_rule} (Confidence: {res.rule_confidence:.2f})")
    print(f"Activity:         {res.activity}")
    print(f"Hazard:           {res.hazard}")
    print(f"Barrier:          {res.barrier} (Status: {res.barrier_status})")
    risk_score = res.risk['score'] if res.risk else 'N/A'
    risk_priority = res.risk['priority'] if res.risk else 'N/A'
    print(f"Risk Score:       {risk_score} (Priority: {risk_priority})")
    print(f"Review Required:  {res.review_required} (Overall Confidence: {res.overall_confidence:.3f})")
    print(f"Explanation:      {res.explanation[:140]}...")
    if res.explainability_factors:
        print("Explainability Factors:")
        for factor in res.explainability_factors[:3]:
            print(f"  * {factor['name']}: {factor['contribution']} ({factor['direction']})")
