"""Extract every table we use from one Flash Report PDF.

Each extractor returns plain dict records carrying provenance
(``source_month``, ``source_table``, ``source_page``). Rows that do not fit
the expected shape are *not* dropped silently: they are returned in
``issues`` so the reconciliation report can show them.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

import pymupdf

from .config import SECTION_TITLES, FlashReport
from .parse import (
    NameCell,
    clean_text,
    parse_month,
    parse_name_cell_from_spans,
    parse_name_cell_from_text,
    parse_number,
    parse_total_label,
    split_stacked,
    split_state,
)
from .pdf_tables import TableRow, iter_table_rows, section_pages

log = logging.getLogger(__name__)


@dataclass
class ReportExtraction:
    report: FlashReport
    overview: dict = field(default_factory=dict)
    ministry_totals: list[dict] = field(default_factory=list)
    sector_overview: list[dict] = field(default_factory=list)
    ongoing: list[dict] = field(default_factory=list)
    group_totals: list[dict] = field(default_factory=list)
    completed: list[dict] = field(default_factory=list)
    newly_added: list[dict] = field(default_factory=list)
    ner_codes: set[str] = field(default_factory=set)
    withheld_codes: set[str] = field(default_factory=set)
    notes: list[str] = field(default_factory=list)
    issues: list[dict] = field(default_factory=list)


_WITHHELD = re.compile(
    r"(?:ids|IDs)\s+([\d,\s]+(?:and\s+\d+)?)\s*,?\s*(?:are|have)\s+not\s+(?:been\s+)?published", re.IGNORECASE
)


def extract_notes(doc: pymupdf.Document) -> tuple[list[str], set[str]]:
    """Footnotes on the last pages: caveats, and project IDs withheld for data inconsistency."""
    text = "".join(page.get_text() for page in list(doc)[-4:])
    start = text.find("Note:")
    if start < 0:
        return [], set()
    body = text[start + len("Note:"):]
    body = re.split(r"Project Assessment, Infrastructure Monitoring", body)[0]
    flat = re.sub(r"\s+", " ", body).strip()
    parts = [n.strip(" •") for n in re.split(r"•|\s\d\.\s?(?=[A-Z])", flat)]
    notes = [re.sub(r"^\d+\.\s*", "", n) for n in parts if n]
    withheld: set[str] = set()
    for m in _WITHHELD.finditer(flat):
        withheld.update(re.findall(r"\d{5,7}", m.group(1)))
    return notes, withheld


# --------------------------------------------------------------------------- overview


_KPI_PATTERNS = {
    "ongoing_projects": r"(\d[\d,]*)\s*\|\s*\d+\s*\n\s*Ongoing Projects",
    "line_ministries": r"\d[\d,]*\s*\|\s*(\d+)\s*\n\s*Ongoing Projects",
    "commissioned_during_month": r"\n\s*(\d[\d,]*)\s*\n\s*Commissioned during month",
    "newly_added_during_month": r"\n\s*(\d[\d,]*)\s*\n\s*Newly Added during month",
    "original_cost_cr": r"₹\s*([\d,]+)\s*\n\s*Original Cost",
    "revised_cost_cr": r"₹\s*([\d,]+)\s*\n\s*Revised Cost",
    "expenditure_cr": r"₹\s*([\d,]+)\s*\n\s*\(\s*[\d.]+%\s*of Revised Cost\)",
    "expenditure_pct_of_revised": r"\(\s*([\d.]+)%\s*of Revised Cost\)",
}


def extract_overview(doc: pymupdf.Document) -> dict:
    """Headline KPIs printed on the 'Flash Report' overview page."""
    for page in list(doc)[:8]:
        text = page.get_text()
        if "Commissioned during month" in text and "Line Ministries" in text:
            out = {}
            for key, pattern in _KPI_PATTERNS.items():
                m = re.search(pattern, text)
                out[key] = parse_number(m.group(1)) if m else None
            out["source_page"] = page.number + 1
            return out
    raise ValueError("overview KPI page not found")


def extract_ner_overview(doc: pymupdf.Document) -> dict:
    """KPIs on the 'Special Focus : North Eastern Region' page."""
    for page in list(doc)[:12]:
        text = page.get_text()
        if text.lstrip().startswith("Special Focus : North Eastern Region"):
            out = {}
            for key, pattern in _KPI_PATTERNS.items():
                m = re.search(pattern, text)
                out[f"ner_{key}"] = parse_number(m.group(1)) if m else None
            return out
    return {}


_MEGA_MAJOR = re.compile(
    r"(Mega|Major)\*\s*\n?\s*\((\d[\d,]*)\s*projects,\s*\n?\s*₹\s*([\d.]+)\s*lakh\s*cr\)", re.IGNORECASE
)


def extract_mega_major(doc: pymupdf.Document) -> dict:
    """'Mega* (715 projects, ₹ 25.89 lakh cr)' figures from the overview section."""
    out: dict = {}
    for page in list(doc)[:8]:
        text = page.get_text()
        if "Total Ongoing Projects: Mega & Major" not in text:
            continue
        # The first Mega/Major pair on the page is the all-India one; the NER pair follows.
        for kind, count, lakh_cr in _MEGA_MAJOR.findall(text):
            key = kind.lower()
            if f"{key}_projects" not in out:
                out[f"{key}_projects"] = parse_number(count)
                out[f"{key}_original_cost_lakh_cr"] = float(lakh_cr)
        break
    return out


# --------------------------------------------------------------------------- Table 1


def extract_ministry_totals(doc: pymupdf.Document, report: FlashReport) -> tuple[list[dict], list[dict]]:
    pages = section_pages(doc, SECTION_TITLES["table1"])
    records, issues = [], []
    ministry = None
    for row in iter_table_rows(doc, pages, min_cols=6):
        c = [clean_text(x) if isinstance(x, str) else x for x in row.cells]
        c += [None] * (6 - len(c))
        sl, allocated, sector, count, cost, exp = row.cells[:6]
        if clean_text(sl) == "Sl.No":
            continue
        if clean_text(allocated):
            ministry = clean_text(allocated)
        orig, rev = split_stacked(cost)
        base = {
            "source_month": report.month,
            "source_table": "Table 1",
            "source_page": row.page,
            "project_count": parse_number(count),
            "original_cost_cr": parse_number(orig),
            "revised_cost_cr": parse_number(rev),
            "expenditure_cr": parse_number(exp),
        }
        label = clean_text(sector)
        first = clean_text(sl)
        if first == "Total" or (label is None and clean_text(allocated) == "Total"):
            records.append({**base, "level": "grand_total", "ministry": None, "sector": None})
        elif label == "Total":
            records.append({**base, "level": "ministry_total", "ministry": ministry, "sector": None})
        elif label:
            records.append({**base, "level": "ministry_sector", "ministry": ministry, "sector": label})
        else:
            issues.append({"source_month": report.month, "table": "Table 1", "page": row.page, "row": c})
    # Grand-total row layout varies: fall back to scanning the last page text.
    if not any(r["level"] == "grand_total" for r in records) and pages:
        text = doc[pages[-1]].get_text()
        m = re.search(r"\nTotal\s*\n\s*(\d+)\s*\n\s*([\d,.]+)\s*\n\s*\(?([\d,.]+)\)?\s*\n\s*([\d,.]+)", text)
        if m:
            records.append(
                {
                    "source_month": report.month,
                    "source_table": "Table 1",
                    "source_page": pages[-1] + 1,
                    "level": "grand_total",
                    "ministry": None,
                    "sector": None,
                    "project_count": parse_number(m.group(1)),
                    "original_cost_cr": parse_number(m.group(2)),
                    "revised_cost_cr": parse_number(m.group(3)),
                    "expenditure_cr": parse_number(m.group(4)),
                }
            )
    return records, issues


# --------------------------------------------------------------------------- HML sector overview


def extract_sector_overview(doc: pymupdf.Document, report: FlashReport) -> list[dict]:
    """'Sector - Overview' tables on the HML category pages (with official revised cost)."""
    records = []
    for page in doc:
        title = None
        head = page.get_text().split("\n")[0].strip()
        if head.startswith("HML Category"):
            title = head.split(":", 1)[1].strip()
        elif head == "Other Sectors":
            title = "Others"
        if not title:
            continue
        for table in page.find_tables().tables:
            rows = table.extract()
            if not rows or "SECTOR NAME" not in " ".join(clean_text(x) or "" for x in rows[0]):
                continue
            for r in rows[1:]:
                if len(r) < 6 or not clean_text(r[1]):
                    continue
                records.append(
                    {
                        "source_month": report.month,
                        "source_table": "HML Sector Overview",
                        "source_page": page.number + 1,
                        "hml_category": title,
                        "sector": clean_text(r[1]),
                        "project_count": parse_number(r[2]),
                        "original_cost_cr": parse_number(r[3]),
                        "revised_cost_cr": parse_number(r[4]),
                        "expenditure_cr": parse_number(r[5]),
                    }
                )
    return records


# --------------------------------------------------------------------------- project tables


def _name_cell(row: TableRow, col: int = 1, has_legacy_line: bool = True) -> NameCell:
    by_text = parse_name_cell_from_text(row.cells[col])
    by_color = parse_name_cell_from_spans(row.cell_spans.get(col, []))
    if by_color is None:
        return by_text
    if not has_legacy_line:
        # Tables 3/4/5 have no '(Legacy) (PMGID)' line; there the code is printed in the
        # grey colour that Table 6 uses for the legacy code.
        if by_color.project_code is None:
            by_color.project_code = by_color.legacy_ocms_code or by_color.pmg_id
        by_color.legacy_ocms_code = by_color.pmg_id = None
        by_text.legacy_ocms_code = by_text.pmg_id = None
    # Colour split is authoritative; regex only fills gaps (e.g. an uncoloured code).
    for attr in ("name", "agency", "project_code", "legacy_ocms_code", "pmg_id"):
        if getattr(by_color, attr) is None and getattr(by_text, attr) is not None:
            setattr(by_color, attr, getattr(by_text, attr))
    return by_color


def _is_heading(cells: list) -> bool:
    return not clean_text(cells[0]) and bool(clean_text(cells[1])) and all(
        not clean_text(x) for x in cells[2:]
    )


def _is_header(cells: list) -> bool:
    return clean_text(cells[0]) == "Sl.No" or (clean_text(cells[1]) or "").startswith("Project Name")


def _walk_project_table(
    doc: pymupdf.Document,
    report: FlashReport,
    table_key: str,
    table_label: str,
    ncols: int,
    ministries: set[str],
    parse_row,
    extraction: ReportExtraction,
) -> tuple[list[dict], list[dict]]:
    """Shared state machine: ministry heading → sector heading → rows → 'Total (n)'."""
    pages = section_pages(doc, SECTION_TITLES[table_key])
    records, totals = [], []
    ministry = sector = None
    for row in iter_table_rows(doc, pages, min_cols=ncols, span_columns=(1,)):
        cells = list(row.cells) + [None] * (ncols - len(row.cells))
        if _is_header(cells):
            continue
        total_n = parse_total_label(cells[1]) or parse_total_label(cells[0])
        if total_n is not None:
            totals.append(
                {
                    "source_month": report.month,
                    "source_table": table_label,
                    "source_page": row.page,
                    "ministry": ministry,
                    "sector": sector,
                    "declared_count": total_n,
                    "cells": [clean_text(x) if isinstance(x, str) else x for x in cells],
                }
            )
            continue
        if _is_heading(cells):
            label = clean_text(cells[1])
            if label in ministries:
                ministry, sector = label, None
            else:
                sector = label
            continue
        sl = clean_text(cells[0])
        if sl and sl.isdigit():
            rec = parse_row(row, cells)
            rec.update(
                {
                    "source_month": report.month,
                    "source_table": table_label,
                    "source_page": row.page,
                    "sl_no": int(sl),
                    "ministry": ministry,
                    "sector": sector,
                }
            )
            records.append(rec)
            continue
        if any(clean_text(x) for x in cells if isinstance(x, str)):
            extraction.issues.append(
                {
                    "source_month": report.month,
                    "table": table_label,
                    "page": row.page,
                    "issue": "unrecognised row",
                    "row": [clean_text(x) if isinstance(x, str) else x for x in cells],
                }
            )
    return records, totals


def _identity(row: TableRow, has_legacy_line: bool = False) -> dict:
    nc = _name_cell(row, has_legacy_line=has_legacy_line)
    state_label, states = split_state(row.cells[2])
    return {
        "project_code": nc.project_code,
        "project_name": nc.name,
        "agency_raw": nc.agency,
        "legacy_ocms_code": nc.legacy_ocms_code,
        "pmg_id": nc.pmg_id,
        "name_parse_method": nc.method,
        "state_label": state_label,
        "states": states,
    }


def _parse_ongoing_row(row: TableRow, cells: list) -> dict:
    approval, start = split_stacked(cells[3])
    doc_orig, doc_rev = split_stacked(cells[4])
    cost_orig, cost_rev = split_stacked(cells[5])
    revised = parse_number(cost_rev)
    return {
        **_identity(row, has_legacy_line=True),
        "date_of_approval": parse_month(approval),
        "start_date": parse_month(start),
        "original_doc": parse_month(doc_orig),
        "revised_doc": parse_month(doc_rev),
        "original_cost_cr": parse_number(cost_orig),
        # 0.00 is how the generator prints "not reported" — a real revised cost is never zero.
        "revised_cost_cr": revised if revised else None,
        "revised_cost_printed_zero": revised == 0.0,
        "cumulative_expenditure_cr": parse_number(cells[6]),
        "physical_progress_pct": parse_number(cells[7]),
    }


def _parse_completed_row(row: TableRow, cells: list) -> dict:
    approval, start = split_stacked(cells[3])
    actual, doc_orig, doc_rev = split_stacked(cells[4], 3)
    cost_orig, cost_rev = split_stacked(cells[5])
    revised = parse_number(cost_rev)
    return {
        **_identity(row),
        "date_of_approval": parse_month(approval),
        "start_date": parse_month(start),
        "actual_completion": parse_month(actual),
        "original_doc": parse_month(doc_orig),
        "revised_doc": parse_month(doc_rev),
        "original_cost_cr": parse_number(cost_orig),
        "revised_cost_cr": revised if revised else None,
        "cumulative_expenditure_cr": parse_number(cells[6]),
    }


def _parse_new_row(row: TableRow, cells: list) -> dict:
    approval, start = split_stacked(cells[3])
    doc_orig, doc_rev = split_stacked(cells[4])
    cost_orig, cost_rev = split_stacked(cells[5])
    revised = parse_number(cost_rev)
    return {
        **_identity(row),
        "date_of_approval": parse_month(approval),
        "start_date": parse_month(start),
        "original_doc": parse_month(doc_orig),
        "revised_doc": parse_month(doc_rev),
        "original_cost_cr": parse_number(cost_orig),
        "revised_cost_cr": revised if revised else None,
    }


def _totals_to_numbers(totals: list[dict], cost_col: int, exp_col: int | None) -> None:
    for t in totals:
        cells = t.pop("cells")
        cost = cells[cost_col] if cost_col < len(cells) else None
        orig, rev = split_stacked(cost)
        t["declared_original_cost_cr"] = parse_number(orig)
        rev_n = parse_number(rev)
        t["declared_revised_cost_cr"] = rev_n if rev_n else None
        t["declared_expenditure_cr"] = (
            parse_number(cells[exp_col]) if exp_col is not None and exp_col < len(cells) else None
        )


def extract_report(report: FlashReport) -> ReportExtraction:
    log.info("extracting %s", report.label)
    doc = pymupdf.open(report.path)
    ex = ReportExtraction(report=report)

    ex.overview = {**extract_overview(doc), **extract_mega_major(doc), **extract_ner_overview(doc)}
    ex.overview.update({"source_month": report.month, "report_number": report.number})

    ex.ministry_totals, issues = extract_ministry_totals(doc, report)
    ex.issues.extend(issues)
    ministries = {r["ministry"] for r in ex.ministry_totals if r["ministry"]}
    ex.sector_overview = extract_sector_overview(doc, report)

    ex.ongoing, totals6 = _walk_project_table(
        doc, report, "table6", "Table 6", 8, ministries, _parse_ongoing_row, ex
    )
    _totals_to_numbers(totals6, cost_col=5, exp_col=6)
    ex.group_totals = totals6

    ex.completed, totals3 = _walk_project_table(
        doc, report, "table3", "Table 3", 7, ministries, _parse_completed_row, ex
    )
    _totals_to_numbers(totals3, cost_col=5, exp_col=6)
    ex.group_totals += totals3

    ex.newly_added, totals4 = _walk_project_table(
        doc, report, "table4", "Table 4", 6, ministries, _parse_new_row, ex
    )
    _totals_to_numbers(totals4, cost_col=5, exp_col=None)
    ex.group_totals += totals4

    ner, _ = _walk_project_table(doc, report, "table5", "Table 5", 8, ministries, _parse_ongoing_row, ex)
    ex.ner_codes = {r["project_code"] for r in ner if r["project_code"]}
    ex.notes, ex.withheld_codes = extract_notes(doc)

    doc.close()
    return ex
