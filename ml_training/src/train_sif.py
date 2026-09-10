from .train_common import build_classifier

MODEL_NAME = "sif_classifier"
TARGET = "sif_potential"

def train_sif(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
