from .train_common import build_classifier

MODEL_NAME = "barrier_status_classifier"
TARGET = "barrier_status"

def train_barrier_status(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
