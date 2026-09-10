from __future__ import annotations

from pathlib import Path

import pandas as pd

from .data_validation import REQUIRED_COLUMNS, load_and_validate


DEFAULT_DATASET = Path("data/raw/safety_reports.csv")


def load_dataset(path: str | Path = DEFAULT_DATASET) -> pd.DataFrame:
    """Load the immutable synthetic source dataset and enforce its contract."""
    return load_and_validate(Path(path))


__all__ = ["DEFAULT_DATASET", "REQUIRED_COLUMNS", "load_dataset"]
