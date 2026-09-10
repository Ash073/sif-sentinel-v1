from .train_common import build_classifier

MODEL_NAME = "barrier_classifier"
TARGET = "barrier"

def train_barrier(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
