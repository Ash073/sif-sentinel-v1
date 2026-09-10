from .inference import predict

def predict_sif(report_text: str, artifacts_root="ml_training/artifacts") -> dict:
    return predict(report_text, "sif_classifier", artifacts_root)
