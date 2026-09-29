"""Unit checks for the prototype data build: leakage, explanations, Advisor rules, JSON safety."""

import json
import math

import numpy as np
import pandas as pd
import pytest

from prism_pipeline.analytics import advisor
from prism_pipeline.analytics.explain import displayable, driver_text
from prism_pipeline.analytics.export import to_jsonable, write_json
from prism_pipeline.analytics.features import build_panel, month_index
from prism_pipeline.config import PROCESSED_DIR


# ---------------------------------------------------------------- features / leakage


def _ongoing():
    path = PROCESSED_DIR / "ongoing_long.parquet"
    if not path.exists():
        pytest.skip("run the Phase 1 CLI first")
    return pd.read_parquet(path)


def test_month_index():
    assert month_index("2026-08") - month_index("2026-07") == 1
    assert math.isnan(month_index(None))


@pytest.mark.integration
def test_features_never_use_future_reports():
    """Features for July must be identical whether or not August exists."""
    ongoing = _ongoing()
    full = build_panel(ongoing)
    cut = build_panel(ongoing[ongoing["source_month"] <= "2026-07"])
    labels = {"y_slip_next", "slip_next_months", "project_code"}
    cols = [c for c in cut.columns if c not in labels]
    a = full[full["source_month"] == "2026-07"].set_index("project_code")[cols].sort_index()
    b = cut[cut["source_month"] == "2026-07"].set_index("project_code")[cols].sort_index()
    pd.testing.assert_frame_equal(a, b, check_like=True)


@pytest.mark.integration
def test_labels_only_where_next_report_exists():
    panel = build_panel(_ongoing())
    assert panel.loc[panel["source_month"] == "2026-08", "y_slip_next"].isna().all()
    rates = panel.groupby("source_month")["y_slip_next"].mean().dropna()
    assert ((rates > 0.05) & (rates < 0.5)).all()


# ---------------------------------------------------------------- explanations


def test_absent_text_signal_is_never_a_driver():
    row = pd.Series({"txt_contract_epc": 0.0})
    assert not displayable("txt_contract_epc", 0.5, row)
    assert displayable("txt_contract_epc", 0.5, pd.Series({"txt_contract_epc": 1.0}))


def test_direction_must_match_the_sentence():
    no_revision = pd.Series({"slipped_last_month": 0.0, "n_slips_so_far": 0.0})
    assert not displayable("recent_slip", 0.4, no_revision)  # "no revision" cannot raise risk
    assert displayable("recent_slip", -0.4, no_revision)
    assert not displayable("deadline", 0.01, pd.Series(dtype=float))  # negligible


def test_driver_sentences_quote_values():
    row = pd.Series(
        {
            "months_to_expected": 1.0, "expected_doc": pd.Timestamp("2026-09-01"), "physical_progress": 99.19,
            "slip_so_far_months": 58.0, "original_doc": pd.Timestamp("2021-11-01"), "state_label": "Multi-States",
            "is_ner": 0.0, "is_hill_state": 0.0,
        }
    )
    assert driver_text("deadline", row) == "Current target date (Sep 2026) falls within the next month; 1% of the work remains"
    assert driver_text("slip_history", row) == "Already 58 months behind the original target (Nov 2021)"
    assert driver_text("location", row) == "Spans multiple states"


# ---------------------------------------------------------------- Advisor


def _book():
    rows = [
        # code, ministry, agency, original, revised, spent, band
        ("A1", "M1", "AG1", 1000, 800, 500, "low"),  # buffer 200
        ("A2", "M1", "AG1", 500, 500, 650, "high"),  # shortfall 150
        ("A3", "M1", "AG2", 300, 300, 330, "high"),  # shortfall 30
        ("B1", "M2", "AG3", 400, 300, 100, "low"),  # buffer 100, other ministry
        ("C1", "M1", "AG1", 900, 100, 50, "low"),  # revised to 11% of original: implausible
        ("D1", "M1", "AG1", 600, 600, 700, "high"),  # overspent but DQ error
    ]
    df = pd.DataFrame(rows, columns=["project_code", "ministry", "agency_key", "original_cost_cr", "revised_cost_latest_cr",
                                     "cumulative_expenditure_cr", "risk_band"])
    df["sanctioned_cr"] = df["revised_cost_latest_cr"]
    df["cost_ratio"] = df["revised_cost_latest_cr"] / df["original_cost_cr"]
    df["ministry_short"] = df["ministry"]
    df["agency"] = df["agency_key"]
    df["project_name"] = "Project " + df["project_code"]
    df["state_label"] = "State"
    df["physical_progress_pct"] = 50.0
    df["risk_score"] = df["risk_band"].map({"low": 0.5, "high": 8.0})
    df["source_page"] = 1
    df["dq_flags"] = [[], [], [], [], [], ["DQ03"]]
    df["dq_has_error"] = [False, False, False, False, False, True]
    return df


def test_advisor_pairs_only_within_ministry_and_never_exceeds_amounts():
    out = advisor.recommend(_book())
    recs = out["recommendations"]
    assert recs, "expected at least one pairing"
    used: dict[str, float] = {}
    got: dict[str, float] = {}
    for r in recs:
        assert r["ministry"] == "M1"
        s, d = r["source"], r["destination"]
        used[s["project_code"]] = used.get(s["project_code"], 0) + r["suggested_amount_cr"]
        got[d["project_code"]] = got.get(d["project_code"], 0) + r["suggested_amount_cr"]
        assert "approval" in r["sentence"]
    assert used["A1"] <= 200 + 1e-9
    assert got["A2"] <= 150 + 1e-9 and got["A3"] <= 30 + 1e-9
    assert recs[0]["match_level"] == "same agency"
    assert "not an actual fund transfer" in out["caveat"]


def test_advisor_excludes_suspect_rows():
    out = advisor.recommend(_book())
    codes = {r["source"]["project_code"] for r in out["recommendations"]} | {
        r["destination"]["project_code"] for r in out["recommendations"]
    }
    assert "C1" not in codes and "D1" not in codes
    assert {"C1", "D1"} <= set(out["excluded_for_verification"])


# ---------------------------------------------------------------- JSON


def test_json_is_strict(tmp_path):
    payload = {"a": np.float64("nan"), "b": [np.int64(3), pd.Timestamp("2026-08-01")], "c": {1, 2}}
    assert to_jsonable(payload) == {"a": None, "b": [3, "2026-08-01"], "c": [1, 2]}
    meta = write_json(tmp_path / "x.json", payload)
    assert json.loads((tmp_path / "x.json").read_text(encoding="utf-8"))["a"] is None
    assert meta["bytes"] > 0 and len(meta["sha256"]) == 64
