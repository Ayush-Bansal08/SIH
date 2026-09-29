"""Feature panel: one row per (project, report month), using only information
available in that month's report and earlier ones.

Leakage rules (enforced by ``tests/test_features.py``):
  * features for month t use reports <= t only (history features look backwards);
  * the early-warning label for month t is defined from month t+1, and rows
    whose project is not observed in t+1 are left unlabelled (censored), never
    labelled 0.

Feature groups (for the CUF-Gap attribution, PS dimension (c)):
  * CUF      — derived from fields captured in the Common Upload Form / reports
  * NON_CUF  — information not captured as a CUF field today (parsed from the
               free-text project name: contract mode, financing, structure type,
               re-tendered 'balance work')
"""

from __future__ import annotations

import re

import numpy as np
import pandas as pd

HILL_STATES = frozenset(
    {"Jammu and Kashmir", "Ladakh", "Himachal Pradesh", "Uttarakhand", "Sikkim", "Arunachal Pradesh"}
)

# Non-CUF signals parsed from the project name. Each is "mentioned in the name",
# which under-counts the true attribute (a dedicated CUF field would capture all).
TEXT_FLAGS: dict[str, tuple[str, str]] = {
    "txt_tunnel": (r"tunnel", "Tunnel works"),
    "txt_bridge": (r"bridge", "Major bridge works"),
    "txt_greenfield": (r"greenfield", "Greenfield alignment"),
    "txt_balance_work": (r"balance\s*work", "Re-tendered contract ('balance work')"),
    "txt_contract_epc": (r"\bEPC\b", "EPC contract"),
    "txt_contract_ham": (r"\bHAM\b|hybrid annuity", "Hybrid-annuity (HAM) contract"),
    "txt_contract_ppp": (r"\bBOT\b|\bPPP\b|DBFOT", "BOT/PPP contract"),
    "txt_loan_assisted": (r"JICA|world bank|\bADB\b|loan assistance", "Externally loan-assisted (JICA/World Bank/ADB)"),
    "txt_bypass": (r"bypass", "Bypass works"),
    "txt_elevated": (r"elevated|flyover", "Elevated corridor / flyover"),
    "txt_expansion": (r"expansion|augmentation|capacity", "Expansion of an existing asset"),
    "txt_strategic_scheme": (r"SARDP|NHO-NE|Chardham|frontier highway|Bharatmala", "Strategic / special-area scheme"),
}

NUMERIC_CUF = [
    "log_original_cost",
    "is_mega",
    "sanctioned_ratio",
    "revised_cost_known",
    "physical_progress",
    "financial_progress",
    "fin_minus_phys",
    "months_since_approval",
    "months_since_start",
    "planned_duration",
    "elapsed_ratio",
    "slip_so_far_months",
    "slip_ratio",
    "months_to_expected",
    "due_overdue",
    "due_0_1",
    "due_2_3",
    "due_4_12",
    "due_13_plus",
    "overdue_no_revision",
    "required_rate",
    "has_history",
    "progress_rate_1m",
    "spend_rate_1m",
    "slipped_last_month",
    "n_slips_so_far",
    "is_ner",
    "is_hill_state",
    "is_multi_state",
    "is_pan_india",
]
NUMERIC_NON_CUF = list(TEXT_FLAGS)
CATEGORICAL_CUF = ["ministry_short", "hml_category", "agency_group", "state_group"]

MIN_CATEGORY_COUNT = 25  # agencies/states with fewer projects fall into 'Other'


def month_index(value) -> float:
    """Months since year 0 for a date / 'YYYY-MM' string; NaN if missing."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    if isinstance(value, str):
        y, m = value.split("-")[:2]
        return int(y) * 12 + int(m) - 1
    if pd.isna(value):
        return np.nan
    return value.year * 12 + value.month - 1


def _text_flags(names: pd.Series) -> pd.DataFrame:
    out = {}
    for col, (pattern, _) in TEXT_FLAGS.items():
        out[col] = names.fillna("").str.contains(pattern, flags=re.IGNORECASE, regex=True).astype(float)
    return pd.DataFrame(out, index=names.index)


def category_vocab(ongoing: pd.DataFrame) -> dict[str, list[str]]:
    """Fixed category vocabularies (so train/score matrices always align)."""
    latest = ongoing.drop_duplicates("project_code", keep="last")
    agencies = latest["agency_key"].value_counts()
    states = latest["state_label"].value_counts()
    return {
        "ministry_short": sorted(ongoing["ministry_short"].dropna().unique()),
        "hml_category": sorted(ongoing["hml_category"].dropna().unique()),
        "agency_group": sorted(agencies[agencies >= MIN_CATEGORY_COUNT].index) + ["Other"],
        "state_group": sorted(states[states >= MIN_CATEGORY_COUNT].index) + ["Other"],
    }


def build_panel(ongoing: pd.DataFrame) -> pd.DataFrame:
    """Per (project, month) features + next-month early-warning label."""
    df = ongoing.sort_values(["project_code", "source_month"]).reset_index(drop=True).copy()
    df["t"] = df["source_month"].map(month_index)

    # Revised cost as known at month t (the latest report prints none; carry forward within <= t).
    df["revised_cost_asof_t"] = df.groupby("project_code")["revised_cost_cr"].ffill()
    df["sanctioned_cr"] = df["revised_cost_asof_t"].fillna(df["original_cost_cr"])
    df["expected_doc"] = df["revised_doc"].where(df["revised_doc"].notna(), df["original_doc"])

    for col in ("date_of_approval", "start_date", "original_doc", "revised_doc", "expected_doc"):
        df[f"{col}_m"] = df[col].map(month_index)

    start_m = df["start_date_m"].fillna(df["date_of_approval_m"])
    planned = df["original_doc_m"] - start_m
    planned = planned.where(planned >= 1)

    f = pd.DataFrame(index=df.index)
    f["log_original_cost"] = np.log1p(df["original_cost_cr"])
    f["is_mega"] = (df["original_cost_cr"] >= 1000).astype(float)
    f["sanctioned_ratio"] = df["sanctioned_cr"] / df["original_cost_cr"]
    f["revised_cost_known"] = df["revised_cost_asof_t"].notna().astype(float)
    f["physical_progress"] = df["physical_progress_pct"]
    f["financial_progress"] = (df["cumulative_expenditure_cr"] / df["sanctioned_cr"]).clip(0, 3)
    f["fin_minus_phys"] = f["financial_progress"] - f["physical_progress"] / 100
    f["months_since_approval"] = df["t"] - df["date_of_approval_m"]
    f["months_since_start"] = df["t"] - start_m
    f["planned_duration"] = planned
    f["elapsed_ratio"] = (f["months_since_start"] / planned).clip(-1, 20)
    f["slip_so_far_months"] = df["expected_doc_m"] - df["original_doc_m"]
    f["slip_ratio"] = (f["slip_so_far_months"] / planned).clip(-5, 20)
    due = df["expected_doc_m"] - df["t"]
    f["months_to_expected"] = due
    f["due_overdue"] = (due < 0).astype(float)
    f["due_0_1"] = due.between(0, 1).astype(float)
    f["due_2_3"] = due.between(2, 3).astype(float)
    f["due_4_12"] = due.between(4, 12).astype(float)
    f["due_13_plus"] = (due >= 13).astype(float)
    f["overdue_no_revision"] = ((df["original_doc_m"] < df["t"]) & df["revised_doc"].isna()).astype(float)
    f["required_rate"] = ((100 - df["physical_progress_pct"]).clip(lower=0) / due.clip(lower=1)).clip(0, 100)

    # History within the panel (strictly backward-looking).
    g = df.groupby("project_code")
    prev_t = g["t"].shift(1)
    consecutive = (df["t"] - prev_t) == 1
    f["has_history"] = consecutive.astype(float)
    f["progress_rate_1m"] = (df["physical_progress_pct"] - g["physical_progress_pct"].shift(1)).where(consecutive)
    f["spend_rate_1m"] = (
        (df["cumulative_expenditure_cr"] - g["cumulative_expenditure_cr"].shift(1)) / df["sanctioned_cr"]
    ).where(consecutive)
    slipped = (df["expected_doc_m"] > g["expected_doc_m"].shift(1)).astype(float).where(consecutive)
    f["slipped_last_month"] = slipped
    f["n_slips_so_far"] = slipped.fillna(0).groupby(df["project_code"]).cumsum()

    states = df["states"].map(lambda s: list(s) if s is not None else [])
    f["is_ner"] = df["is_ner_official"].astype(float)
    f["is_hill_state"] = states.map(lambda s: any(x in HILL_STATES for x in s)).astype(float)
    f["is_multi_state"] = (df["state_label"] == "Multi-States").astype(float)
    f["is_pan_india"] = (df["state_label"] == "PAN India").astype(float)

    f = pd.concat([f, _text_flags(df["project_name"])], axis=1)

    # Next-month early-warning label: expected completion pushed later in the next report.
    next_t = g["t"].shift(-1)
    next_doc = g["expected_doc_m"].shift(-1)
    observed_next = (next_t - df["t"]) == 1
    label = (next_doc > df["expected_doc_m"]).astype(float)
    label = label.where(observed_next & df["expected_doc_m"].notna() & next_doc.notna())
    f["y_slip_next"] = label
    f["slip_next_months"] = (next_doc - df["expected_doc_m"]).where(observed_next)

    keep = [
        "project_code", "source_month", "t", "project_name", "ministry", "ministry_short", "sector",
        "hml_category", "agency_key", "agency", "state_label", "original_cost_cr", "sanctioned_cr",
        "cumulative_expenditure_cr", "physical_progress_pct", "original_doc", "revised_doc", "expected_doc",
        "start_date", "date_of_approval",
    ]
    panel = pd.concat([df[keep], f], axis=1)
    return panel


def attach_groups(panel: pd.DataFrame, vocab: dict[str, list[str]]) -> pd.DataFrame:
    panel = panel.copy()
    panel["agency_group"] = panel["agency_key"].where(panel["agency_key"].isin(vocab["agency_group"]), "Other")
    panel["state_group"] = panel["state_label"].where(panel["state_label"].isin(vocab["state_group"]), "Other")
    return panel


def design_matrix(panel: pd.DataFrame, vocab: dict[str, list[str]], include_non_cuf: bool = True) -> pd.DataFrame:
    """Numeric design matrix with fixed one-hot columns. NaN are kept (handled per model)."""
    cols = NUMERIC_CUF + (NUMERIC_NON_CUF if include_non_cuf else [])
    X = panel[cols].astype(float).copy()
    for cat in CATEGORICAL_CUF:
        for level in vocab[cat]:
            X[f"{cat}={level}"] = (panel[cat] == level).astype(float)
    return X


def feature_group(column: str) -> str:
    """Human feature group for a design-matrix column (used to aggregate SHAP one-hots)."""
    if "=" in column:
        return column.split("=")[0]
    return column


def is_non_cuf(column: str) -> bool:
    return column in TEXT_FLAGS
