"""Plain-language drivers from exact additive contributions (SHAP / linear terms).

Design-matrix columns are grouped into drivers a monitoring officer recognises
(e.g. all the due-date columns form "Deadline pressure"), so the top-3 list never
repeats one idea three times. Every driver sentence quotes the project's own
official values.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

from .common import sigmoid
from .features import TEXT_FLAGS

DRIVER_LABELS: dict[str, str] = {
    "deadline": "Deadline pressure",
    "recent_slip": "Recent date revisions",
    "slip_history": "Delay so far",
    "overdue_unrevised": "Overdue without a revised date",
    "progress": "Physical progress",
    "progress_pace": "Progress last month",
    "elapsed": "Time elapsed",
    "spending": "Spending vs progress",
    "spending_pace": "Spending last month",
    "cost_revision": "Cost revision",
    "scale": "Project size",
    "age": "Time since sanction",
    "planned_duration": "Planned duration",
    "new_on_list": "Reporting history",
    "location": "Location",
    "ministry": "Ministry pattern",
    "agency": "Implementing-agency pattern",
    "sector": "Sector pattern",
    **{k: label for k, (_, label) in TEXT_FLAGS.items()},
}

_COLUMN_DRIVER = {
    "months_to_expected": "deadline", "due_overdue": "deadline", "due_0_1": "deadline", "due_2_3": "deadline",
    "due_4_12": "deadline", "due_13_plus": "deadline", "required_rate": "deadline",
    "slipped_last_month": "recent_slip", "n_slips_so_far": "recent_slip",
    "slip_so_far_months": "slip_history", "slip_ratio": "slip_history",
    "overdue_no_revision": "overdue_unrevised",
    "physical_progress": "progress", "progress_rate_1m": "progress_pace", "elapsed_ratio": "elapsed",
    "financial_progress": "spending", "fin_minus_phys": "spending", "spend_rate_1m": "spending_pace",
    "sanctioned_ratio": "cost_revision", "revised_cost_known": "cost_revision",
    "log_original_cost": "scale", "is_mega": "scale",
    "months_since_approval": "age", "months_since_start": "age", "planned_duration": "planned_duration",
    "has_history": "new_on_list",
    "is_ner": "location", "is_hill_state": "location", "is_multi_state": "location", "is_pan_india": "location",
}
_PREFIX_DRIVER = {"ministry_short": "ministry", "agency_group": "agency", "hml_category": "sector", "state_group": "location"}

# B5: published root causes (J. Inst. Eng. India A, 2019 - citations.md A5) and the
# drivers that are observable proxies for them in PAIMANA data.
PUBLISHED_CAUSE_PROXIES: dict[str, str] = {
    "cost_revision": "price escalation",
    "scale": "high capital cost",
    "txt_balance_work": "poor contractor performance (contract re-tendered)",
    "txt_greenfield": "land acquisition (new alignment)",
}


def driver_of(column: str) -> str:
    if column in TEXT_FLAGS:
        return column
    if "=" in column:
        return _PREFIX_DRIVER[column.split("=")[0]]
    return _COLUMN_DRIVER[column]


def is_non_cuf_driver(key: str) -> bool:
    return key in TEXT_FLAGS


def group_contributions(contrib: pd.DataFrame) -> pd.DataFrame:
    """Sum design-column contributions into driver groups (same rows)."""
    mapping = {c: driver_of(c) for c in contrib.columns}
    return contrib.T.groupby(mapping).sum().T


def _month(value) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)) or pd.isna(value):
        return "not recorded"
    return pd.Timestamp(value).strftime("%b %Y")


def _num(value, default=float("nan")) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return default
    return v


def _plural(n: float, word: str) -> str:
    n = int(round(n))
    return f"{n} {word}{'' if abs(n) == 1 else 's'}"


def driver_text(key: str, row: pd.Series) -> str:
    """One sentence quoting the project's own values."""
    p = _num(row.get("physical_progress"))
    if key == "deadline":
        m = _num(row.get("months_to_expected"))
        date = _month(row.get("expected_doc"))
        remaining = f"; {max(0.0, 100 - p):.0f}% of the work remains" if not math.isnan(p) else ""
        if math.isnan(m):
            return "No completion date on record"
        if m < 0:
            return f"Current target date ({date}) passed {_plural(-m, 'month')} ago{remaining}"
        if m <= 1:
            return f"Current target date ({date}) falls within the next month{remaining}"
        return f"Current target date ({date}) is {_plural(m, 'month')} away{remaining}"
    if key == "recent_slip":
        k = int(_num(row.get("n_slips_so_far"), 0))
        if _num(row.get("slipped_last_month"), 0) >= 1:
            extra = f" ({_plural(k, 'revision')} in the reports tracked)" if k > 1 else ""
            return f"Completion date was pushed back in the last report{extra}"
        if k > 0:
            return f"Completion date was pushed back {_plural(k, 'time')} in earlier reports"
        return "No completion-date revision in the reports tracked"
    if key == "slip_history":
        s = _num(row.get("slip_so_far_months"))
        orig = _month(row.get("original_doc"))
        if math.isnan(s):
            return "Original target date not recorded"
        if s > 0:
            return f"Already {_plural(s, 'month')} behind the original target ({orig})"
        return f"Still on its original target date ({orig})"
    if key == "overdue_unrevised":
        if _num(row.get("overdue_no_revision"), 0) >= 1:
            return f"Original target ({_month(row.get('original_doc'))}) has passed with no revised date on record"
        return "Target date on record is current"
    if key == "progress":
        return f"Physical progress is {p:.0f}%" if not math.isnan(p) else "Physical progress not reported"
    if key == "progress_pace":
        d = _num(row.get("progress_rate_1m"))
        if math.isnan(d):
            return "No month-on-month progress history yet"
        if d <= 0:
            return "No physical progress recorded in the last month"
        return f"Physical progress rose {d:.1f} points in the last month"
    if key == "elapsed":
        e = _num(row.get("elapsed_ratio"))
        return f"{e * 100:.0f}% of the planned duration has elapsed" if not math.isnan(e) else "Start date not recorded"
    if key == "spending":
        f = _num(row.get("financial_progress"))
        if math.isnan(f) or math.isnan(p):
            return "Spending or progress not reported"
        return f"{f * 100:.0f}% of the sanctioned cost spent at {p:.0f}% physical progress"
    if key == "spending_pace":
        x = _num(row.get("spend_rate_1m"))
        if math.isnan(x):
            return "No month-on-month spending history yet"
        return f"Spending in the last month equalled {x * 100:.1f}% of the sanctioned cost"
    if key == "cost_revision":
        r = _num(row.get("sanctioned_ratio"), 1.0)
        if r > 1.001:
            return f"Cost already revised {100 * (r - 1):.0f}% above the original sanction"
        if r < 0.999:
            return f"Cost revised {100 * (1 - r):.0f}% below the original sanction"
        return "No cost revision on record"
    if key == "scale":
        c = _num(row.get("original_cost_cr"))
        kind = "Mega project" if c >= 1000 else "Project"
        return f"{kind} of ₹{c:,.0f} Cr original cost"
    if key == "age":
        m = _num(row.get("months_since_approval"))
        return f"Sanctioned {_plural(m, 'month')} ago" if not math.isnan(m) else "Approval date not recorded"
    if key == "planned_duration":
        m = _num(row.get("planned_duration"))
        return f"Planned duration of {_plural(m, 'month')}" if not math.isnan(m) else "Planned duration not derivable"
    if key == "new_on_list":
        if _num(row.get("has_history"), 0) >= 1:
            return "Tracked across consecutive monthly reports"
        return "First month in the monitoring list: no trend yet"
    if key == "location":
        label = str(row.get("state_label") or "")
        if label == "Multi-States":
            head = "Spans multiple states"
        elif label == "PAN India":
            head = "Nationwide (PAN India) project"
        elif label:
            head = f"Located in {label}"
        else:
            head = "Location not recorded"
        extras = []
        if _num(row.get("is_ner"), 0) >= 1:
            extras.append("North-Eastern Region")
        if _num(row.get("is_hill_state"), 0) >= 1:
            extras.append("hill terrain")
        return head + (f" ({', '.join(extras)})" if extras else "")
    if key == "ministry":
        return f"Historical pattern of {row.get('ministry_short')} projects"
    if key == "agency":
        group = row.get("agency_group")
        if group == "Other":
            return f"Pattern of agencies with few projects in the list, incl. {row.get('agency')}"
        return f"Historical pattern of {row.get('agency')} projects"
    if key == "sector":
        return f"Historical pattern of {row.get('hml_category')} projects"
    if key in TEXT_FLAGS:
        label = TEXT_FLAGS[key][1]
        if _num(row.get(key), 0) >= 1:
            return f"Project description indicates: {label}"
        return f"Project description does not indicate: {label}"
    raise KeyError(key)


MIN_LOG_ODDS = 0.05  # smaller contributions are not worth a sentence
MIN_IMPACT_POINTS = 0.05  # a risk-raising driver must move the 0-10 score by at least this much


def displayable(key: str, value: float, row: pd.Series) -> bool:
    """Show a driver only when its sentence supports its direction.

    The model can give weight to the *absence* of something (e.g. 'no EPC mention');
    that is real arithmetic but not a reason a monitoring officer can act on.
    """
    if abs(value) < MIN_LOG_ODDS:
        return False
    up = value > 0
    if key in TEXT_FLAGS:
        return _num(row.get(key), 0) >= 1
    if key == "recent_slip":
        revised = _num(row.get("slipped_last_month"), 0) >= 1 or _num(row.get("n_slips_so_far"), 0) > 0
        return revised == up
    if key == "overdue_unrevised":
        return (_num(row.get("overdue_no_revision"), 0) >= 1) == up
    if key == "slip_history":
        return (_num(row.get("slip_so_far_months"), 0) > 0) == up
    if key == "cost_revision":
        revised = abs(_num(row.get("sanctioned_ratio"), 1.0) - 1) > 0.001
        return revised or not up
    if key == "new_on_list":
        return up and _num(row.get("has_history"), 1) < 1
    if key in ("spending", "spending_pace"):
        return up  # "spent a lot, so lower risk" reads as nonsense to a reviewer
    return True


def top_drivers(
    grouped: pd.DataFrame, fused_logit: np.ndarray, panel_rows: pd.DataFrame, k_up: int = 3, k_down: int = 2
) -> list[list[dict]]:
    """Per row: top risk-raising drivers (those that move the score) and protective factors."""
    out = []
    p_full = sigmoid(fused_logit)
    for i, (idx, contrib) in enumerate(grouped.iterrows()):
        row = panel_rows.loc[idx]
        order = contrib.sort_values(ascending=False)

        def points(v):
            return 10 * (p_full[i] - sigmoid(fused_logit[i] - v))

        ups = [
            (k, v) for k, v in order.items()
            if v > 0 and displayable(k, v, row) and points(v) >= MIN_IMPACT_POINTS
        ][:k_up]
        downs = [(k, v) for k, v in order[::-1].items() if v < 0 and displayable(k, v, row)][:k_down]
        items = []
        for key, value in ups + downs:
            impact = points(value)
            items.append(
                {
                    "key": key,
                    "label": DRIVER_LABELS[key],
                    "text": driver_text(key, row),
                    "direction": "raises" if value > 0 else "lowers",
                    "log_odds": round(float(value), 4),
                    "impact_points": round(float(impact), 2),
                    "data": "Non-CUF (from project description)" if is_non_cuf_driver(key) else "CUF",
                }
            )
        out.append(items)
    return out
