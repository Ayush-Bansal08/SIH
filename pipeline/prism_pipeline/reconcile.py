"""Reconcile extracted project rows against the totals the reports themselves print.

This is the proof that extraction is complete and faithful: if every row
had been read correctly, the sums must equal the official totals.
Tolerances cover the reports' own rounding (overview KPIs are rounded to
whole crores; per-row values to 2 decimals).
"""

from __future__ import annotations

import pandas as pd

ROUNDING_CR = 1.0  # overview KPIs are printed rounded to the crore
ROW_ROUNDING_CR = 0.5  # sums of 2-decimal values vs printed 2-decimal totals
# Table 1 / subtotals are computed by the portal from unrounded source values, while
# Table 6 prints each row to 2 decimals. The accumulated difference grows with the
# number of rows summed (observed: up to 0.5 cr over MoRTH's ~980 rows). Row
# *counts* are always checked exactly, and a misread value would be orders of
# magnitude larger than this allowance.
PER_ROW_ROUNDING_CR = 0.0005


def _sum_tol(n_rows: int) -> float:
    return max(ROW_ROUNDING_CR, PER_ROW_ROUNDING_CR * n_rows)


def _check(results: list, check_id: str, month: str, scope: str, expected, actual, tol: float = 0.0) -> None:
    if expected is None or (isinstance(expected, float) and pd.isna(expected)):
        results.append({"check_id": check_id, "month": month, "scope": scope, "expected": None,
                        "actual": actual, "delta": None, "passed": None, "note": "no official figure printed"})
        return
    delta = None if actual is None else float(actual) - float(expected)
    passed = delta is not None and abs(delta) <= tol + 1e-9
    results.append({"check_id": check_id, "month": month, "scope": scope, "expected": expected,
                    "actual": actual, "delta": delta, "passed": passed, "note": ""})


def reconcile(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    res: list[dict] = []
    ongoing, kpis = tables["ongoing_long"], tables["kpis"].set_index("source_month")
    mt, gt = tables["ministry_totals"], tables["group_totals"]
    completed, newly = tables["completed"], tables["newly_added"]
    sector_ov = tables["sector_overview"]

    for month, rows in ongoing.groupby("source_month"):
        k = kpis.loc[month]
        _check(res, "R01", month, "Table 6 rows = overview 'Ongoing Projects'", k["ongoing_projects"], len(rows))
        _check(res, "R02", month, "Sum original cost = overview Original Cost (rounded)",
               k["original_cost_cr"], round(rows["original_cost_cr"].sum(), 2), max(ROUNDING_CR, _sum_tol(len(rows))))
        _check(res, "R03", month, "Sum expenditure = overview Expenditure (rounded)",
               k["expenditure_cr"], round(rows["cumulative_expenditure_cr"].sum(), 2), max(ROUNDING_CR, _sum_tol(len(rows))))

        grand = mt[(mt["source_month"] == month) & (mt["level"] == "grand_total")]
        if not grand.empty:
            g = grand.iloc[0]
            _check(res, "R04", month, "Table 6 rows = Table 1 grand total count", g["project_count"], len(rows))
            _check(res, "R05", month, "Sum original cost = Table 1 grand total",
                   g["original_cost_cr"], round(rows["original_cost_cr"].sum(), 2), _sum_tol(len(rows)))
            _check(res, "R06", month, "Sum expenditure = Table 1 grand total",
                   g["expenditure_cr"], round(rows["cumulative_expenditure_cr"].sum(), 2), _sum_tol(len(rows)))

        by_min = rows.groupby("ministry").agg(n=("project_code", "size"), orig=("original_cost_cr", "sum"),
                                              exp=("cumulative_expenditure_cr", "sum"))
        mtot = mt[(mt["source_month"] == month) & (mt["level"] == "ministry_total")].set_index("ministry")
        for ministry, t in mtot.iterrows():
            a = by_min.loc[ministry] if ministry in by_min.index else None
            _check(res, "R07", month, f"{ministry}: count", t["project_count"], None if a is None else int(a["n"]))
            _check(res, "R08", month, f"{ministry}: original cost", t["original_cost_cr"],
                   None if a is None else round(a["orig"], 2), _sum_tol(0 if a is None else int(a["n"])))
            _check(res, "R09", month, f"{ministry}: expenditure", t["expenditure_cr"],
                   None if a is None else round(a["exp"], 2), _sum_tol(0 if a is None else int(a["n"])))

        g6 = gt[(gt["source_month"] == month) & (gt["source_table"] == "Table 6")]
        by_grp = rows.groupby(["ministry", "sector"]).agg(n=("project_code", "size"), orig=("original_cost_cr", "sum"),
                                                          exp=("cumulative_expenditure_cr", "sum"))
        for _, t in g6.iterrows():
            key = (t["ministry"], t["sector"])
            a = by_grp.loc[key] if key in by_grp.index else None
            scope = f"{t['ministry']} / {t['sector']}"
            _check(res, "R10", month, f"{scope}: 'Total (n)' count", t["declared_count"], None if a is None else int(a["n"]))
            _check(res, "R11", month, f"{scope}: original cost", t["declared_original_cost_cr"],
                   None if a is None else round(a["orig"], 2), _sum_tol(0 if a is None else int(a["n"])))
            _check(res, "R12", month, f"{scope}: expenditure", t["declared_expenditure_cr"],
                   None if a is None else round(a["exp"], 2), _sum_tol(0 if a is None else int(a["n"])))

        so = sector_ov[sector_ov["source_month"] == month]
        by_sec = rows.groupby("sector").agg(n=("project_code", "size"))
        for _, s in so.iterrows():
            a = by_sec.loc[s["sector"]] if s["sector"] in by_sec.index else None
            _check(res, "R13", month, f"HML sector '{s['sector']}': count", s["project_count"], None if a is None else int(a["n"]))

        _check(res, "R14", month, "Table 3 rows = 'Commissioned during month'", k["commissioned_during_month"],
               int((completed["source_month"] == month).sum()))
        _check(res, "R15", month, "Table 4 rows = 'Newly Added during month'", k["newly_added_during_month"],
               int((newly["source_month"] == month).sum()))
        _check(res, "R16", month, "Table 5 (NER) rows = NER page 'Ongoing Projects'", k.get("ner_ongoing_projects"),
               int(rows["is_ner_official"].sum()))
        _check(res, "R17", month, "No duplicate project codes", 0, int(rows["project_code"].duplicated().sum()))
        _check(res, "R18", month, "No project row missing a code", 0, int(rows["project_code"].isna().sum()))
        _check(res, "R19", month, "No project row missing ministry/sector", 0,
               int((rows["ministry"].isna() | rows["sector"].isna()).sum()))
    return pd.DataFrame(res)
