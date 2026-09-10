from __future__ import annotations

import hashlib
import math
import re
from collections import defaultdict
from typing import Any

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_selection import mutual_info_classif


STRUCTURED_COLUMNS = [
    "report_type", "activity", "hazard", "barrier", "barrier_status",
    "barrier_failure", "sif_level", "life_saving_rule", "source_type",
]
TARGET_COLUMNS = [
    "sif_potential", "activity", "hazard", "barrier", "barrier_status",
    "barrier_failure", "life_saving_rule",
]
NONWORD_RE = re.compile(r"[^a-z0-9]+")


def normalized_group_text(text: str) -> str:
    return NONWORD_RE.sub(" ", str(text).lower()).strip()


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        root_left, root_right = self.find(left), self.find(right)
        if root_left != root_right:
            self.parent[root_right] = root_left


def _feature_hash(feature: str) -> int:
    return int.from_bytes(hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest(), "big")


def _simhash(text: str) -> int:
    tokens = normalized_group_text(text).split()
    features = tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]
    weights = [0] * 64
    for feature in features:
        value = _feature_hash(feature)
        for bit in range(64):
            weights[bit] += 1 if value & (1 << bit) else -1
    signature = 0
    for bit, weight in enumerate(weights):
        if weight >= 0:
            signature |= 1 << bit
    return signature


def duplicate_groups(texts: list[str], max_hamming: int = 6) -> tuple[np.ndarray, dict[str, Any]]:
    """Group normalized exact and conservative lexical near duplicates.

    Eight 8-bit bands guarantee a shared band for pairs at Hamming distance <= 6.
    SimHash is an approximate lexical screen, not semantic adjudication.
    """
    normalized = [normalized_group_text(text) for text in texts]
    signatures = [_simhash(text) for text in texts]
    union = UnionFind(len(texts))
    exact: dict[str, int] = {}
    for index, text in enumerate(normalized):
        if text in exact:
            union.union(index, exact[text])
        else:
            exact[text] = index

    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)
    for index, signature in enumerate(signatures):
        for band in range(8):
            buckets[(band, (signature >> (band * 8)) & 0xFF)].append(index)

    checked: set[tuple[int, int]] = set()
    near_pairs = 0
    for members in buckets.values():
        for position, left in enumerate(members[:-1]):
            for right in members[position + 1:]:
                pair = (left, right) if left < right else (right, left)
                if pair in checked:
                    continue
                checked.add(pair)
                if normalized[left] == normalized[right]:
                    continue
                if (signatures[left] ^ signatures[right]).bit_count() <= max_hamming:
                    union.union(left, right)
                    near_pairs += 1

    roots = [union.find(index) for index in range(len(texts))]
    root_to_group = {root: idx for idx, root in enumerate(sorted(set(roots)))}
    group_ids = np.array([root_to_group[root] for root in roots], dtype=int)
    sizes = pd.Series(group_ids).value_counts()
    labels_by_group = defaultdict(set)
    report = {
        "normalization": "lowercase + non-alphanumeric collapse + whitespace trim",
        "simhash": "64-bit unigram+bigram SimHash, Hamming <= 6, exhaustive 8x8-bit band candidates",
        "exact_duplicate_row_count": int(pd.Series(normalized).duplicated(keep=False).sum()),
        "exact_duplicate_group_count": int((pd.Series(normalized).value_counts() > 1).sum()),
        "near_duplicate_pair_count": int(near_pairs),
        "total_split_groups": int(sizes.size),
        "multirow_split_groups": int((sizes > 1).sum()),
        "largest_split_group": int(sizes.max()),
    }
    return group_ids, report


def _entropy(counts: np.ndarray) -> float:
    probabilities = counts[counts > 0] / counts.sum()
    return float(-(probabilities * np.log2(probabilities)).sum())


def structured_leakage(frame: pd.DataFrame, target_column: str) -> dict[str, Any]:
    target = frame[target_column].fillna("<MISSING>").astype(str)
    _, target_codes = np.unique(target, return_inverse=True)
    base_entropy = _entropy(np.bincount(target_codes))
    results: dict[str, Any] = {}
    for column in STRUCTURED_COLUMNS:
        if column == target_column:
            continue
        values = frame[column].fillna("<MISSING>").astype(str)
        table = pd.crosstab(values, target, dropna=False)
        conditional = 0.0
        deterministic_values: list[str] = []
        correct = 0
        for value, row in table.iterrows():
            counts = row.to_numpy(dtype=int)
            conditional += (counts.sum() / len(frame)) * _entropy(counts)
            correct += int(counts.max())
            if (counts > 0).sum() == 1:
                deterministic_values.append(str(value))
        results[column] = {
            "unique_values": int(values.nunique()),
            "weighted_majority_accuracy": float(correct / len(frame)),
            "conditional_entropy_bits": float(conditional),
            "mutual_information_bits": float(base_entropy - conditional),
            "all_values_deterministic": len(deterministic_values) == values.nunique(),
            "deterministic_values": deterministic_values,
            "cross_tab": {
                str(value): {str(label): int(count) for label, count in row.items()}
                for value, row in table.iterrows()
            },
        }
    return results


def text_template_audit(frame: pd.DataFrame, random_seed: int) -> dict[str, Any]:
    texts = frame["report_text"].astype(str).tolist()
    target = frame["sif_potential"].astype(int).to_numpy()
    vectorizer = CountVectorizer(
        lowercase=True,
        binary=True,
        ngram_range=(1, 3),
        min_df=10,
        max_features=50_000,
    )
    matrix = vectorizer.fit_transform(texts)
    scores = mutual_info_classif(
        matrix,
        target,
        discrete_features=True,
        random_state=random_seed,
    )
    names = vectorizer.get_feature_names_out()
    top_indices = np.argsort(scores)[-50:][::-1]
    top: list[dict[str, Any]] = []
    positive = target == 1
    for index in top_indices:
        present = matrix[:, index].toarray().ravel().astype(bool)
        top.append(
            {
                "ngram": str(names[index]),
                "mutual_information": float(scores[index]),
                "positive_presence_rate": float(present[positive].mean()),
                "negative_presence_rate": float(present[~positive].mean()),
            }
        )
    suffixes = [
        "corrective action has been requested",
        "supervisor was notified on the spot",
        "work was stopped immediately",
        "area has since been addressed",
        "this has been flagged to the site hse team",
        "no injury occurred",
    ]
    suffix_report = {}
    lowered = frame["report_text"].astype(str).str.lower()
    for phrase in suffixes:
        present = lowered.str.contains(phrase, regex=False)
        suffix_report[phrase] = {
            "rows": int(present.sum()),
            "SIF": int((present & frame["sif_potential"]).sum()),
            "NON_SIF": int((present & ~frame["sif_potential"]).sum()),
        }
    return {
        "top_label_associated_ngrams": top,
        "generator_suffix_distribution": suffix_report,
        "interpretation": (
            "Strong n-gram association is expected in templated synthetic data and can inflate held-out metrics even after exact deduplication."
        ),
    }


def run_leakage_audit(frame: pd.DataFrame, random_seed: int = 20260909) -> tuple[np.ndarray, dict[str, Any]]:
    groups, duplicate_report = duplicate_groups(frame["report_text"].astype(str).tolist())
    labels_per_group = pd.DataFrame({"group": groups, "label": frame["sif_potential"].astype(int)}).groupby("group")["label"].nunique()
    duplicate_report["groups_with_label_conflicts"] = int((labels_per_group > 1).sum())
    report = {
        "structured_column_leakage_by_target": {
            target: structured_leakage(frame, target) for target in TARGET_COLUMNS
        },
        "text_template_leakage": text_template_audit(frame, random_seed),
        "duplicate_and_near_duplicate_audit": duplicate_report,
        "excluded_model_features": [
            "id", "report_type", "activity", "hazard", "barrier", "barrier_status",
            "barrier_failure", "sif_level", "life_saving_rule", "source_type",
        ],
        "allowed_model_features": ["report_text"],
        "severity": "SEVERE",
        "conclusion": (
            "Across the seven targets, structured labels deterministically or strongly encode downstream targets, and report_text is generated from label-specific templates. "
            "Only report_text is permitted, duplicate groups must be isolated, and all performance is prototype-only."
        ),
    }
    return groups, report
