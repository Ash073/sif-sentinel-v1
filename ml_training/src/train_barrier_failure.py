from .train_common import build_classifier

MODEL_NAME = "barrier_failure_classifier"
TARGET = "barrier_failure"

def train_barrier_failure(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
