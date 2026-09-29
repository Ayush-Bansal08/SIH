"""Data-quality rules. Flag, never fix.

Each finding records the rule, severity, the observed values and the
exact report/page it came from, so a MoSPI officer can verify it against
the PDF. Severity:
  error    — almost certainly an entry error; excluded from model training
  warning  — implausible or inconsistent; kept, but visible to the user
  info     — noteworthy reporting pattern, not an error
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from .config import MONITORING_THRESHOLD_CR
from .parse import months_between


@dataclass(frozen=True)
class Rule:
    rule_id: str
    severity: str
    title: str
    description: str


RULES = {
    r.rule_id: r
    for r in [
        Rule("DQ01", "error", "Expenditure > 10x sanctioned cost",
             "Cumulative expenditure exceeds ten times the latest sanctioned cost; likely a unit or entry error."),
        Rule("DQ02", "warning", "Expenditure 2-10x sanctioned cost",
             "Cumulative expenditure is 2-10x the latest sanctioned cost; the revised cost is probably outdated."),
        Rule("DQ03", "error", "Complete with no expenditure",
             "Physical progress is 100% but cumulative expenditure is zero or not reported."),
        Rule("DQ04", "warning", "Near-complete but little spent",
             "Physical progress is at least 90% while expenditure is under 10% of sanctioned cost."),
        Rule("DQ05", "warning", "Spending far ahead of progress",
             "Physical progress is 0% while expenditure is at least 25% of sanctioned cost."),
        Rule("DQ06", "error", "Progress outside 0-100%", "Physical progress is outside the valid 0-100% range."),
        Rule("DQ07", "warning", "Below monitoring threshold",
             "Sanctioned cost is below Rs 150 crore, the framework's monitoring threshold (report note 1: under reconciliation)."),
        Rule("DQ08", "warning", "Target completion before approval",
             "Original/target date of completion is earlier than the date of approval."),
        Rule("DQ09", "info", "Revised completion earlier than original",
             "The revised date of completion is earlier than the original target."),
        Rule("DQ10", "warning", "Overdue with no revised schedule",
             "The original target date has passed as of the report month and no revised date of completion is reported."),
        Rule("DQ11", "warning", "Approval date missing", "Date of approval is reported as NA."),
        Rule("DQ12", "error", "Invalid implementing agency", "Implementing agency is recorded as an invalid placeholder."),
        Rule("DQ13", "warning", "Physical progress went down",
             "Reported physical progress fell by more than 1 point versus the previous month."),
        Rule("DQ14", "warning", "Cumulative expenditure went down",
             "Cumulative expenditure fell by more than 1% versus the previous month (it should never decrease)."),
        Rule("DQ15", "warning", "Original cost changed",
             "The original (sanctioned) cost differs from the previous month's report."),
        Rule("DQ16", "error", "Duplicate project code", "The same project code appears more than once in one month."),
        Rule("DQ17", "warning", "Left the list without completion",
             "Project disappeared from the ongoing list without appearing in the completed-projects table."),
        Rule("DQ18", "info", "Actual completion long before report",
             "Listed as completed in this month's report, but the actual completion date is more than 12 months earlier."),
    ]
}


def _finding(rule_id: str, row: pd.Series, detail: str, month: str | None = None) -> dict:
    rule = RULES[rule_id]
    return {
        "rule_id": rule_id,
        "severity": rule.severity,
        "title": rule.title,
        "detail": detail,
        "source_month": month or row.get("source_month"),
        "source_table": row.get("source_table"),
        "source_page": row.get("source_page"),
        "project_code": row.get("project_code"),
        "project_name": row.get("project_name"),
        "ministry": row.get("ministry"),
    }


def _sanctioned(row: pd.Series) -> float | None:
    values = [v for v in (row.get("original_cost_cr"), row.get("revised_cost_latest_cr"), row.get("revised_cost_cr"))
              if v is not None and not pd.isna(v)]
    return max(values) if values else None


def _month_date(month: str):
    return pd.Timestamp(f"{month}-01").date()


def check_snapshot(projects: pd.DataFrame) -> list[dict]:
    """Rules on the latest snapshot (one row per project)."""
    out = []
    for _, r in projects.iterrows():
        cost = _sanctioned(r)
        exp = r.get("cumulative_expenditure_cr")
        prog = r.get("physical_progress_pct")
        exp = None if pd.isna(exp) else exp
        prog = None if pd.isna(prog) else prog
        ratio = exp / cost if (exp is not None and cost) else None

        if ratio is not None and ratio > 10:
            out.append(_finding("DQ01", r, f"expenditure Rs {exp:,.2f} cr vs sanctioned Rs {cost:,.2f} cr ({ratio:.0f}x)"))
        elif ratio is not None and ratio >= 2:
            out.append(_finding("DQ02", r, f"expenditure Rs {exp:,.2f} cr vs sanctioned Rs {cost:,.2f} cr ({ratio:.1f}x)"))
        if prog == 100 and not exp:
            out.append(_finding("DQ03", r, f"progress 100%, expenditure {exp if exp is not None else 'not reported'}"))
        if prog is not None and prog >= 90 and ratio is not None and ratio < 0.10:
            out.append(_finding("DQ04", r, f"progress {prog:.2f}%, spent {ratio:.1%} of sanctioned cost"))
        if prog == 0 and ratio is not None and ratio >= 0.25:
            out.append(_finding("DQ05", r, f"progress 0%, spent {ratio:.1%} of sanctioned cost"))
        if prog is not None and not (0 <= prog <= 100):
            out.append(_finding("DQ06", r, f"progress {prog}"))
        if cost is not None and cost < MONITORING_THRESHOLD_CR:
            out.append(_finding("DQ07", r, f"sanctioned cost Rs {cost:,.2f} cr"))
        approval, odoc, rdoc = r.get("date_of_approval"), r.get("original_doc"), r.get("revised_doc")
        approval = None if pd.isna(approval) else approval
        odoc = None if pd.isna(odoc) else odoc
        rdoc = None if pd.isna(rdoc) else rdoc
        if approval and odoc and odoc < approval:
            out.append(_finding("DQ08", r, f"approved {approval:%m/%Y}, target completion {odoc:%m/%Y}"))
        if odoc and rdoc and rdoc < odoc:
            out.append(_finding("DQ09", r, f"original {odoc:%m/%Y}, revised {rdoc:%m/%Y}"))
        report_date = _month_date(r["source_month"])
        if odoc and rdoc is None and odoc < report_date:
            overdue = months_between(odoc, report_date)
            out.append(_finding("DQ10", r, f"target {odoc:%m/%Y} passed {overdue} months ago; no revised date"))
        if approval is None:
            out.append(_finding("DQ11", r, "date of approval: NA"))
        agency = str(r.get("agency_raw") or "")
        if "invalid" in agency.lower():
            out.append(_finding("DQ12", r, f"agency recorded as '{agency}'"))
    return out


def check_panel(ongoing: pd.DataFrame, lifecycle: pd.DataFrame, completed: pd.DataFrame) -> list[dict]:
    """Month-over-month and cross-table rules."""
    out = []
    dup = ongoing[ongoing.duplicated(["source_month", "project_code"], keep=False)]
    for _, r in dup.iterrows():
        out.append(_finding("DQ16", r, f"code {r['project_code']} repeated in {r['source_month']}"))

    ordered = ongoing.sort_values(["project_code", "source_month"])
    prev = ordered.groupby("project_code").shift(1)
    for (_, r), (_, p) in zip(ordered.iterrows(), prev.iterrows()):
        if pd.isna(p.get("source_month")):
            continue
        if pd.notna(r["physical_progress_pct"]) and pd.notna(p["physical_progress_pct"]):
            drop = p["physical_progress_pct"] - r["physical_progress_pct"]
            if drop > 1:
                out.append(_finding("DQ13", r, f"{p['physical_progress_pct']:.2f}% ({p['source_month']}) -> "
                                               f"{r['physical_progress_pct']:.2f}% ({r['source_month']})"))
        pe, ce = p["cumulative_expenditure_cr"], r["cumulative_expenditure_cr"]
        if pd.notna(pe) and pd.notna(ce) and pe > 0 and (pe - ce) / pe > 0.01:
            out.append(_finding("DQ14", r, f"Rs {pe:,.2f} cr ({p['source_month']}) -> Rs {ce:,.2f} cr ({r['source_month']})"))
        po, co = p["original_cost_cr"], r["original_cost_cr"]
        if pd.notna(po) and pd.notna(co) and abs(po - co) > 0.5:
            out.append(_finding("DQ15", r, f"Rs {po:,.2f} cr ({p['source_month']}) -> Rs {co:,.2f} cr ({r['source_month']})"))

    last = ongoing.sort_values("source_month").drop_duplicates("project_code", keep="last").set_index("project_code")
    exits = lifecycle[(lifecycle["event"] == "exited") & (lifecycle["reason"] == "unexplained")]
    for _, e in exits.iterrows():
        r = last.loc[e["project_code"]] if e["project_code"] in last.index else pd.Series({"project_code": e["project_code"]})
        r = r.copy()
        r["project_code"] = e["project_code"]
        out.append(_finding("DQ17", r, f"absent from the {e['month']} ongoing list; no completion record",
                            month=e["month"]))

    for _, r in completed.iterrows():
        actual = r.get("actual_completion")
        if actual is not None and not pd.isna(actual):
            lag = months_between(actual, _month_date(r["source_month"]))
            if lag is not None and lag > 12:
                out.append(_finding("DQ18", r, f"actual completion {actual:%m/%Y}, reported in {r['source_month']} ({lag} months later)"))
    return out


def systemic_findings(ongoing: pd.DataFrame) -> list[dict]:
    """Report-wide patterns (not per project)."""
    out = []
    for month, grp in ongoing.groupby("source_month"):
        n = len(grp)
        zero_rev = int(grp["revised_cost_printed_zero"].sum())
        legacy = int(grp["legacy_ocms_code"].notna().sum())
        pmg = int(grp["pmg_id"].notna().sum())
        out.append({"source_month": month, "rows": n, "revised_cost_printed_zero": zero_rev,
                    "legacy_ocms_code_present": legacy, "pmg_id_present": pmg,
                    "revised_doc_present": int(grp["revised_doc"].notna().sum())})
    return out


def run_all(tables: dict[str, pd.DataFrame]) -> tuple[pd.DataFrame, pd.DataFrame]:
    findings = check_snapshot(tables["projects"]) + check_panel(
        tables["ongoing_long"], tables["lifecycle"], tables["completed"]
    )
    register = pd.DataFrame(findings)
    if not register.empty:
        sev_order = {"error": 0, "warning": 1, "info": 2}
        register = register.sort_values(
            ["severity", "rule_id", "ministry", "project_code"], key=lambda s: s.map(sev_order) if s.name == "severity" else s
        ).reset_index(drop=True)
    systemic = pd.DataFrame(systemic_findings(tables["ongoing_long"]))
    return register, systemic
