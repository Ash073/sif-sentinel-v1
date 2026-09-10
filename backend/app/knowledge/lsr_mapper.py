import joblib
from dataclasses import dataclass
from pathlib import Path

from app.knowledge.taxonomy import life_saving_rules
from app.services.nlp.evidence_model import EvidenceType, StructuredEvidence

_LSR_MODEL = None
_LSR_VEC = None
_LSR_LOADED = False


def _load_lsr_model():
    global _LSR_MODEL, _LSR_VEC, _LSR_LOADED
    if _LSR_LOADED:
        return
    _LSR_LOADED = True
    base_dir = Path(__file__).parents[3] / "artifacts" / "models" / "v2"
    model_path = base_dir / "lsr_model.joblib"
    vec_path = base_dir / "lsr_vectorizer.joblib"
    if model_path.exists() and vec_path.exists():
        try:
            _LSR_MODEL = joblib.load(model_path)
            _LSR_VEC = joblib.load(vec_path)
        except Exception:
            _LSR_MODEL = None
            _LSR_VEC = None


@dataclass(frozen=True)
class RuleMatch:
    rule: str | None
    confidence: float
    matched_signals: list[str]


def map_to_life_saving_rule(activity: str | None, hazard: str | None, barrier: str | None, barrier_failure: str | None, text: str, structured_evidence: StructuredEvidence = None) -> RuleMatch:
    _load_lsr_model()
    if _LSR_MODEL is not None and _LSR_VEC is not None:
        try:
            vec_x = _LSR_VEC.transform([text])
            probs = _LSR_MODEL.predict_proba(vec_x)[0]
            max_idx = probs.argmax()
            pred_class = _LSR_MODEL.classes_[max_idx]
            max_prob = float(probs[max_idx])
            if pred_class != "NONE" and max_prob >= 0.35:
                return RuleMatch(pred_class, round(max_prob, 3), [f"ml_confidence:{max_prob:.3f}"])
        except Exception:
            pass

    normalized = text.lower()
    candidates: list[tuple[float, str, list[str]]] = []
    
    for rule in life_saving_rules():
        signals: list[str] = []
        if activity and activity in rule["activities"]:
            signals.append(f"activity:{activity}")
        if hazard and hazard in rule["hazards"]:
            signals.append(f"hazard:{hazard}")
        if barrier and barrier in rule["barriers"]:
            signals.append(f"barrier:{barrier}")
            
        signals.extend(f"keyword:{word}" for word in rule["keywords"] if word in normalized)
        signals.extend(f"failure:{phrase}" for phrase in rule["failure_patterns"] if phrase in normalized)
        
        # If we have structured evidence, we should apply stricter mapping constraints.
        # Only map to the LSR if the control explicitly failed, or is missing/not_verified.
        # If the control is explicitly verified, do not add a strong failure signal.
        if structured_evidence:
            controls = structured_evidence.get_by_type(EvidenceType.CONTROL)
            for ctrl in controls:
                if ctrl.normalized_concept in rule["barriers"]:
                    if ctrl.verification_status in ("failed", "not verified", "not performed", "missing", "bypassed", "expired"):
                        signals.append(f"structured_failure:{ctrl.verification_status}")
                        
        score = min(1.0, 0.16 * len(signals))
        
        if structured_evidence:
            if any(signal.startswith("structured_failure:") for signal in signals):
                score = min(1.0, score + 0.12)
        elif barrier_failure and any(signal.startswith("failure:") for signal in signals):
            score = min(1.0, score + 0.12)
            
        if score:
            candidates.append((score, rule["name"], signals))
            
    if not candidates:
        return RuleMatch(None, 0.0, [])
        
    score, rule, signals = max(candidates, key=lambda item: item[0])
    if score < 0.32:
        return RuleMatch(None, 0.0, [])
        
    return RuleMatch(rule, round(score, 3), signals)
