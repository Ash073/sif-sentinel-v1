from .train_common import build_classifier

MODEL_NAME = "lsr_classifier"
TARGET = "life_saving_rule"

def train_lsr(x_train, y_train):
    return build_classifier().fit(x_train, y_train)
