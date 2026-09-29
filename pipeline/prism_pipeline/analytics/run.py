"""Build the prototype data package: ``python -m prism_pipeline.analytics.run``.

One offline run that turns the reconciled Flash Report tables into the static JSON the
web prototype reads (``pipeline/data/export``):

  portfolio.json  official portfolio totals + risk-band counts (all ongoing projects)
  projects.json   the curated prototype sample (~60 real projects) with scores and drivers
  advisor.json    same-ministry buffer -> shortfall scenarios (official figures)
  ask.json        grounded Ask PRISM answers
  evidence.json   how the score was tested (one unseen month) + data provenance
  demo.json       the projects used in the demo journey

Scores are precomputed here; the prototype itself runs no model.
"""

from __future__ import annotations

import argparse
import json
import platform
import sys
import time
import warnings
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from .. import __version__
from ..config import DOCS_DIR, FLASH_REPORTS, PROCESSED_DIR
from . import advisor, ask, benchmark
from . import early_warning as ew
from .common import EXPORT_DIR, SEED, error_projects, eval_group, load_processed, sigmoid
from .explain import DRIVER_LABELS, PUBLISHED_CAUSE_PROXIES, group_contributions, is_non_cuf_driver, top_drivers
from .export import r2, write_json
from .features import TEXT_FLAGS, attach_groups, build_panel, category_vocab, design_matrix, month_index

SAMPLE_SIZE = 60
SCENARIOS = 6
MIN_SCENARIO_CR = 25.0
QUESTION = "Will the official completion date be pushed back in the next monthly Flash Report?"
BAND_TEXT = {
    "high": "40% or higher chance of a completion-date revision in the next report",
    "elevated": "20–40% chance",
    "moderate": "8–20% chance",
    "low": "below 8% chance",
}


# ------------------------------------------------------------------ helpers


def _iso(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return pd.Timestamp(value).date().isoformat()


def _label(value) -> str:
    iso = _iso(value)
    return pd.Timestamp(iso).strftime("%b %Y") if iso else "not recorded"


def _list(value) -> list:
    if value is None:
        return []
    if isinstance(value, str):
        return [v.strip() for v in value.split(";") if v.strip()]
    return [str(v) for v in value]


def _str_or_none(value):
    return value if isinstance(value, str) else None


def prepare(data: dict):
    ongoing = data["ongoing_long"]
    excluded = error_projects(data["data_quality_register"])
    vocab = category_vocab(ongoing)
    panel = attach_groups(build_panel(ongoing), vocab)
    panel["eval_group"] = [eval_group(c, n) for c, n in zip(panel["project_code"], panel["project_name"])]
    panel["excluded"] = panel["project_code"].isin(excluded)
    months = sorted(panel["source_month"].unique())
    if len(months) < 4:
        raise SystemExit("need at least four monthly reports (train / calibrate / test / score)")
    return panel, vocab, months, excluded


def score_rows(recipe: ew.Recipe, rows: pd.DataFrame, design) -> dict:
    X = design(rows)
    fl = recipe.fused_logit(X)
    contrib, base = recipe.explain(X)
    grouped = group_contributions(contrib)
    return {
        "p": sigmoid(fl),
        "tracks": recipe.track_proba(X),
        "members": recipe.member_proba(X),
        "grouped": grouped,
        "base": base,
        "drivers": top_drivers(grouped, fl, rows),
    }


CUF_FIELDS = [
    "Ministry", "Sector", "Implementing agency", "State(s)", "Date of approval", "Start date",
    "Original date of completion", "Revised date of completion", "Original cost", "Revised cost",
    "Cumulative expenditure", "Physical progress",
]

# Descriptive only (Phase 6 scope): how often projects with each non-CUF signal are
# delayed, compared with all projects. Associations, not causes.
RECOMMENDED_FIELDS = [
    ("Contract mode (EPC / HAM / BOT)", "txt_contract_ham", "Delay rates differ sharply by contract mode, but it appears only when written into the project name."),
    ("Funding source (budget / external loan)", "txt_loan_assisted", "Externally loan-assisted projects are delayed more often in this data."),
    ("Structure type (tunnel, major bridge, elevated)", "txt_tunnel", "Tunnel and bridge works show the highest delay shares."),
    ("Alignment (greenfield / brownfield)", "txt_greenfield", "Greenfield alignments are delayed more often — a proxy for land acquisition."),
    ("Re-tendering history", "txt_balance_work", "'Balance work' contracts (re-tendered after an earlier contract) are delayed more often."),
    ("Structured cause of delay", None, "Published research names land acquisition, forest clearance and contractor performance as leading causes; the CUF records none of them."),
]


def cuf_comparison(book: pd.DataFrame) -> dict:
    delayed_all = book["slip_months"] > 0
    base = {
        "projects": int(len(book)),
        "share_delayed": round(float(delayed_all.mean()), 4),
        "median_delay_months": float(book.loc[delayed_all, "slip_months"].median()),
        "share_cost_revised_up": round(float((book["cost_ratio"] > 1.001).mean()), 4),
    }
    rows = []
    for col, (_, label) in TEXT_FLAGS.items():
        g = book[book[col] >= 1]
        if len(g) < 10:
            continue
        d = g["slip_months"] > 0
        rows.append(
            {
                "key": col,
                "signal": label,
                "projects": int(len(g)),
                "share_delayed": round(float(d.mean()), 4),
                "median_delay_months": float(g.loc[d, "slip_months"].median()) if d.any() else 0.0,
                "share_cost_revised_up": round(float((g["cost_ratio"] > 1.001).mean()), 4),
                "difference_pts": round(100 * (float(d.mean()) - base["share_delayed"]), 1),
            }
        )
    rows.sort(key=lambda r: -r["share_delayed"])
    by_key = {r["key"]: r for r in rows}
    return {
        "cuf_fields": CUF_FIELDS,
        "baseline": base,
        "signals": rows,
        "recommended_fields": [
            {"field": f, "evidence": (f"{by_key[k]['signal']}: {by_key[k]['share_delayed']:.0%} delayed vs {base['share_delayed']:.0%} overall (n={by_key[k]['projects']}). " if k in by_key else "") + why}
            for f, k, why in RECOMMENDED_FIELDS
        ],
        "external_data": [
            {"indicator": "Construction-material price indices (WPI: cement, steel, bitumen)", "status": "Production path", "why": "A national monthly series; five public reports are too few months to separate its effect. Needs the multi-year OCMS archive."},
            {"indicator": "Rainfall / monsoon anomaly (IMD)", "status": "Production path", "why": "Public series available now cover the current season only and would leak information from after the test month."},
            {"indicator": "Election-cycle and terrain flags", "status": "Partly captured", "why": "Terrain is approximated from state (NER, hill states); election windows need the multi-year archive."},
        ],
        "note": "Descriptive comparison on all ongoing projects in the latest report. Signals are parsed from project names, so they under-count the true attribute; differences are associations, not causes.",
    }


def cause_check(book: pd.DataFrame) -> dict:
    """B5: do the top drivers of High-band projects match published root causes (A5)?"""
    high = book[book["risk_band"] == "high"]
    keys = high["drivers"].map(lambda ds: [d["key"] for d in ds if d["direction"] == "raises"])
    top1 = keys.map(lambda k: k[0] if k else None)
    any3 = keys.map(lambda k: any(x in PUBLISHED_CAUSE_PROXIES for x in k))
    n = int(len(high))
    counts = top1.value_counts()
    return {
        "flagged_high": n,
        "top_driver_matches": int(top1.isin(list(PUBLISHED_CAUSE_PROXIES)).sum()),
        "any_top3_matches": int(any3.sum()),
        "share_top_driver": round(float(top1.isin(list(PUBLISHED_CAUSE_PROXIES)).mean()), 4) if n else None,
        "share_any_top3": round(float(any3.mean()), 4) if n else None,
        "published_causes": [
            "land acquisition delay", "forest clearance delay", "law-and-order problems", "price escalation",
            "high capital cost", "poor contractor performance", "equipment supply delay",
        ],
        "observable_proxies": [{"driver": DRIVER_LABELS[k], "cause": v} for k, v in PUBLISHED_CAUSE_PROXIES.items()],
        "most_common_top_drivers": [{"driver": DRIVER_LABELS[k], "projects": int(v)} for k, v in counts.head(5).items()],
    }


def driver_importance(grouped: pd.DataFrame) -> list[dict]:
    mean_abs = grouped.abs().mean().sort_values(ascending=False)
    total = float(mean_abs.sum())
    return [
        {
            "driver": k,
            "label": DRIVER_LABELS[k],
            "share": round(float(v) / total, 4),
            "data": "Non-CUF" if is_non_cuf_driver(k) else "CUF",
        }
        for k, v in mean_abs.items()
    ]


# ------------------------------------------------------------------ book (all projects)


def build_book(data, current, scored) -> pd.DataFrame:
    projects = data["projects"].set_index("project_code")
    b = current.copy().reset_index(drop=True)
    extra = projects.loc[b["project_code"]]
    for col in (
        "revised_cost_latest_cr", "revised_cost_asof", "dq_flags", "dq_has_error", "first_seen_month",
        "newly_added_month", "cost_category", "states", "source_page", "source_table", "is_ner_official",
    ):
        b[col] = extra[col].to_numpy()
    b["sanctioned_cr"] = b["revised_cost_latest_cr"].fillna(b["original_cost_cr"])
    b["cost_ratio"] = b["revised_cost_latest_cr"] / b["original_cost_cr"]
    b["slip_months"] = b["slip_so_far_months"]
    b["risk_probability"] = scored["p"]
    b["risk_score"] = ew.risk_score(scored["p"])
    b["risk_band"] = [ew.band_of(p) for p in scored["p"]]
    b["drivers"] = scored["drivers"]
    b["drivers_text"] = [
        "; ".join(d["text"] for d in ds if d["direction"] == "raises") or "no strong risk-raising factor"
        for ds in scored["drivers"]
    ]
    b["expected_doc_label"] = b["expected_doc"].map(_label)
    b["original_doc_label"] = b["original_doc"].map(_label)
    b["track_statistical"] = scored["tracks"]["statistical"]
    b["track_ml"] = scored["tracks"]["ml"]
    for m, v in scored["members"].items():
        b[f"p_{m}"] = v
    return b


def schedule_status(r) -> str:
    m = r["months_to_expected"]
    if pd.notna(m) and m < 0:
        return "past_target"
    if pd.notna(r["slip_months"]) and r["slip_months"] > 0:
        return "delayed"
    return "on_schedule"


def funding_status(r) -> str:
    if r["cumulative_expenditure_cr"] > r["sanctioned_cr"] + 0.005:
        return "overspent"
    if pd.isna(r["revised_cost_latest_cr"]):
        return "revision_not_reported"
    if r["cost_ratio"] > 1.001:
        return "revised_up"
    if r["cost_ratio"] < 0.999:
        return "revised_down"
    return "within_sanction"


# ------------------------------------------------------------------ curation


def choose_scenarios(recs: list[dict], k: int = SCENARIOS) -> list[dict]:
    """Featured first: same agency, low-risk source, highest-risk destination.
    Then the largest remaining pairings, one per destination, spread across ministries."""
    recs = [x for x in recs if x["suggested_amount_cr"] >= MIN_SCENARIO_CR]  # skip crumbs
    if not recs:
        return []
    same = [x for x in recs if x["match_level"] == "same agency" and x["source"]["risk_band"] in ("low", "moderate")]
    pool = same or recs
    featured = max(pool, key=lambda x: (x["destination"]["risk_score"], x["suggested_amount_cr"], x["id"]))
    chosen, seen_dest, per_ministry = [featured], {featured["destination"]["project_code"]}, {featured["ministry_short"]: 1}
    rest = sorted(recs, key=lambda x: (x["match_level"] != "same agency", -x["suggested_amount_cr"], x["id"]))
    for x in rest:
        if len(chosen) >= k:
            break
        d = x["destination"]["project_code"]
        if d in seen_dest or x["source"]["project_code"] in {c["source"]["project_code"] for c in chosen}:
            continue
        if per_ministry.get(x["ministry_short"], 0) >= 3:
            continue
        chosen.append(x)
        seen_dest.add(d)
        per_ministry[x["ministry_short"]] = per_ministry.get(x["ministry_short"], 0) + 1
    return chosen


def pick_demo(book: pd.DataFrame, featured: dict | None) -> dict:
    clean = book[~advisor.is_suspect(book)]

    def one(df, col, reason, ascending=False):
        if df.empty:
            return None
        r = df.sort_values([col, "project_code"], ascending=[ascending, True]).iloc[0]
        return {"code": str(r["project_code"]), "reason": reason}

    if featured and featured["destination"]["risk_band"] in ("high", "elevated"):
        hero = {
            "code": featured["destination"]["project_code"],
            "reason": "High-risk project that already spent beyond its sanction and has a same-agency buffer available",
        }
    else:
        hero = one(clean[clean["risk_band"] == "high"], "risk_score", "Highest PRISM score with clean data")
    elevated = clean[clean["risk_band"] == "elevated"]
    medium = None
    if not elevated.empty:
        mid = elevated["risk_score"].median()
        r = elevated.loc[(elevated["risk_score"] - mid).abs().sort_values(kind="mergesort").index[0]]
        medium = {"code": str(r["project_code"]), "reason": "Typical Elevated-band project"}
    spend_gap = 100 * clean["cumulative_expenditure_cr"] / clean["sanctioned_cr"] - clean["physical_progress_pct"]
    overspent = clean[clean["cumulative_expenditure_cr"] > clean["sanctioned_cr"]].assign(
        over=lambda d: d["cumulative_expenditure_cr"] - d["sanctioned_cr"]
    )
    flagged = book[advisor.data_flagged(book)]
    verify = flagged.assign(dq01=flagged["dq_flags"].map(lambda f: "DQ01" in _list(f)).astype(int))
    return {
        "hero_project": hero,
        "featured_scenario": featured["id"] if featured else None,
        "archetypes": {
            "high_risk": hero,
            "medium_risk": medium,
            "low_risk": one(
                clean[(clean["risk_band"] == "low") & (clean["slip_months"] <= 0)
                      & clean["physical_progress_pct"].between(50, 90)].assign(
                    closeness=lambda d: -(d["physical_progress_pct"] - 75).abs()
                ),
                "closeness",
                "Low risk, on its original schedule, mid-way through construction",
            ),
            "schedule_slippage": one(clean, "slip_months", "Largest delay against the original completion date"),
            "financial_pressure": one(overspent, "over", "Largest expenditure above sanctioned cost"),
            "progress_spend_mismatch": one(
                clean.assign(gap=spend_gap)[spend_gap > 30], "gap", "Spending furthest ahead of physical progress"
            ),
            "buffer": {"code": featured["source"]["project_code"], "reason": "Advisor source: official downward revision"} if featured else None,
            "shortfall": {"code": featured["destination"]["project_code"], "reason": "Advisor destination: spent beyond sanctioned cost"} if featured else None,
            "data_quality": one(verify, "dq01", "Error-level data-quality flag: figures need verification before use"),
        },
    }


def select_sample(book: pd.DataFrame, scenarios: list[dict], demo: dict, size: int = SAMPLE_SIZE) -> list[str]:
    chosen: list[str] = []

    def add(code):
        if code and code not in chosen:
            chosen.append(str(code))

    for s in scenarios:
        add(s["source"]["project_code"])
        add(s["destination"]["project_code"])
    for a in demo["archetypes"].values():
        if a:
            add(a["code"])
    clean = book[~advisor.is_suspect(book)]
    for code in clean[clean["risk_band"] == "high"].sort_values(["risk_score", "project_code"], ascending=[False, True])["project_code"].head(15):
        add(code)
    # Fill across bands and ministries so the sample looks like the portfolio.
    quota = {"high": 3, "elevated": 8, "moderate": 8, "low": 10}
    for band, n in quota.items():
        cand = clean[(clean["risk_band"] == band) & ~clean["project_code"].isin(chosen)]
        cand = cand.sort_values(["original_cost_cr", "project_code"], ascending=[False, True])
        order = cand["ministry_short"].value_counts().index.tolist()
        buckets = {m: list(cand.loc[cand["ministry_short"] == m, "project_code"]) for m in order}
        taken = 0
        while taken < n and any(buckets.values()):
            for m in order:
                if buckets[m] and taken < n:
                    add(buckets[m].pop(0))
                    taken += 1
    return chosen[:max(size, len(chosen))] if len(chosen) <= size else chosen[:size]


# ------------------------------------------------------------------ records


def histories(ongoing: pd.DataFrame, codes: set[str]) -> dict[str, list[dict]]:
    o = ongoing[ongoing["project_code"].isin(codes)].sort_values(["project_code", "source_month"])
    out: dict[str, list[dict]] = {}
    for r in o.itertuples(index=False):
        exp = r.revised_doc if _iso(r.revised_doc) else r.original_doc
        out.setdefault(str(r.project_code), []).append(
            {
                "month": r.source_month,
                "progress_pct": r2(r.physical_progress_pct),
                "expenditure_cr": r2(r.cumulative_expenditure_cr),
                "expected_completion": _iso(exp),
                "revised_cost_cr": r2(r.revised_cost_cr),
            }
        )
    return out


def project_record(r, grouped_row: pd.Series, hist: list[dict], alerts: list[str], peers: pd.Series, report) -> dict:
    ordered = grouped_row.reindex(grouped_row.abs().sort_values(ascending=False).index)
    breakdown = [{"driver": k, "label": DRIVER_LABELS[k], "log_odds": round(float(v), 4)} for k, v in ordered.head(8).items()]
    elapsed = r["elapsed_ratio"]
    return {
        "code": str(r["project_code"]),
        "name": r["project_name"],
        "ministry": r["ministry"],
        "ministry_short": r["ministry_short"],
        "sector": r["sector"],
        "hml_category": r["hml_category"],
        "agency": r["agency"],
        "state": r["state_label"],
        "states": _list(r["states"]),
        "ner": bool(r["is_ner_official"]),
        "cost_category": r["cost_category"],
        "dates": {
            "approval": _iso(r["date_of_approval"]),
            "start": _iso(r["start_date"]),
            "original_completion": _iso(r["original_doc"]),
            "revised_completion": _iso(r["revised_doc"]),
            "expected_completion": _iso(r["expected_doc"]),
        },
        "official": {
            "original_cost_cr": r2(r["original_cost_cr"]),
            "revised_cost_cr": r2(r["revised_cost_latest_cr"]),
            "revised_cost_asof": _str_or_none(r["revised_cost_asof"]),
            "expenditure_cr": r2(r["cumulative_expenditure_cr"]),
            "physical_progress_pct": r2(r["physical_progress_pct"]),
        },
        "derived": {
            "sanctioned_cr": r2(r["sanctioned_cr"]),
            "delay_months": r2(r["slip_months"], 0),
            "months_to_target": r2(r["months_to_expected"], 0),
            "time_elapsed_pct": r2(None if pd.isna(elapsed) else min(100.0, max(0.0, 100 * elapsed)), 1),
            "spent_pct_of_sanction": r2(100 * r["cumulative_expenditure_cr"] / r["sanctioned_cr"], 1),
            "cost_change_pct": r2(None if pd.isna(r["cost_ratio"]) else 100 * (r["cost_ratio"] - 1), 1),
            "date_revisions_tracked": int(r["n_slips_so_far"]),
            "schedule_status": schedule_status(r),
            "funding_status": funding_status(r),
        },
        "risk": {
            "probability": r2(r["risk_probability"], 4),
            "score": float(r["risk_score"]),
            "band": r["risk_band"],
            "statistical_probability": r2(r["track_statistical"], 4),
            "ml_probability": r2(r["track_ml"], 4),
            "models": {m: r2(r[f"p_{m}"], 4) for m in ew.MODELS},
            "drivers": r["drivers"],
            "breakdown": breakdown,
        },
        "peers": {
            "group": peers["peer_group"],
            "projects": int(peers["peer_n"]),
            "median_delay_months": r2(peers["peer_median_delay_months"], 1),
            "median_risk_score": r2(peers["peer_median_risk_score"], 1),
            "risk_percentile": r2(peers["risk_percentile"], 0),
        },
        "history": hist,
        "data_quality": {
            "flags": _list(r["dq_flags"]),
            "verify": bool(advisor.data_flagged(pd.DataFrame([r])).iloc[0]),
            "large_downward_revision": bool(advisor.implausible_revision(pd.DataFrame([r])).iloc[0]),
            "excluded_from_advisor": bool(advisor.is_suspect(pd.DataFrame([r])).iloc[0]),
        },
        "alerts": alerts,
        "first_seen": r["first_seen_month"],
        "newly_added": _str_or_none(r["newly_added_month"]),
        "source": {
            "report": f"Flash Report #{report.number}",
            "month": report.month,
            "table": r["source_table"],
            "page": int(r["source_page"]),
        },
    }


# ------------------------------------------------------------------ evidence


def compact_test(test: dict) -> dict:
    m = test["metrics"]
    rule = "rule_" + test["best_rule"]
    return {
        "n": m["fused"]["n"],
        "positives": m["fused"]["positives"],
        "high_flagged": test["at_high"]["flagged"],
        "high_correct": test["at_high"]["true_positives"],
        "high_precision": test["at_high"]["precision"],
        "high_recall": test["at_high"]["recall"],
        "auc": {"fused": m["fused"]["auc"], "logit": m["logit"]["auc"], "cox": m["cox"]["auc"],
                "xgb": m["xgb"]["auc"], "rf": m["rf"]["auc"], "rule": m[rule]["auc"]},
        "best_rule": ew.BASELINES[test["best_rule"]],
        "bands": test["bands"],
    }


def stat_vs_ml(test: dict) -> dict:
    m = test["metrics"]
    rule = "rule_" + test["best_rule"]
    rows = []
    for label, get, higher in (
        ("Ranking accuracy (AUC)", lambda k: m[k]["auc"], True),
        ("Hit rate in top 10% of scores", lambda k: m[k]["top10"]["precision"], True),
        ("Brier score (lower is better)", lambda k: m[k]["brier"], False),
    ):
        vals = {k: get(k) for k in ("logit", "cox", "xgb", "rf", "fused", rule)}
        best_stat = max(vals["logit"], vals["cox"]) if higher else min(vals["logit"], vals["cox"])
        best_ml = max(vals["xgb"], vals["rf"]) if higher else min(vals["xgb"], vals["rf"])
        ml_better = best_ml > best_stat if higher else best_ml < best_stat
        rows.append(
            {
                "metric": label,
                "logistic": r2(vals["logit"], 3), "cox": r2(vals["cox"], 3),
                "xgboost": r2(vals["xgb"], 3), "random_forest": r2(vals["rf"], 3),
                "fused": r2(vals["fused"], 3), "rule_of_thumb": r2(vals[rule], 3),
                "better_track": "ML" if ml_better else "Statistical",
            }
        )
    d = test["deltas_auc"]["xgb_vs_logit"]
    f = test["deltas_auc"]["fused_vs_best_rule"]
    verdict = (
        f"XGBoost ranks next-month delays better than logistic regression (AUC {d['delta']:+.3f}, 95% CI "
        f"{d['ci95'][0]:+.3f} to {d['ci95'][1]:+.3f}); "
        if d["significant"] and d["delta"] > 0
        else f"XGBoost vs logistic regression: AUC {d['delta']:+.3f} (95% CI {d['ci95'][0]:+.3f} to {d['ci95'][1]:+.3f}); "
    ) + (
        f"the fused score beats the best rule of thumb by {f['delta']:+.3f} AUC (95% CI {f['ci95'][0]:+.3f} to {f['ci95'][1]:+.3f})."
    )
    return {"rows": rows, "verdict": verdict}


def evidence_markdown(ev: dict, adv_example: dict | None) -> str:
    t = ev["test"]
    lines = [
        "# PAIMANA-PRISM — Evidence (generated)",
        "",
        f"Generated by `python -m prism_pipeline.analytics.run` on {ev['generated_at']}. Do not edit by hand.",
        "",
        f"**Question:** {QUESTION}",
        "",
        f"**Test:** trained on {', '.join(ev['protocol']['train_months'])}, calibrated on {ev['protocol']['calibration_month']}, "
        f"tested once on {ev['protocol']['test_month']} → {ev['protocol']['test_label_month']}.",
        "",
        f"- **B1 (backtest).** Of {t['n']:,} projects scored from the {ev['protocol']['test_month']} report, the next report revised "
        f"{t['positives']} completion dates. PRISM's High band held {t['high_flagged']} projects; {t['high_correct']} "
        f"({t['high_precision']:.0%}) were revised — {t['high_recall']:.0%} of all revisions caught one report ahead.",
        f"- **B3 (stat vs ML).** {ev['stat_vs_ml']['verdict']}",
        f"- **B4 (Advisor).** {adv_example['sentence'] if adv_example else 'No pairing available.'}",
        "",
        "| Metric | Logistic | Cox | XGBoost | Random forest | Fused | Rule of thumb | Better track |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for r in ev["stat_vs_ml"]["rows"]:
        lines.append(
            f"| {r['metric']} | {r['logistic']} | {r['cox']} | {r['xgboost']} | {r['random_forest']} | {r['fused']} | {r['rule_of_thumb']} | {r['better_track']} |"
        )
    lines += ["", "| Band | Projects | Revised next report | Observed | Predicted |", "|---|---|---|---|---|"]
    for b in t["bands"]:
        obs = "–" if b["observed_rate"] is None else f"{b['observed_rate']:.0%}"
        pred = "–" if b["mean_predicted"] is None else f"{b['mean_predicted']:.0%}"
        lines.append(f"| {b['band']} | {b['n']} | {b['slipped']} | {obs} | {pred} |")
    lines += ["", "## Limits", ""] + [f"- {x}" for x in ev["limits"]]
    return "\n".join(lines) + "\n"


# ------------------------------------------------------------------ main


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boot", type=int, default=500, help="bootstrap replicates for confidence intervals")
    args = parser.parse_args(argv)
    warnings.filterwarnings("ignore")
    np.random.seed(SEED)
    t0 = time.perf_counter()

    data = load_processed()
    panel, vocab, months, excluded = prepare(data)
    latest, labelled = months[-1], months[:-1]
    design = lambda df: design_matrix(df, vocab)  # noqa: E731
    report = next(r for r in FLASH_REPORTS if r.month == latest)

    # 1. Test once on a month the model never saw (evidence), then refit for the latest report.
    hyper, _ = ew.select_hyperparams(panel, design, labelled[:-2], labelled[-2])
    eval_recipe = ew.fit_recipe(panel, design, labelled[:-2], labelled[-2], hyper)
    test = ew.evaluate_on(eval_recipe, panel, design, labelled[-1], n_boot=args.boot)
    live = ew.fit_recipe(panel, design, labelled[:-1], labelled[-1], hyper)

    # 2. Score every ongoing project in the latest report.
    current = panel[panel["source_month"] == latest].reset_index(drop=True)
    t_score = time.perf_counter()
    scored = score_rows(live, current, design)
    score_seconds = time.perf_counter() - t_score
    book = build_book(data, current, scored)

    # 3. Advisor, alerts, peers on the whole portfolio.
    adv = advisor.recommend(book)
    scenarios = choose_scenarios(adv["recommendations"])
    alerts = benchmark.build_alerts(book, latest, excluded)
    alerts_by_project: dict[str, list[str]] = {}
    for a in alerts:
        alerts_by_project.setdefault(a["project_code"], []).append(a["type"])
    peers = benchmark.peer_percentiles(book)

    # 4. Curate the prototype sample.
    demo = pick_demo(book, scenarios[0] if scenarios else None)
    sample = select_sample(book, scenarios, demo)
    pos = {c: i for i, c in enumerate(book["project_code"].astype(str))}
    hist = histories(data["ongoing_long"], set(sample))
    records = [
        project_record(book.iloc[pos[c]], scored["grouped"].iloc[pos[c]], hist.get(c, []),
                       alerts_by_project.get(c, []), peers.iloc[pos[c]], report)
        for c in sample
    ]
    records.sort(key=lambda x: (-x["risk"]["score"], x["code"]))

    # 5. Portfolio (official totals + portfolio-wide derived counts).
    kpis = data["kpis"].sort_values("source_month")
    k = kpis[kpis["source_month"] == latest].iloc[0]
    lag = benchmark.reporting_lag(data["completed"], month_index)
    derived = benchmark.portfolio_kpis(book)
    portfolio = {
        "as_of": latest,
        "report": {"number": report.number, "month": latest, "origin": "https://paimana-proj.mospi.gov.in/ReportPage"},
        "official": {
            "ongoing_projects": int(k["ongoing_projects"]),
            "line_ministries": int(k["line_ministries"]),
            "original_cost_cr": float(k["original_cost_cr"]),
            "revised_cost_cr": float(k["revised_cost_cr"]),
            "expenditure_cr": float(k["expenditure_cr"]),
            "expenditure_pct_of_revised": float(k["expenditure_pct_of_revised"]),
            "commissioned_during_month": int(k["commissioned_during_month"]),
            "newly_added_during_month": int(k["newly_added_during_month"]),
            "ner_ongoing_projects": int(k["ner_ongoing_projects"]),
            "source_page": int(k["source_page"]),
        },
        "trend": [
            {
                "month": r["source_month"], "report_number": int(r["report_number"]),
                "ongoing_projects": int(r["ongoing_projects"]), "original_cost_cr": float(r["original_cost_cr"]),
                "revised_cost_cr": float(r["revised_cost_cr"]), "expenditure_cr": float(r["expenditure_cr"]),
            }
            for _, r in kpis.iterrows()
        ],
        "derived": {**derived, "reporting_lag": lag, "overspent_clean_projects": adv["totals"]["shortfall_projects"]},
        "risk_bands": [
            {"band": b, "label": ew.BAND_LABELS[b], "threshold": t, "meaning": BAND_TEXT[b], "projects": derived["risk_bands"][b]}
            for b, t in ew.BANDS
        ],
        "ministries": benchmark.group_benchmarks(book, "ministry_short", "ministry", min_n=1),
        "sample": {"projects": len(records), "note": f"Prototype sample: {len(records)} real projects from Flash Report #{report.number}, chosen to cover every risk band and demo scenario."},
    }

    # 6. Evidence (compact) and Ask PRISM.
    manifest_in = json.loads((PROCESSED_DIR / "manifest.json").read_text(encoding="utf-8"))
    importance = driver_importance(scored["grouped"])
    featured = scenarios[0] if scenarios else None
    evidence = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "question": QUESTION,
        "protocol": {
            "train_months": labelled[:-2], "calibration_month": labelled[-2], "test_month": labelled[-1],
            "test_label_month": latest, "scored_month": latest,
        },
        "models": {m: {"label": s["label"], "track": s["track"], "in_fusion": s["fused"]} for m, s in ew.MODELS.items()},
        "fusion_weights": live.weights,
        "test": compact_test(test),
        "stat_vs_ml": stat_vs_ml(test),
        "driver_importance": importance,
        "bands": [{"band": b, "threshold": t, "meaning": BAND_TEXT[b]} for b, t in ew.BANDS],
        "scoring_time": {
            "projects": len(current), "seconds": round(score_seconds, 3),
            "hardware": f"{platform.system()} {platform.release()}, {platform.machine()}",
        },
        "data": {
            "sources": manifest_in["sources"],
            "reconciliation": manifest_in["reconciliation"],
            "data_quality": manifest_in["data_quality"],
            "dq_rules": [
                {"rule": rule, "title": g["title"].iloc[0], "severity": g["severity"].iloc[0], "findings": int(len(g))}
                for rule, g in data["data_quality_register"].groupby("rule_id")
            ],
            "reporting_lag": lag,
        },
        "cuf_comparison": cuf_comparison(book),
        "cause_check": cause_check(book),
        "limits": [
            "Only five monthly public reports (Apr–Aug 2026) exist as history; the multi-year OCMS archive is not public.",
            "The score predicts an official completion-date revision in the next report — an early signal of time overrun, not the final delay.",
            "Advisor amounts use official figures only (downward revisions, spending above sanction); approvals are outside PRISM.",
            f"Completed projects reach the report a median of {lag['median_lag_months']:.1f} months after they actually finish.",
            "Scores rank where to look first; they are not findings about any agency or official.",
        ],
    }
    advisor_json = {
        "caveat": adv["caveat"],
        "method": adv["method"],
        "totals": adv["totals"],
        "scenarios": scenarios,
        "ministries": adv["ministries"],
        "excluded_for_verification": adv["excluded_for_verification"],
    }
    hero = demo["hero_project"]["code"] if demo["hero_project"] else None
    ask_json = ask.build(portfolio, records, advisor_json, evidence, importance, hero)

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    files = [
        write_json(EXPORT_DIR / "portfolio.json", portfolio),
        write_json(EXPORT_DIR / "projects.json", records),
        write_json(EXPORT_DIR / "advisor.json", advisor_json),
        write_json(EXPORT_DIR / "ask.json", ask_json),
        write_json(EXPORT_DIR / "evidence.json", evidence),
        write_json(EXPORT_DIR / "demo.json", demo),
    ]
    write_json(
        EXPORT_DIR / "manifest.json",
        {
            "generated_at": evidence["generated_at"],
            "pipeline_version": __version__,
            "as_of": latest,
            "sources": manifest_in["sources"],
            "files": files,
            "classes": {
                "OFFICIAL": "Printed in a PAIMANA Flash Report (report number and page given)",
                "DERIVED": "Calculated only from official figures (formula stated)",
                "MODEL ESTIMATE": "PRISM early-warning score, precomputed and tested (see evidence.json)",
                "ILLUSTRATIVE": "Decision-support scenario; never an instruction or a fund transfer",
            },
            "runtime_seconds": round(time.perf_counter() - t0, 1),
        },
    )
    (DOCS_DIR / "evidence-report.md").write_text(evidence_markdown(evidence, featured), encoding="utf-8")

    t = evidence["test"]
    print(f"test month {labelled[-1]}: AUC fused {t['auc']['fused']:.3f} | xgb {t['auc']['xgb']:.3f} | "
          f"logit {t['auc']['logit']:.3f} | rule {t['auc']['rule']:.3f}; High band {t['high_correct']}/{t['high_flagged']} revised")
    print(f"latest {latest}: {len(book):,} projects scored, bands {derived['risk_bands']}")
    print(f"sample: {len(records)} projects | scenarios: {len(scenarios)} | ask intents: {len(ask_json['intents'])}")
    for f in files:
        print(f"  {f['file']:<16} {f['bytes'] / 1024:8.1f} KB")
    print(f"done in {time.perf_counter() - t0:.1f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
