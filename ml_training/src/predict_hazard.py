from .inference import predict

def predict_hazard(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "hazard_classifier", artifacts_root)
