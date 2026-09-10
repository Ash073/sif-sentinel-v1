from .inference import predict

def predict_barrier(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "barrier_classifier", artifacts_root)
