"""Benchmarking & comparative analytics (PS indicative outcome) and the alert feed."""

from __future__ import annotations

import numpy as np
import pandas as pd

MIN_GROUP = 5


def _group_row(g: pd.DataFrame) -> dict:
    slipped = g["slip_months"] > 0
    up = g["cost_ratio"] > 1.001
    return {
        "projects": int(len(g)),
        "original_cost_cr": round(float(g["original_cost_cr"].sum()), 2),
        "sanctioned_cr": round(float(g["sanctioned_cr"].sum()), 2),
        "expenditure_cr": round(float(g["cumulative_expenditure_cr"].sum()), 2),
        "share_delayed": round(float(slipped.mean()), 4),
        "median_delay_months": float(g.loc[slipped, "slip_months"].median()) if slipped.any() else 0.0,
        "share_cost_revised_up": round(float(up[g["cost_ratio"].notna()].mean()), 4) if g["cost_ratio"].notna().any() else None,
        "cost_escalation_cr": round(float((g["sanctioned_cr"] - g["original_cost_cr"]).clip(lower=0).sum()), 2),
        "mean_risk_score": round(float(g["risk_score"].mean()), 2),
        "high_risk": int((g["risk_band"] == "high").sum()),
        "elevated_risk": int((g["risk_band"] == "elevated").sum()),
        "overspent": int((g["cumulative_expenditure_cr"] > g["sanctioned_cr"] + 0.005).sum()),
    }


def group_benchmarks(book: pd.DataFrame, key: str, label_col: str | None = None, min_n: int = MIN_GROUP) -> list[dict]:
    out = []
    for value, g in book.groupby(key):
        if len(g) < min_n:
            continue
        row = {"key": value, "label": g[label_col].iloc[0] if label_col else value}
        row.update(_group_row(g))
        out.append(row)
    out.sort(key=lambda r: -r["projects"])
    return out


def peer_percentiles(book: pd.DataFrame) -> pd.DataFrame:
    """Rank each project against peers of the same sector group and size class."""
    b = book.copy()
    b["peer_group"] = b["hml_category"].fillna("Other") + " · " + b["cost_category"].fillna("")
    g = b.groupby("peer_group")
    out = pd.DataFrame(index=b.index)
    out["project_code"] = b["project_code"]
    out["peer_group"] = b["peer_group"]
    out["peer_n"] = g["project_code"].transform("size").astype(int)
    out["peer_median_delay_months"] = g["slip_months"].transform("median")
    out["peer_median_risk_score"] = g["risk_score"].transform("median")
    out["peer_share_cost_revised_up"] = g["cost_ratio"].transform(lambda s: float((s > 1.001).mean()))
    # percentile: share of peers with a *lower* value (0 = best in group, 100 = worst)
    out["delay_percentile"] = (g["slip_months"].rank(pct=True, method="max") * 100).round(0)
    out["risk_percentile"] = (g["risk_score"].rank(pct=True, method="max") * 100).round(0)
    return out


ALERT_TYPES = {
    "high_delay_risk": ("high", "MODEL ESTIMATE", "High risk of a completion-date revision in the next report"),
    "overspent": ("high", "OFFICIAL-DERIVED", "Expenditure above sanctioned cost"),
    "deadline_crunch": ("medium", "OFFICIAL-DERIVED", "Target date within a month, substantial work remaining"),
    "repeat_revisions": ("medium", "OFFICIAL-DERIVED", "Completion date pushed back repeatedly"),
    "overdue_unrevised": ("medium", "OFFICIAL-DERIVED", "Original target passed, no revised date"),
    "status_check": ("info", "OFFICIAL-DERIVED", "Reported 100% complete but still listed as ongoing"),
    "verify_data": ("info", "DATA QUALITY", "Figures need verification before use"),
}
SEVERITY_ORDER = {"high": 0, "medium": 1, "info": 2}


def build_alerts(book: pd.DataFrame, month: str, dq_error_codes: set[str]) -> list[dict]:
    alerts = []

    def add(row, kind, detail):
        severity, evidence, title = ALERT_TYPES[kind]
        alerts.append(
            {
                "id": f"{kind}:{row['project_code']}",
                "type": kind,
                "severity": severity,
                "evidence": evidence,
                "title": title,
                "detail": detail,
                "project_code": str(row["project_code"]),
                "project_name": row["project_name"],
                "ministry_short": row["ministry_short"],
                "agency": row["agency"],
                "state_label": row["state_label"],
                "risk_score": float(row["risk_score"]),
                "month": month,
                "source_page": int(row["source_page"]),
            }
        )

    for _, r in book.iterrows():
        code = str(r["project_code"])
        verify = code in dq_error_codes
        if verify:
            add(r, "verify_data", "Error-level data-quality finding (see the data-quality register); excluded from model training and the Advisor.")
        if r["risk_band"] == "high":
            add(r, "high_delay_risk", f"PRISM score {r['risk_score']:.1f}/10: {r['drivers_text']}")
        if not verify and r["cumulative_expenditure_cr"] > r["sanctioned_cr"] + 0.005:
            add(
                r,
                "overspent",
                f"₹{r['cumulative_expenditure_cr']:,.2f} Cr spent against a sanctioned ₹{r['sanctioned_cr']:,.2f} Cr "
                f"(₹{r['cumulative_expenditure_cr'] - r['sanctioned_cr']:,.2f} Cr above).",
            )
        m = r["months_to_expected"]
        if pd.notna(m) and 0 <= m <= 1 and r["physical_progress_pct"] <= 80:
            add(
                r,
                "deadline_crunch",
                f"Target {r['expected_doc_label']} with {100 - r['physical_progress_pct']:.0f}% of the work remaining.",
            )
        if r["n_slips_so_far"] >= 2:
            add(r, "repeat_revisions", f"Completion date pushed back {int(r['n_slips_so_far'])} times in the reports tracked.")
        if r["overdue_no_revision"] >= 1:
            add(r, "overdue_unrevised", f"Original target {r['original_doc_label']} has passed; no revised date recorded.")
        if r["physical_progress_pct"] >= 100:
            add(
                r,
                "status_check",
                "Completions reach the Flash Report a median of 17.5 months after the actual completion date; "
                "confirm whether this project should move to the completed list.",
            )
    alerts.sort(key=lambda a: (SEVERITY_ORDER[a["severity"]], -a["risk_score"]))
    return alerts


def reporting_lag(completed: pd.DataFrame, month_index) -> dict:
    lag = completed["source_month"].map(month_index) - completed["actual_completion"].map(month_index)
    lag = lag.dropna()
    return {
        "completed_with_dates": int(len(lag)),
        "median_lag_months": float(lag.median()),
        "share_over_12_months": round(float((lag > 12).mean()), 4),
        "by_report": {
            m: int(n) for m, n in completed.groupby("source_month").size().items()
        },
    }


def portfolio_kpis(book: pd.DataFrame) -> dict:
    slipped = book["slip_months"] > 0
    return {
        "projects": int(len(book)),
        "original_cost_cr": round(float(book["original_cost_cr"].sum()), 2),
        "sanctioned_cr": round(float(book["sanctioned_cr"].sum()), 2),
        "expenditure_cr": round(float(book["cumulative_expenditure_cr"].sum()), 2),
        "delayed_projects": int(slipped.sum()),
        "median_delay_months": float(book.loc[slipped, "slip_months"].median()),
        "cost_revised_up_projects": int((book["cost_ratio"] > 1.001).sum()),
        "risk_bands": {b: int((book["risk_band"] == b).sum()) for b in ("high", "elevated", "moderate", "low")},
        "overspent_projects": int((book["cumulative_expenditure_cr"] > book["sanctioned_cr"] + 0.005).sum()),
        "mean_risk_score": round(float(np.mean(book["risk_score"])), 2),
    }
