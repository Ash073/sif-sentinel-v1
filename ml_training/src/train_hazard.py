from .train_common import build_classifier

MODEL_NAME = "hazard_classifier"
TARGET = "hazard"

def train_hazard(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
