from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import joblib
import json
import os
from pathlib import Path
import warnings
from transformers import pipeline, AutoModelForTokenClassification, AutoTokenizer

app = FastAPI(title="SIF Sentinel ML Engine")

# -------------- V2 SIF CLASSIFIER --------------
class SIFPrediction(BaseModel):
    sif_potential: bool
    probability: float
    sif_level: str
    model_name: str
    model_version: str
    predictive_terms: List[str]
    explainability_factors: List[Dict[str, Any]]

_sif_model = None
_sif_vectorizer = None
_sif_metadata = {}
_sif_threshold = 0.5

def load_sif_v2():
    global _sif_model, _sif_vectorizer, _sif_metadata, _sif_threshold
    try:
        base_dir = Path(__file__).parent.parent.parent / "artifacts" / "models" / "v2"
        model_path = base_dir / "model" / "sif_model.joblib"
        vectorizer_path = base_dir / "vectorizer" / "tfidf.joblib"
        metadata_path = base_dir / "metadata.json"
        threshold_path = base_dir / "threshold.json"
        
        if not model_path.exists():
            return
            
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _sif_model = joblib.load(model_path)
            _sif_vectorizer = joblib.load(vectorizer_path) if vectorizer_path.exists() else None
            
        if metadata_path.exists():
            _sif_metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if threshold_path.exists():
            th_data = json.loads(threshold_path.read_text(encoding="utf-8"))
            _sif_threshold = float(th_data.get("selected_threshold", 0.50))
    except Exception as e:
        print("Failed to load V2 model:", e)

# -------------- V3 NER EXTRACTOR --------------
_ner_pipeline = None

def load_ner_v3():
    global _ner_pipeline
    try:
        model_dir = Path(__file__).parent.parent.parent / "sif_safety_entity_extractor_v3"
        if not model_dir.exists():
            return
            
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
            model = AutoModelForTokenClassification.from_pretrained(str(model_dir))
            _ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")
    except Exception as e:
        print("Failed to load V3 model:", e)

# Initialize on startup
@app.on_event("startup")
async def startup_event():
    load_sif_v2()
    load_ner_v3()

# -------------- ENDPOINTS --------------

class PredictRequest(BaseModel):
    text: str

def level_for_probability(probability: float, threshold: float = 0.50) -> str:
    if probability < threshold:
        if probability >= (threshold - 0.08):
            return "REVIEW"
        return "NON_SIF"
    sif_range = 1.0 - threshold
    relative = (probability - threshold) / sif_range if sif_range > 0 else 1.0
    if relative >= 0.60:
        return "HIGH"
    if relative >= 0.25:
        return "MEDIUM"
    return "LOW"

@app.post("/predict/sif", response_model=SIFPrediction)
async def predict_sif(req: PredictRequest):
    if not _sif_model or not _sif_vectorizer:
        raise HTTPException(status_code=503, detail="V2 model not loaded")
        
    text = req.text.lower().strip()
    transformed = _sif_vectorizer.transform([text])
    probability = float(_sif_model.predict_proba(transformed)[0][1])
    is_sif = probability >= _sif_threshold
    
    top_terms = []
    explain_factors = []
    
    if hasattr(_sif_model, "coef_"):
        feature_names = _sif_vectorizer.get_feature_names_out()
        coefficients = _sif_model.coef_[0]
        non_zero_indices = transformed.nonzero()[1]
        
        contributions = [
            (feature_names[i], float(transformed[0, i] * coefficients[i]))
            for i in non_zero_indices
        ]
        sorted_contribs = sorted(contributions, key=lambda x: abs(x[1]), reverse=True)
        top_terms = [term for term, contrib in sorted(contributions, key=lambda x: x[1], reverse=True) if contrib > 0][:3]
        explain_factors = [
            {
                "name": f"ML Feature: {term}",
                "contribution": round(contrib, 3),
                "source": "MODEL",
                "direction": "INCREASES" if contrib > 0 else "DECREASES",
            }
            for term, contrib in sorted_contribs
            if abs(contrib) > 0.001
        ][:5]

    return SIFPrediction(
        sif_potential=is_sif,
        probability=round(probability, 4),
        sif_level=level_for_probability(probability, _sif_threshold),
        model_name=_sif_metadata.get("model_name", "sif-classifier-v2"),
        model_version=_sif_metadata.get("model_version", "v2"),
        predictive_terms=top_terms,
        explainability_factors=explain_factors
    )

class ExtractResponse(BaseModel):
    activities: List[str]
    hazards: List[str]
    barriers: List[str]

@app.post("/extract/entities", response_model=ExtractResponse)
async def extract_entities(req: PredictRequest):
    if not _ner_pipeline:
        raise HTTPException(status_code=503, detail="V3 NER model not loaded")
        
    results = _ner_pipeline(req.text)
    acts, hazs, bars = [], [], []
    
    for ent in results:
        group = ent.get('entity_group', '')
        word = ent.get('word', '').strip()
        if not word: continue
        if group == 'ACTIVITY': acts.append(word)
        elif group == 'HAZARD': hazs.append(word)
        elif group == 'BARRIER': bars.append(word)
        
    return ExtractResponse(activities=acts, hazards=hazs, barriers=bars)

@app.get("/health")
async def health():
    return {"status": "ok", "v2_loaded": _sif_model is not None, "v3_loaded": _ner_pipeline is not None}
