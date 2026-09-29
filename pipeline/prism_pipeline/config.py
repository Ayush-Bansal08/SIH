"""Paths and the registry of official source reports."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
REFERENCE_DIR = REPO_ROOT / "reference"
PIPELINE_DIR = REPO_ROOT / "pipeline"
PROCESSED_DIR = PIPELINE_DIR / "data" / "processed"
DOCS_DIR = REPO_ROOT / "docs"


@dataclass(frozen=True)
class FlashReport:
    """One official monthly Flash Report on Central Sector Infrastructure Projects."""

    month: str  # "YYYY-MM" — the reporting month printed on the cover
    number: int  # report serial printed on the cover (e.g. 490th)
    filename: str

    @property
    def path(self) -> Path:
        return REFERENCE_DIR / self.filename

    @property
    def label(self) -> str:
        return f"Flash Report #{self.number} ({self.month})"


# Source: https://paimana-proj.mospi.gov.in/ReportPage (Monthly Flash Report).
FLASH_REPORTS: tuple[FlashReport, ...] = (
    FlashReport("2026-04", 486, "FlashReport_2026-04.pdf"),
    FlashReport("2026-05", 487, "FlashReport_2026-05.pdf"),
    FlashReport("2026-06", 488, "FlashReport_2026-06.pdf"),
    FlashReport("2026-07", 489, "FlashReport_2026-07.pdf"),
    FlashReport("2026-08", 490, "FlashReport_2026-08.pdf"),
)

LATEST_MONTH = FLASH_REPORTS[-1].month

# Section titles as they appear on the first line of each PDF page.
SECTION_TITLES = {
    "overview": "Flash Report",
    "table1": "Ministry-wise Ongoing Projects",
    "table2": "Ongoing Projects State-Wise",
    "table3": "Completed Projects During Month",
    "table4": "Newly Added Projects",
    "table5": "Ongoing Projects of North-East Region",
    "table6": "All Ongoing Projects",
}

# Projects of original cost >= this (₹ crore) are "Mega", below are "Major"
# (definition printed on page 4 of every Flash Report).
MEGA_THRESHOLD_CR = 1000.0
# Monitoring threshold of the framework (₹ crore).
MONITORING_THRESHOLD_CR = 150.0

NE_STATES = frozenset(
    {
        "Arunachal Pradesh",
        "Assam",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Sikkim",
        "Tripura",
    }
)
