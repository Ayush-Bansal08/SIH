"""Integration checks on the processed outputs (run the CLI first)."""

import json

import pandas as pd
import pytest

from prism_pipeline.config import FLASH_REPORTS, PROCESSED_DIR

pytestmark = pytest.mark.integration

# Official headline figures printed on each report's overview page (₹ crore).
OFFICIAL = {
    "2026-04": (1981, 3712662, 4278402, 2036107),
    "2026-08": (1731, 3071947, 3360069, 1632561),
}


@pytest.fixture(scope="module")
def recon():
    return pd.read_parquet(PROCESSED_DIR / "reconciliation.parquet")


def test_every_reconciliation_check_passes(recon):
    checks = recon[recon["passed"].notna()]
    failed = checks[~checks["passed"].astype(bool)]
    assert failed.empty, failed.to_string()
    assert len(checks) > 800


def test_all_reports_present():
    kpis = pd.read_parquet(PROCESSED_DIR / "kpis.parquet")
    assert sorted(kpis["source_month"]) == [r.month for r in FLASH_REPORTS]


@pytest.mark.parametrize("month", sorted(OFFICIAL))
def test_overview_kpis_match_official(month):
    kpis = pd.read_parquet(PROCESSED_DIR / "kpis.parquet").set_index("source_month")
    n, orig, rev, exp = OFFICIAL[month]
    k = kpis.loc[month]
    assert (k["ongoing_projects"], k["original_cost_cr"], k["revised_cost_cr"], k["expenditure_cr"]) == (n, orig, rev, exp)


def test_projects_master_is_latest_month_and_unique():
    p = pd.read_parquet(PROCESSED_DIR / "projects.parquet")
    assert p["source_month"].nunique() == 1 and p["source_month"].iloc[0] == FLASH_REPORTS[-1].month
    assert p["project_code"].is_unique
    assert len(p) == 1731


def test_revised_cost_carried_forward_with_provenance():
    p = pd.read_parquet(PROCESSED_DIR / "projects.parquet")
    has = p["revised_cost_latest_cr"].notna()
    assert has.mean() > 0.9  # most projects have a revised cost from Apr–Jul
    assert p.loc[has, "revised_cost_asof"].notna().all()
    assert (p.loc[has, "revised_cost_asof"] < "2026-08").all()  # August prints none


def test_error_findings_flagged_on_master():
    p = pd.read_parquet(PROCESSED_DIR / "projects.parquet").set_index("project_code")
    assert "DQ01" in list(p.loc["617989", "dq_flags"])  # ₹16,713 cr spent on a ₹157 cr bridge
    assert p.loc["617989", "dq_has_error"]
    assert "DQ12" in list(p.loc["615820", "dq_flags"])  # 'INVALID CO.' agency


def test_every_exit_has_a_reason():
    lc = pd.read_parquet(PROCESSED_DIR / "lifecycle.parquet")
    exits = lc[lc["event"] == "exited"]
    assert exits["reason"].notna().all()


def test_manifest():
    m = json.loads((PROCESSED_DIR / "manifest.json").read_text(encoding="utf-8"))
    assert len(m["sources"]) == len(FLASH_REPORTS)
    assert all(len(s["sha256"]) == 64 for s in m["sources"])
    assert m["reconciliation"]["failed"] == 0
