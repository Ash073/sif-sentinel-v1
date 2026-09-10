from .inference import predict

def predict_activity(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "activity_classifier", artifacts_root)
