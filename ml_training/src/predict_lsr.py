from .inference import predict

def predict_lsr(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "lsr_classifier", artifacts_root)
