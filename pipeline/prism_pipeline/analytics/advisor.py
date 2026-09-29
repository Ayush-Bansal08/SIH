"""Portfolio Budget Buffer & Reallocation Advisor (prescriptive layer).

Prototype rules — every amount comes from official Flash Report figures:
  * Buffer (possible source): the project's latest revised cost is *below* its original
    approved cost (an official downward revision). Buffer = original - revised.
  * Shortfall (possible need): cumulative expenditure already *exceeds* the sanctioned
    cost (latest revised cost, else original). Shortfall = expenditure - sanctioned.
  * Matching only inside the same ministry/department (the grant-holding level),
    same implementing agency first; low-delay-risk, near-complete sources first.
  * Projects with error-level or implausible-expenditure data-quality findings are
    never used; they are listed for verification instead.

PRISM recommends; it never executes transfers.
"""

from __future__ import annotations

import pandas as pd

CAVEAT = (
    "Illustrative decision-support scenario, not an actual fund transfer. Government fund "
    "reallocation between projects requires formal approval (re-appropriation orders, sanction "
    "rules). PRISM shows where reallocation could help, if your approval process allows it."
)

SUSPECT_RULES = frozenset({"DQ01", "DQ02", "DQ03", "DQ12", "DQ16"})
# A revised cost below half the original is far outside normal downward revisions
# (tender savings are typically 10-40%); in the reports such rows include entry errors
# (e.g. a revised cost of Rs 0.10 Cr against Rs 238.66 Cr original). They are never
# offered as a buffer or counted as a shortfall until verified. Large *upward*
# revisions are left alone: they are common and real (e.g. Polavaram).
MIN_PLAUSIBLE_RATIO = 0.5
MIN_AMOUNT_CR = 1.0
_BAND_ORDER = {"low": 0, "moderate": 1, "elevated": 2, "high": 3}


def _flags(value) -> set[str]:
    if value is None:
        return set()
    if isinstance(value, str):
        return {v.strip() for v in value.split(";") if v.strip()}
    return {str(v) for v in value}


def implausible_revision(book: pd.DataFrame) -> pd.Series:
    r = book["cost_ratio"]
    return r.notna() & (r < MIN_PLAUSIBLE_RATIO)


def data_flagged(book: pd.DataFrame) -> pd.Series:
    """Error-level or implausible-expenditure data-quality findings (Phase 1 rules)."""
    return book["dq_flags"].map(lambda f: bool(_flags(f) & SUSPECT_RULES)) | book["dq_has_error"].astype(bool)


def is_suspect(book: pd.DataFrame) -> pd.Series:
    """Not used for any money suggestion until verified."""
    return data_flagged(book) | implausible_revision(book)


def candidates(book: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    b = book.copy()
    ok = ~is_suspect(b)
    slack = b["original_cost_cr"] - b["sanctioned_cr"]
    overspend = b["cumulative_expenditure_cr"] - b["sanctioned_cr"]
    donors = b[ok & (slack >= MIN_AMOUNT_CR) & (overspend <= 0)].copy()
    donors["buffer_cr"] = slack[donors.index].round(2)
    recipients = b[ok & (overspend >= MIN_AMOUNT_CR)].copy()
    recipients["shortfall_cr"] = overspend[recipients.index].round(2)
    return donors, recipients


def _party(row, role: str) -> dict:
    out = {
        "project_code": str(row["project_code"]),
        "project_name": row["project_name"],
        "agency": row["agency"],
        "state_label": row["state_label"],
        "original_cost_cr": round(float(row["original_cost_cr"]), 2),
        "sanctioned_cr": round(float(row["sanctioned_cr"]), 2),
        "expenditure_cr": round(float(row["cumulative_expenditure_cr"]), 2),
        "physical_progress_pct": round(float(row["physical_progress_pct"]), 2),
        "risk_score": float(row["risk_score"]),
        "risk_band": row["risk_band"],
        "source_page": int(row["source_page"]),
    }
    if role == "donor":
        out["buffer_cr"] = float(row["buffer_cr"])
    else:
        out["shortfall_cr"] = float(row["shortfall_cr"])
    return out


def _sentence(ministry: str, d, r, amount: float, same_agency: bool) -> str:
    where = f"the same agency ({d['agency']})" if same_agency else f"{r['agency']}, under the same ministry"
    return (
        f"In {ministry}, project {d['project_code']} is running ₹{d['buffer_cr']:,.2f} Cr below its original "
        f"approved cost after an official downward revision, while project {r['project_code']} in {where} has "
        f"already spent ₹{r['shortfall_cr']:,.2f} Cr beyond its sanctioned cost. PRISM suggests evaluating a "
        f"reallocation of up to ₹{amount:,.2f} Cr, subject to standard government re-appropriation approval."
    )


def recommend(book: pd.DataFrame) -> dict:
    donors, recipients = candidates(book)
    remaining = donors["buffer_cr"].astype(float).to_dict()
    recipients = recipients.sort_values(["shortfall_cr", "project_code"], ascending=[False, True])

    recs: list[dict] = []
    for _, r in recipients.iterrows():
        need = float(r["shortfall_cr"])
        pool = donors[donors["ministry"] == r["ministry"]]
        if pool.empty:
            continue
        pool = pool.assign(
            _other_agency=(pool["agency_key"] != r["agency_key"]).astype(int),
            _risk=pool["risk_band"].map(_BAND_ORDER).fillna(1),
            _rem=[remaining[i] for i in pool.index],
        )
        pool = pool[pool["_rem"] >= MIN_AMOUNT_CR].sort_values(
            ["_other_agency", "_risk", "physical_progress_pct", "_rem", "project_code"],
            ascending=[True, True, False, False, True],
        )
        for idx, d in pool.iterrows():
            if need < MIN_AMOUNT_CR:
                break
            amount = round(min(remaining[idx], need), 2)
            remaining[idx] = round(remaining[idx] - amount, 2)
            need = round(need - amount, 2)
            same = d["agency_key"] == r["agency_key"]
            recs.append(
                {
                    "id": f"R{len(recs) + 1:03d}",
                    "ministry": r["ministry"],
                    "ministry_short": r["ministry_short"],
                    "match_level": "same agency" if same else "same ministry",
                    "suggested_amount_cr": amount,
                    "share_of_shortfall": round(amount / float(r["shortfall_cr"]), 4),
                    "source": _party(d, "donor"),
                    "destination": _party(r, "recipient"),
                    "sentence": _sentence(r["ministry"], d, r, amount, same),
                    "evidence": {
                        "buffer": "DERIVED from official figures: original cost − latest revised cost (Flash Report)",
                        "shortfall": "DERIVED from official figures: cumulative expenditure − sanctioned cost (Flash Report)",
                    },
                }
            )

    matched = {}
    for x in recs:
        code = x["destination"]["project_code"]
        matched[code] = matched.get(code, 0.0) + x["suggested_amount_cr"]

    ministries = []
    for ministry, grp in book.groupby("ministry"):
        d = donors[donors["ministry"] == ministry]
        r = recipients[recipients["ministry"] == ministry]
        m_recs = [x for x in recs if x["ministry"] == ministry]
        need = float(r["shortfall_cr"].sum())
        got = float(sum(x["suggested_amount_cr"] for x in m_recs))
        ministries.append(
            {
                "ministry": ministry,
                "ministry_short": grp["ministry_short"].iloc[0],
                "projects": int(len(grp)),
                "buffer_projects": int(len(d)),
                "buffer_cr": round(float(d["buffer_cr"].sum()), 2),
                "shortfall_projects": int(len(r)),
                "shortfall_cr": round(need, 2),
                "matched_cr": round(got, 2),
                "unmatched_shortfall_cr": round(max(0.0, need - got), 2),
                "recommendations": len(m_recs),
            }
        )
    ministries.sort(key=lambda s: (-s["shortfall_cr"], -s["buffer_cr"]))

    unmatched = [
        {**_party(r, "recipient"), "matched_cr": round(matched.get(str(r["project_code"]), 0.0), 2)}
        for _, r in recipients.iterrows()
        if float(r["shortfall_cr"]) - matched.get(str(r["project_code"]), 0.0) >= MIN_AMOUNT_CR
    ]
    suspect = book[is_suspect(book)]
    return {
        "caveat": CAVEAT,
        "method": __doc__.strip(),
        "totals": {
            "buffer_projects": int(len(donors)),
            "buffer_cr": round(float(donors["buffer_cr"].sum()), 2),
            "shortfall_projects": int(len(recipients)),
            "shortfall_cr": round(float(recipients["shortfall_cr"].sum()), 2),
            "recommendations": len(recs),
            "matched_cr": round(float(sum(x["suggested_amount_cr"] for x in recs)), 2),
            "same_agency": sum(1 for x in recs if x["match_level"] == "same agency"),
            "unmatched_shortfall_projects": len(unmatched),
        },
        "recommendations": recs,
        "ministries": ministries,
        "unmatched": unmatched,
        "excluded_for_verification": sorted(suspect["project_code"].astype(str)),
    }
