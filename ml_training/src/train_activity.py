from .train_common import build_classifier

MODEL_NAME = "activity_classifier"
TARGET = "activity"

def train_activity(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
