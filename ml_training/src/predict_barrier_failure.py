from .inference import predict

def predict_barrier_failure(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "barrier_failure_classifier", artifacts_root)
