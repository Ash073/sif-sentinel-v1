from __future__ import annotations

import re
import unicodedata
from typing import Iterable

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion


PREPROCESSING_VERSION = "synthetic_text_v1"
WHITESPACE_RE = re.compile(r"\s+")


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", str(value))
    text = text.replace("\x00", " ")
    return WHITESPACE_RE.sub(" ", text).strip()


def normalize_texts(values: Iterable[str]) -> list[str]:
    return [normalize_text(value) for value in values]


def build_preprocessing() -> FeatureUnion:
    word = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.995,
        sublinear_tf=True,
        lowercase=True,
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w[\w'-]+\b",
    )
    char = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=2,
        max_df=0.995,
        sublinear_tf=True,
        lowercase=True,
        strip_accents="unicode",
        max_features=75_000,
    )
    # Keep the serialized preprocessing artifact composed only of standard
    # scikit-learn estimators. Text normalization is deterministic and is
    # applied by both the training and standalone inference entry points.
    return FeatureUnion([("word", word), ("char", char)])
