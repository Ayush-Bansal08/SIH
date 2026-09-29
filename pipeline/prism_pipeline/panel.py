"""Assemble per-month extractions into tidy tables and a project panel.

Outputs (all pandas DataFrames):
  ongoing_long   one row per (source_month, project_code) from Table 6
  completed      Table 3 rows, all months (real outcome labels)
  newly_added    Table 4 rows, all months
  projects       latest snapshot enriched with carried-forward fields + lifecycle
  lifecycle      event log per project (first_observed / newly_added / completed / exited_unexplained)
  kpis, ministry_totals, sector_overview, group_totals
"""

from __future__ import annotations

import pandas as pd

from .config import FLASH_REPORTS, MEGA_THRESHOLD_CR
from .extract import ReportExtraction
from .normalize import MINISTRY_SHORT, build_agency_map, is_ner, normalize_state

MONTHS = [r.month for r in FLASH_REPORTS]


def _frame(records: list[dict]) -> pd.DataFrame:
    return pd.DataFrame.from_records(records) if records else pd.DataFrame()


def _apply_common(df: pd.DataFrame, agency_map: dict, hml_map: dict) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    df["agency_key"] = df["agency_raw"].map(lambda a: agency_map.get(a, {}).get("key"))
    df["agency"] = df["agency_raw"].map(lambda a: agency_map.get(a, {}).get("display"))
    df["agency_parent"] = df["agency_raw"].map(lambda a: agency_map.get(a, {}).get("parent"))
    df["states"] = df["states"].map(lambda s: [normalize_state(x) for x in s])
    df["state_label"] = df["state_label"].map(normalize_state)
    df["ministry_short"] = df["ministry"].map(MINISTRY_SHORT)
    df["hml_category"] = df["sector"].map(hml_map).fillna("Unmapped")
    return df


def build_tables(extractions: list[ReportExtraction]) -> dict[str, pd.DataFrame]:
    extractions = sorted(extractions, key=lambda e: e.report.month)

    raw_agencies = [
        r["agency_raw"]
        for ex in extractions
        for table in (ex.ongoing, ex.completed, ex.newly_added)
        for r in table
    ]
    agency_map = build_agency_map(raw_agencies)

    sector_overview = _frame([r for ex in extractions for r in ex.sector_overview])
    hml_map = (
        sector_overview.drop_duplicates("sector", keep="last").set_index("sector")["hml_category"].to_dict()
        if not sector_overview.empty
        else {}
    )

    ongoing = _apply_common(_frame([r for ex in extractions for r in ex.ongoing]), agency_map, hml_map)
    ner_by_month = {ex.report.month: ex.ner_codes for ex in extractions}
    ongoing["is_ner_official"] = [
        code in ner_by_month.get(month, set()) for code, month in zip(ongoing["project_code"], ongoing["source_month"])
    ]
    ongoing["is_ner_by_state"] = ongoing["states"].map(is_ner)
    ongoing["cost_category"] = ongoing["original_cost_cr"].map(
        lambda c: None if pd.isna(c) else ("Mega" if c >= MEGA_THRESHOLD_CR else "Major")
    )

    completed = _apply_common(_frame([r for ex in extractions for r in ex.completed]), agency_map, hml_map)
    newly_added = _apply_common(_frame([r for ex in extractions for r in ex.newly_added]), agency_map, hml_map)

    kpis = _frame([ex.overview for ex in extractions])
    ministry_totals = _frame([r for ex in extractions for r in ex.ministry_totals])
    group_totals = _frame([r for ex in extractions for r in ex.group_totals])
    issues = _frame([i for ex in extractions for i in ex.issues])

    withheld = {ex.report.month: ex.withheld_codes for ex in extractions}
    lifecycle = _lifecycle(ongoing, completed, newly_added, withheld)
    report_notes = _frame(
        [{"source_month": ex.report.month, "note_index": i + 1, "note": n}
         for ex in extractions for i, n in enumerate(ex.notes)]
    )
    projects = _latest_projects(ongoing, lifecycle)

    agency_aliases = pd.DataFrame(
        [{"agency_raw": raw, **info} for raw, info in sorted(agency_map.items())]
    )

    return {
        "ongoing_long": ongoing,
        "completed": completed,
        "newly_added": newly_added,
        "projects": projects,
        "lifecycle": lifecycle,
        "kpis": kpis,
        "ministry_totals": ministry_totals,
        "sector_overview": sector_overview,
        "group_totals": group_totals,
        "agency_aliases": agency_aliases,
        "report_notes": report_notes,
        "extraction_issues": issues,
    }


EXIT_REASONS = {
    "completed": "Listed in the Completed Projects table (Table 3)",
    "completed_reported_later": "Absent first, then listed as completed in a later report",
    "withheld_data_inconsistency": "Named in the report note as not published due to inconsistent cumulative expenditure",
    "temporarily_absent": "Absent for one or more months, then listed as ongoing again",
    "railways_irpsm_onboarding": "Ministry of Railways; report note: projects are re-onboarded via IRPSM API after vetting",
    "unexplained": "No completion record, report note or re-entry explains the absence",
}


def _lifecycle(
    ongoing: pd.DataFrame,
    completed: pd.DataFrame,
    newly_added: pd.DataFrame,
    withheld: dict[str, set[str]],
) -> pd.DataFrame:
    """Event log. Every exit from the ongoing list gets an evidence-based reason."""
    events = []
    present = ongoing.groupby("project_code")["source_month"].apply(set).to_dict()
    ministry = ongoing.drop_duplicates("project_code", keep="last").set_index("project_code")["ministry"].to_dict()
    completed_in = (
        completed.groupby("project_code")["source_month"].min().to_dict() if not completed.empty else {}
    )

    def ev(code, event, month, reason=None):
        events.append({"project_code": code, "event": event, "month": month, "reason": reason,
                       "reason_text": EXIT_REASONS.get(reason) if reason else None})

    for code, months in present.items():
        ev(code, "first_observed", min(months))
        for i, month in enumerate(MONTHS[:-1]):
            nxt = MONTHS[i + 1]
            if month not in months or nxt in months:
                continue
            done = completed_in.get(code)
            if done is not None and done <= nxt:
                continue  # regular completion, logged below
            if code in withheld.get(nxt, set()):
                reason = "withheld_data_inconsistency"
            elif done is not None:
                reason = "completed_reported_later"
            elif any(m > nxt for m in months):
                reason = "temporarily_absent"
            elif ministry.get(code) == "Ministry of Railways":
                reason = "railways_irpsm_onboarding"
            else:
                reason = "unexplained"
            ev(code, "exited", nxt, reason)
    for _, r in newly_added.iterrows():
        ev(r["project_code"], "newly_added", r["source_month"])
    for code, month in completed_in.items():
        ev(code, "completed", month, "completed")
    for month, codes in withheld.items():
        for code in sorted(codes):
            ev(code, "withheld_by_mospi", month, "withheld_data_inconsistency")
    return pd.DataFrame(events).sort_values(["project_code", "month", "event"]).reset_index(drop=True)


def _latest_projects(ongoing: pd.DataFrame, lifecycle: pd.DataFrame) -> pd.DataFrame:
    """Latest-month snapshot, with fields the latest report omits carried forward (and labelled)."""
    latest_month = ongoing["source_month"].max()
    latest = ongoing[ongoing["source_month"] == latest_month].copy()
    hist = ongoing.sort_values("source_month")

    def last_non_null(col: str) -> tuple[dict, dict]:
        sub = hist.dropna(subset=[col]).drop_duplicates("project_code", keep="last")
        return sub.set_index("project_code")[col].to_dict(), sub.set_index("project_code")["source_month"].to_dict()

    rev_val, rev_month = last_non_null("revised_cost_cr")
    legacy_val, _ = last_non_null("legacy_ocms_code")
    pmg_val, _ = last_non_null("pmg_id")

    # Revised cost: the latest report prints 0.00 for every project, so use the most
    # recent month that reported it and record which month that was.
    latest["revised_cost_latest_cr"] = latest["project_code"].map(rev_val)
    latest["revised_cost_asof"] = latest["project_code"].map(rev_month)
    latest["legacy_ocms_code"] = latest["project_code"].map(legacy_val)
    latest["pmg_id"] = latest["project_code"].map(pmg_val)

    months_seen = hist.groupby("project_code")["source_month"].agg(["min", "count"])
    latest["first_seen_month"] = latest["project_code"].map(months_seen["min"])
    latest["months_observed"] = latest["project_code"].map(months_seen["count"])
    newly = lifecycle[lifecycle["event"] == "newly_added"].groupby("project_code")["month"].min()
    latest["newly_added_month"] = latest["project_code"].map(newly)
    return latest.reset_index(drop=True)
