"""Integration checks on the exported prototype data (run `python -m prism_pipeline.analytics.run` first)."""

import hashlib
import json
import re

import numpy as np
import pytest

from prism_pipeline.analytics import early_warning as ew
from prism_pipeline.analytics.common import EXPORT_DIR, error_projects, eval_group, load_processed, sigmoid
from prism_pipeline.analytics.features import attach_groups, build_panel, category_vocab, design_matrix

pytestmark = pytest.mark.integration

FILES = ("portfolio", "projects", "advisor", "ask", "evidence", "demo")


@pytest.fixture(scope="module")
def x():
    if not (EXPORT_DIR / "manifest.json").exists():
        pytest.skip("run `python -m prism_pipeline.analytics.run` first")
    return {f: json.loads((EXPORT_DIR / f"{f}.json").read_text(encoding="utf-8")) for f in FILES + ("manifest",)}


def test_manifest_hashes_match(x):
    for f in x["manifest"]["files"]:
        data = (EXPORT_DIR / f["file"]).read_bytes()
        assert hashlib.sha256(data).hexdigest() == f["sha256"], f["file"]


def test_no_nan_or_infinity_strings():
    for f in FILES:
        text = (EXPORT_DIR / f"{f}.json").read_text(encoding="utf-8")
        assert not re.search(r"\bNaN\b|\bInfinity\b", text), f


def test_portfolio_matches_official_august_totals(x):
    off = x["portfolio"]["official"]
    assert (off["ongoing_projects"], off["original_cost_cr"], off["revised_cost_cr"], off["expenditure_cr"]) == (
        1731, 3071947, 3360069, 1632561,
    )
    assert sum(b["projects"] for b in x["portfolio"]["risk_bands"]) == off["ongoing_projects"]


def test_sample_is_small_real_and_sourced(x):
    projects = x["projects"]
    assert 40 <= len(projects) <= 100
    assert len({p["code"] for p in projects}) == len(projects)
    for p in projects:
        assert p["source"]["report"] == "Flash Report #490" and p["source"]["page"] > 0
        r = p["risk"]
        assert 0 <= r["score"] <= 10 and abs(r["score"] - 10 * r["probability"]) <= 0.051
        assert r["band"] == ew.band_of(r["probability"])
        assert len([d for d in r["drivers"] if d["direction"] == "raises"]) <= 3
        for d in r["drivers"]:
            assert d["text"] and (d["log_odds"] > 0) == (d["direction"] == "raises")
    bands = {p["risk"]["band"] for p in projects}
    assert bands == {"high", "elevated", "moderate", "low"}


def test_demo_projects_are_in_the_sample(x):
    codes = {p["code"] for p in x["projects"]}
    demo = x["demo"]
    assert demo["hero_project"]["code"] in codes
    for a in demo["archetypes"].values():
        assert a is None or a["code"] in codes
    for s in x["advisor"]["scenarios"]:
        assert s["source"]["project_code"] in codes and s["destination"]["project_code"] in codes


def test_advisor_scenarios_are_consistent(x):
    adv = x["advisor"]
    assert adv["scenarios"] and "not an actual fund transfer" in adv["caveat"]
    excluded = set(adv["excluded_for_verification"])
    for s in adv["scenarios"]:
        src, dst = s["source"], s["destination"]
        assert s["suggested_amount_cr"] <= min(src["buffer_cr"], dst["shortfall_cr"]) + 0.01
        assert abs(src["buffer_cr"] - (src["original_cost_cr"] - src["sanctioned_cr"])) < 0.02
        assert abs(dst["shortfall_cr"] - (dst["expenditure_cr"] - dst["sanctioned_cr"])) < 0.02
        assert src["project_code"] not in excluded and dst["project_code"] not in excluded
        assert "re-appropriation approval" in s["sentence"]
    assert adv["scenarios"][0]["id"] == x["demo"]["featured_scenario"]


def test_ask_answers_are_grounded(x):
    ask = x["ask"]
    codes = {p["code"] for p in x["projects"]}
    assert set(ask["projects"]) == codes
    for intent in ask["intents"]:
        assert intent["answer"].strip() and intent["sources"] and intent["keywords"]
        assert set(intent["projects"]) <= codes
    m = re.search(r"project (\d+)", ask["suggested"][-1])
    assert m and m.group(1) in codes


def test_evidence_is_measured(x):
    ev = x["evidence"]
    t = ev["test"]
    assert ev["protocol"]["test_month"] < ev["protocol"]["scored_month"]
    for v in t["auc"].values():
        assert 0.5 < v < 1
    assert 0 < t["high_correct"] <= t["high_flagged"] <= t["n"]
    assert x["evidence"]["data"]["reconciliation"]["failed"] == 0


def test_fused_score_decomposes_exactly():
    """Drivers + base reproduce every fused log-odds (no black box)."""
    data = load_processed()
    ongoing = data["ongoing_long"]
    vocab = category_vocab(ongoing)
    panel = attach_groups(build_panel(ongoing), vocab)
    panel["eval_group"] = [eval_group(c, n) for c, n in zip(panel["project_code"], panel["project_name"])]
    panel["excluded"] = panel["project_code"].isin(error_projects(data["data_quality_register"]))
    design = lambda df: design_matrix(df, vocab)  # noqa: E731
    hyper = {"logit": {"C": 0.1}, "cox": {"penalizer": 0.1}, "xgb": {"max_depth": 3, "n_estimators": 100},
             "rf": {"min_samples_leaf": 20, "max_features": "sqrt"}}
    recipe = ew.fit_recipe(panel, design, ["2026-04", "2026-05"], "2026-06", hyper)
    rows = panel[panel["source_month"] == "2026-08"].head(200)
    X = design(rows)
    contrib, base = recipe.explain(X)
    np.testing.assert_allclose(contrib.sum(axis=1).to_numpy() + base, recipe.fused_logit(X), atol=1e-4)
    p = sigmoid(recipe.fused_logit(X))
    assert np.all((p > 0) & (p < 1))
