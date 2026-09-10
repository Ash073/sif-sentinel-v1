from .inference import predict

def predict_barrier_status(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "barrier_status_classifier", artifacts_root)
