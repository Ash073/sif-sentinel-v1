"""Reproducible, read-only audit of the two real OSHA source CSVs.

This script deliberately does not clean, transform, split, or train on the data.
It writes descriptive JSON used by the accompanying design report.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HSE = ROOT / "Dump" / "csv files" / "OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL.csv"
DEFAULT_OSHA = ROOT / "data" / "raw" / "January2015toNovember2025.csv"
TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z'-]{1,}")
SPACE_RE = re.compile(r"\s+")
NONWORD_RE = re.compile(r"[^a-z0-9]+")


def scalar(value: Any) -> Any:
    if value is None or value is pd.NA:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        if math.isnan(float(value)):
            return None
        return float(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return str(value)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def decode_probe(path: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    bom = "none"
    if raw.startswith(b"\xef\xbb\xbf"):
        bom = "utf-8-sig"
    elif raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        bom = "utf-16"
    result: dict[str, Any] = {
        "bom": bom,
        "nul_bytes": raw.count(b"\x00"),
        "replacement_character_bytes_utf8": raw.count(b"\xef\xbf\xbd"),
    }
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            raw.decode(encoding, errors="strict")
            result["strict_decode"] = encoding
            break
        except UnicodeDecodeError as exc:
            result.setdefault("decode_failures", {})[encoding] = {
                "start": exc.start,
                "reason": exc.reason,
            }
    return result


def read_csv(path: Path) -> tuple[pd.DataFrame, str]:
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return pd.read_csv(path, encoding=encoding, low_memory=False), encoding
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"Unable to decode {path}")


def normalized_text(series: pd.Series) -> pd.Series:
    return (
        series.fillna("")
        .astype(str)
        .str.lower()
        .str.replace(NONWORD_RE, " ", regex=True)
        .str.replace(SPACE_RE, " ", regex=True)
        .str.strip()
    )


def conservative_near_duplicate_profile(series: pd.Series) -> dict[str, Any]:
    """Estimate near duplicates with 64-bit token SimHash and Hamming distance <= 3.

    Four 16-bit bands make the candidate search exhaustive for this Hamming
    threshold. SimHash itself remains an approximation of lexical similarity,
    so the result is explicitly reported as a conservative candidate count.
    """
    texts = normalized_text(series).tolist()
    hash_cache: dict[str, int] = {}
    bit_values = np.arange(16, dtype=np.uint16)
    words16 = np.arange(65536, dtype=np.uint16)[:, None]
    bit_table = np.where((words16 >> bit_values) & 1, 1, -1).astype(np.int16)

    def feature_hash(feature: str) -> int:
        value = hash_cache.get(feature)
        if value is None:
            value = int.from_bytes(hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest(), "big")
            hash_cache[feature] = value
        return value

    signatures: list[int] = []
    for text in texts:
        tokens = text.split()
        features = tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]
        hashes = np.array([feature_hash(feature) for feature in features], dtype=np.uint64)
        signature = 0
        for band in range(4):
            chunks = ((hashes >> np.uint64(band * 16)) & np.uint64(0xFFFF)).astype(np.uint16)
            weights = bit_table[chunks].sum(axis=0) if len(chunks) else np.zeros(16, dtype=int)
            for bit, weight in enumerate(weights):
                if weight >= 0:
                    signature |= 1 << (band * 16 + bit)
        signatures.append(signature)

    buckets: dict[tuple[int, int], list[int]] = {}
    for index, signature in enumerate(signatures):
        for band in range(4):
            key = (band, (signature >> (band * 16)) & 0xFFFF)
            buckets.setdefault(key, []).append(index)

    seen: set[tuple[int, int]] = set()
    participating: set[int] = set()
    pair_count = 0
    for members in buckets.values():
        if len(members) < 2:
            continue
        for left_pos in range(len(members) - 1):
            left = members[left_pos]
            for right in members[left_pos + 1:]:
                pair = (left, right)
                if pair in seen:
                    continue
                seen.add(pair)
                if not texts[left] or texts[left] == texts[right]:
                    continue
                if (signatures[left] ^ signatures[right]).bit_count() <= 3:
                    pair_count += 1
                    participating.update(pair)
    return {
        "method": "64-bit unigram+bigram SimHash; exhaustive 4x16-bit band candidates; Hamming <= 3; excludes normalized exact duplicates",
        "candidate_pair_count": pair_count,
        "participating_row_count": len(participating),
        "interpretation": "Conservative lexical near-duplicate candidates, not adjudicated semantic duplicates.",
    }


def distribution(series: pd.Series, limit: int | None = None) -> dict[str, int]:
    counts = series.value_counts(dropna=False)
    if limit is not None:
        counts = counts.head(limit)
    return {"<MISSING>" if pd.isna(k) else str(k): int(v) for k, v in counts.items()}


def column_profile(series: pd.Series) -> dict[str, Any]:
    nonnull = series.dropna()
    profile: dict[str, Any] = {
        "pandas_dtype": str(series.dtype),
        "missing_count": int(series.isna().sum()),
        "missing_pct": round(float(series.isna().mean() * 100), 4),
        "unique_non_null": int(nonnull.nunique(dropna=True)),
    }
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
        strings = nonnull.astype(str)
        stripped = strings.str.strip()
        profile.update(
            {
                "empty_or_whitespace_count": int(stripped.eq("").sum()),
                "leading_or_trailing_whitespace_count": int(strings.ne(stripped).sum()),
                "casefold_collisions": int(stripped.nunique() - stripped.str.casefold().nunique()),
                "numeric_like_count": int(pd.to_numeric(stripped, errors="coerce").notna().sum()),
                "length_min": int(strings.str.len().min()) if len(strings) else None,
                "length_max": int(strings.str.len().max()) if len(strings) else None,
            }
        )
        if nonnull.nunique() <= 100:
            profile["value_counts"] = distribution(series)
        elif nonnull.nunique() <= 500:
            profile["top_50_values"] = distribution(series, 50)
    else:
        numeric = pd.to_numeric(nonnull, errors="coerce")
        if len(numeric):
            profile["numeric_summary"] = {
                q: scalar(v)
                for q, v in numeric.describe(percentiles=[0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]).items()
            }
    return profile


def text_profile(series: pd.Series) -> dict[str, Any]:
    valid = series.dropna().astype(str)
    chars = valid.str.len()
    words = valid.str.findall(TOKEN_RE).str.len()
    normalized = normalized_text(series)
    normalized_nonempty = normalized[normalized.ne("")]
    tokens: Counter[str] = Counter()
    for text in valid:
        tokens.update(token.lower() for token in TOKEN_RE.findall(text))
    mojibake_markers = ("Ã", "Â", "â€", "ï¿½", "�")
    return {
        "non_null_count": int(len(valid)),
        "blank_after_strip_count": int(valid.str.strip().eq("").sum()),
        "character_length": {
            q: scalar(v)
            for q, v in chars.describe(percentiles=[0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]).items()
        },
        "word_length": {
            q: scalar(v)
            for q, v in words.describe(percentiles=[0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]).items()
        },
        "raw_duplicate_nonempty_rows": int(valid.duplicated(keep=False).sum()),
        "raw_duplicate_nonempty_groups": int(valid[valid.duplicated(keep=False)].nunique()),
        "normalized_duplicate_nonempty_rows": int(normalized_nonempty.duplicated(keep=False).sum()),
        "normalized_duplicate_nonempty_groups": int(
            normalized_nonempty[normalized_nonempty.duplicated(keep=False)].nunique()
        ),
        "vocabulary_size_casefolded": int(len(tokens)),
        "hapax_tokens": int(sum(count == 1 for count in tokens.values())),
        "top_100_tokens": dict(tokens.most_common(100)),
        "non_ascii_rows": int(valid.str.contains(r"[^\x00-\x7F]", regex=True).sum()),
        "mojibake_suspect_rows": int(
            valid.map(lambda text: any(marker in text for marker in mojibake_markers)).sum()
        ),
        "near_duplicates": conservative_near_duplicate_profile(series),
    }


def date_profile(series: pd.Series) -> dict[str, Any]:
    parsed = pd.to_datetime(series, errors="coerce")
    years = parsed.dt.year
    return {
        "parsed_count": int(parsed.notna().sum()),
        "unparseable_non_null_count": int((series.notna() & parsed.isna()).sum()),
        "min": scalar(parsed.min()),
        "max": scalar(parsed.max()),
        "future_after_audit_date_count": int((parsed > pd.Timestamp("2026-09-09")).sum()),
        "year_distribution": {str(int(k)): int(v) for k, v in years.value_counts().sort_index().items()},
    }


def numeric_rule(series: pd.Series, *, minimum: float | None = None, maximum: float | None = None) -> dict[str, Any]:
    numeric = pd.to_numeric(series, errors="coerce")
    out = {
        "non_null_count": int(series.notna().sum()),
        "non_numeric_non_null_count": int((series.notna() & numeric.isna()).sum()),
        "min": scalar(numeric.min()),
        "max": scalar(numeric.max()),
    }
    if minimum is not None:
        out["below_minimum_count"] = int((numeric < minimum).sum())
    if maximum is not None:
        out["above_maximum_count"] = int((numeric > maximum).sum())
    return out


def outcome_count_rule(series: pd.Series) -> dict[str, Any]:
    numeric = pd.to_numeric(series, errors="coerce")
    return {
        "distribution": distribution(series),
        "non_numeric_non_null_count": int((series.notna() & numeric.isna()).sum()),
        "negative_count": int((numeric < 0).sum()),
        "non_integer_count": int((numeric.notna() & numeric.mod(1).ne(0)).sum()),
        "zero_count": int(numeric.eq(0).sum()),
        "positive_count": int(numeric.gt(0).sum()),
    }


def audit_dataset(
    name: str,
    path: Path,
    text_columns: list[str],
    date_column: str,
    categorical_columns: list[str],
) -> tuple[dict[str, Any], pd.DataFrame]:
    frame, encoding = read_csv(path)
    existing_text = [column for column in text_columns if column in frame]
    report: dict[str, Any] = {
        "name": name,
        "path": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "encoding_used": encoding,
        "encoding_probe": decode_probe(path),
        "row_count": int(len(frame)),
        "column_count": int(len(frame.columns)),
        "column_names": list(frame.columns),
        "duplicate_rows": int(frame.duplicated().sum()),
        "duplicate_rows_including_all_members": int(frame.duplicated(keep=False).sum()),
        "columns": {column: column_profile(frame[column]) for column in frame.columns},
        "categorical_distributions": {
            column: distribution(frame[column])
            for column in categorical_columns
            if column in frame
        },
        "text": {column: text_profile(frame[column]) for column in existing_text},
        "date": date_profile(frame[date_column]),
    }
    combined = frame[existing_text].fillna("").astype(str).agg(" ".join, axis=1)
    report["combined_text"] = text_profile(combined)
    return report, frame


def hse_rules(frame: pd.DataFrame) -> dict[str, Any]:
    rules: dict[str, Any] = {}
    for column in ("build_stor", "proj_cost", "task_assigned", "fall_ht"):
        rules[column] = numeric_rule(frame[column], minimum=0)
    code_label_pairs = [
        ("con_end", "Construction End Use"),
        ("build_stor", "Building Stories"),
        ("proj_cost", "Project Cost"),
        ("proj_type", "Project Type"),
        ("nature_of_inj", "Nature of Injury"),
        ("part_of_body", "Part of Body"),
        ("event_type", "Event type"),
        ("evn_factor", "Environmental Factor"),
        ("hum_factor", "Human Factor"),
    ]
    inconsistencies: dict[str, Any] = {}
    for code, label in code_label_pairs:
        pairs = frame[[code, label]].dropna()
        code_to_labels = pairs.groupby(code)[label].nunique()
        label_to_codes = pairs.groupby(label)[code].nunique()
        inconsistencies[f"{code}__{label}"] = {
            "codes_mapping_to_multiple_labels": int((code_to_labels > 1).sum()),
            "labels_mapping_to_multiple_codes": int((label_to_codes > 1).sum()),
            "rows_with_only_one_of_code_or_label": int(frame[code].isna().ne(frame[label].isna()).sum()),
        }
    rules["code_label_consistency"] = inconsistencies
    degree = frame["Degree of Injury"].astype("string")
    rules["degree_of_injury"] = {
        "distribution": distribution(frame["Degree of Injury"]),
        "exact_fatal_count": int(degree.str.fullmatch("Fatal", case=False, na=False).sum()),
    }
    rules["duplicate_summary_nr"] = {
        str(k): int(v) for k, v in frame["summary_nr"].value_counts().items() if v > 1
    }
    return rules


def osha_rules(frame: pd.DataFrame) -> dict[str, Any]:
    rules: dict[str, Any] = {
        column: outcome_count_rule(frame[column])
        for column in ("Hospitalized", "Amputation", "Loss of Eye")
    }
    rules["Latitude"] = numeric_rule(frame["Latitude"], minimum=-90, maximum=90)
    rules["Longitude"] = numeric_rule(frame["Longitude"], minimum=-180, maximum=180)
    rules["Zip"] = {
        "non_null_count": int(frame["Zip"].notna().sum()),
        "note": "Default inference converts ZIP to float because of missing values; read as string to preserve leading zeros.",
    }
    code_label_pairs = [
        ("Nature", "NatureTitle"),
        ("Part of Body", "Part of Body Title"),
        ("Event", "EventTitle"),
        ("Source", "SourceTitle"),
        ("Secondary Source", "Secondary Source Title"),
    ]
    inconsistencies: dict[str, Any] = {}
    for code, label in code_label_pairs:
        pairs = frame[[code, label]].dropna()
        code_to_labels = pairs.groupby(code)[label].nunique()
        label_to_codes = pairs.groupby(label)[code].nunique()
        inconsistencies[f"{code}__{label}"] = {
            "codes_mapping_to_multiple_labels": int((code_to_labels > 1).sum()),
            "labels_mapping_to_multiple_codes": int((label_to_codes > 1).sum()),
            "rows_with_only_one_of_code_or_label": int(frame[code].isna().ne(frame[label].isna()).sum()),
        }
    rules["code_label_consistency"] = inconsistencies
    outcome = frame[["Hospitalized", "Amputation", "Loss of Eye"]].apply(pd.to_numeric, errors="coerce")
    severe = outcome.gt(0).any(axis=1)
    combo = outcome.fillna(-1).astype(int).astype(str).agg("/".join, axis=1)
    rules["derived_outcome_targets"] = {
        "any_recorded_severe_outcome": {"0": int((~severe).sum()), "1": int(severe.sum())},
        "outcome_combination_H_A_E": distribution(combo),
        "all_three_outcomes_missing": int(outcome.isna().all(axis=1).sum()),
    }
    rules["duplicate_ID"] = {
        str(k): int(v) for k, v in frame["ID"].value_counts().items() if v > 1
    }
    return rules


def target_cross_tabs(hse: pd.DataFrame, osha: pd.DataFrame) -> dict[str, Any]:
    outcome = osha[["Hospitalized", "Amputation", "Loss of Eye"]].apply(pd.to_numeric, errors="coerce")
    severe = outcome.gt(0).any(axis=1).astype(int)
    osha_text = osha["Final Narrative"].fillna("").astype(str)
    hse_text = hse[["Abstract Text", "Event Description", "Event Keywords"]].fillna("").agg(" ".join, axis=1)
    leakage_patterns = {
        "Hospitalized": r"\bhospitali[sz](?:e|ed|ation)\b|\badmitted\b",
        "Amputation": r"\bamputat(?:e|ed|ion|ions)\b|\bamputee\b|\bsevered\b",
        "Loss of Eye": r"\bloss of (?:an? |the )?eye\b|\blost (?:an? |the )?eye\b|\benucleat",
    }
    outcome_leakage: dict[str, Any] = {}
    for column, pattern in leakage_patterns.items():
        mentioned = osha_text.str.contains(pattern, case=False, regex=True, na=False)
        positive = outcome[column].gt(0)
        outcome_leakage[column] = {
            "target_positive_rows": int(positive.sum()),
            "narrative_mentions_outcome_rows": int(mentioned.sum()),
            "target_positive_and_mentioned": int((positive & mentioned).sum()),
            "target_negative_and_mentioned": int((~positive & mentioned).sum()),
        }
    fatal = hse["Degree of Injury"].eq("Fatal")
    fatal_mentioned = hse_text.str.contains(r"\bkilled\b|\bdied\b|\bdeath\b|\bfatal(?:ity|ly)?\b", case=False, regex=True)
    result: dict[str, Any] = {
        "osha": {
            "Hospitalized": distribution(osha["Hospitalized"]),
            "Amputation": distribution(osha["Amputation"]),
            "Loss of Eye": distribution(osha["Loss of Eye"]),
            "Any recorded severe outcome": distribution(severe),
            "Any severe outcome by year": pd.crosstab(
                pd.to_datetime(osha["EventDate"], errors="coerce").dt.year, severe
            ).to_dict(),
            "Narrative outcome-term leakage": outcome_leakage,
        },
        "hse": {
            "Degree of Injury": distribution(hse["Degree of Injury"]),
            "Nature of Injury": distribution(hse["Nature of Injury"]),
            "Event type": distribution(hse["Event type"]),
            "Human Factor": distribution(hse["Human Factor"]),
            "Environmental Factor": distribution(hse["Environmental Factor"]),
            "Fatality-term leakage": {
                "fatal_rows": int(fatal.sum()),
                "narrative_mentions_fatality_rows": int(fatal_mentioned.sum()),
                "fatal_and_mentioned": int((fatal & fatal_mentioned).sum()),
                "nonfatal_and_mentioned": int((~fatal & fatal_mentioned).sum()),
            },
        },
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hse", type=Path, default=DEFAULT_HSE)
    parser.add_argument("--osha", type=Path, default=DEFAULT_OSHA)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "docs" / "ml" / "dataset_audit_metrics.json",
    )
    args = parser.parse_args()

    hse_report, hse = audit_dataset(
        "OSHA HSE 2015-2017",
        args.hse,
        ["Abstract Text", "Event Description", "Event Keywords"],
        "Event Date",
        [
            "Construction End Use", "Building Stories", "Project Cost", "Project Type",
            "Degree of Injury", "Nature of Injury", "Part of Body", "Event type",
            "Environmental Factor", "Human Factor", "Task Assigned", "hazsub", "fat_cause",
        ],
    )
    osha_report, osha = audit_dataset(
        "OSHA Severe Injury Reports 2015-2025",
        args.osha,
        ["Final Narrative"],
        "EventDate",
        [
            "State", "Primary NAICS", "Hospitalized", "Amputation", "Loss of Eye",
            "Nature", "NatureTitle", "Part of Body", "Part of Body Title", "Event",
            "EventTitle", "Source", "SourceTitle", "Secondary Source",
            "Secondary Source Title", "FederalState",
        ],
    )
    hse_report["validation_rules"] = hse_rules(hse)
    osha_report["validation_rules"] = osha_rules(osha)

    duplicate_osha = ROOT / "Dump" / "csv files" / "January2015toNovember2025.csv"
    payload = {
        "audit_generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "method": "Read-only pandas audit; no values were cleaned or imputed.",
        "source_provenance": {
            "hse": str(args.hse.relative_to(ROOT)),
            "osha": str(args.osha.relative_to(ROOT)),
            "duplicate_osha_copy": str(duplicate_osha.relative_to(ROOT)),
            "duplicate_osha_sha256_match": sha256(args.osha) == sha256(duplicate_osha),
            "excluded_demo_dataset": "data/raw/safety_reports.csv",
            "excluded_demo_reason": "It has preconstructed SIF/entity labels and is not the described 4.8k HSE source.",
        },
        "datasets": {"hse": hse_report, "osha": osha_report},
        "target_cross_tabs": target_cross_tabs(hse, osha),
        "cross_dataset_exact_normalized_narrative_overlap": int(
            len(
                set(normalized_text(hse["Abstract Text"]))
                & set(normalized_text(osha["Final Narrative"]))
                - {""}
            )
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {args.output}")
    print(f"HSE: {len(hse):,} rows x {len(hse.columns)} columns")
    print(f"OSHA: {len(osha):,} rows x {len(osha.columns)} columns")


if __name__ == "__main__":
    main()
