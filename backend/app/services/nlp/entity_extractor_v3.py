import httpx
from typing import List, Optional
from app.services.nlp.preprocessing import PreprocessedText
from app.services.nlp.entity_extractor import ExtractedEntities, BarrierStatus, _extract_evidence

def extract_entities_v3(document: PreprocessedText) -> ExtractedEntities:
    from app.services.nlp.entity_extractor import extract_entities as fallback_extract
    base_entities = fallback_extract(document)
    
    act_str = base_entities.activity
    haz_str = base_entities.hazard
    bar_str = base_entities.barrier
    all_acts = list(base_entities.all_activities)
    all_hazs = list(base_entities.all_hazards)
    all_bars = list(base_entities.all_barriers)
    confidence = base_entities.confidence
    
    try:
        response = httpx.post("http://localhost:8001/extract/entities", json={"text": document.normalized_text}, timeout=10.0)
        if response.status_code == 200:
            data = response.json()
            v3_acts = data.get("activities", [])
            v3_hazs = data.get("hazards", [])
            v3_bars = data.get("barriers", [])
            
            # Prefer canonical V2 strings for the primary slots if available
            if not act_str and v3_acts:
                act_str = v3_acts[0]
            if not haz_str and v3_hazs:
                haz_str = v3_hazs[0]
            if not bar_str and v3_bars:
                bar_str = v3_bars[0]
                
            all_acts = all_acts + [a for a in v3_acts if a not in all_acts]
            all_hazs = all_hazs + [h for h in v3_hazs if h not in all_hazs]
            all_bars = all_bars + [b for b in v3_bars if b not in all_bars]
            
            if v3_acts or v3_hazs or v3_bars:
                confidence = min(1.0, confidence + 0.15)
    except Exception:
        pass
        
    return ExtractedEntities(
        activity=act_str, hazard=haz_str, barrier=bar_str,
        barrier_status=base_entities.barrier_status, barrier_failure=base_entities.barrier_failure,
        confidence=round(confidence, 3), matched_terms=base_entities.matched_terms,
        all_activities=all_acts, all_hazards=all_hazs, all_barriers=all_bars
    )
