"""Field-level spot check of the August 2026 extraction against hand transcription.

Expected values were transcribed from the Flash Report #490 (August 2026) text
independently of this pipeline's parser. Rows were chosen to cover: every page
region, multi-state and PAN-India projects, NA dates, missing revised DoC,
zero expenditure, and known data-quality anomalies.
"""

from datetime import date

import pandas as pd
import pytest

from prism_pipeline.config import PROCESSED_DIR

pytestmark = pytest.mark.integration

M = lambda s: None if s is None else date(int(s[3:]), int(s[:2]), 1)  # noqa: E731

# code: (state_label, states, approval, start, orig_doc, rev_doc, orig_cost, expenditure, progress)
ONGOING_AUG = {
    "612786": ("Andhra Pradesh", ["Andhra Pradesh"], "03/2023", "01/2024", "01/2026", "09/2026", 265.91, 186.36, 83.00),
    "706724": ("Assam", ["Assam"], "12/2016", "03/2018", "03/2025", "06/2026", 1712.00, 2670.23, 99.50),
    "400424": ("Chhattisgarh", ["Chhattisgarh"], "03/2016", "03/2016", "03/2023", "03/2027", 11816.40, 6984.95, 78.48),
    "400150": ("Jharkhand", ["Jharkhand"], "08/2020", "08/2020", "03/2028", None, 6964.33, 1880.46, 39.48),
    "619032": ("Madhya Pradesh", ["Madhya Pradesh"], "02/2025", "02/2025", "03/2032", None, 25560.48, 425.01, 2.63),
    "400231": ("Odisha", ["Odisha"], "01/2017", "01/2024", "03/2030", None, 27212.96, 3606.38, 4.10),
    "602096": ("Multi-States", ["Arunachal Pradesh", "Assam"], "09/2003", "01/2005", "09/2010", "03/2027", 6285.33, 26575.24, 98.07),
    "298178": ("Uttar Pradesh", ["Uttar Pradesh"], "06/2026", "06/2026", "12/2032", None, 38358.00, 1027.77, 0.11),
    "602185": ("Uttarakhand", ["Uttarakhand"], "11/2006", "11/2006", "03/2013", "07/2029", 2978.00, 7887.36, 76.18),
    "619025": ("Multi-States", ["Madhya Pradesh", "Rajasthan", "Uttar Pradesh"], "01/2025", "01/2025", "07/2029", None, 25000.00, 805.05, 12.00),
    "400188": ("Delhi", ["Delhi"], "07/2016", "05/2018", "12/2025", "12/2025", 32850.00, 14370.45, 46.70),
    "702668": ("Tamil Nadu", ["Tamil Nadu"], "10/2024", "11/2020", "08/2029", None, 63246.00, 35228.00, 56.53),
    "612878": ("Karnataka", ["Karnataka"], "09/2024", "06/2026", "05/2031", None, 15611.00, 0.00, 3.90),
    "702635": ("Karnataka", ["Karnataka"], "02/2014", "02/2016", "03/2021", "09/2026", 26405.14, 29844.97, 96.00),
    "709798": ("Madhya Pradesh", ["Madhya Pradesh"], "05/2023", "05/2023", "05/2028", "05/2028", 43367.00, 6688.50, 36.60),
    "701289": ("Haryana", ["Haryana"], "02/2021", "02/2021", "09/2024", "12/2026", 34627.00, 28279.45, 94.70),
    "604795": ("Tamil Nadu", ["Tamil Nadu"], "09/2021", "09/2021", "06/2025", "10/2028", 31580.00, 1615.53, 10.20),
    "617883": ("Delhi", ["Delhi"], "10/2016", "06/2022", "06/2027", None, 4441.00, 44.44, 57.00),
    "705391": ("Manipur", ["Manipur"], "10/2003", "08/2019", "12/2026", "06/2029", 14323.00, 16931.50, 78.00),
    "705493": ("Karnataka", ["Karnataka"], "01/1999", "05/2022", "03/2005", "03/2030", 5174.00, 186.31, 10.00),
    "616699": ("Multi-States", ["Bihar", "Jharkhand", "Uttar Pradesh", "West Bengal"], "08/2023", "03/2024", "03/2028", None, 12333.57, 1350.85, 3.00),
    "706865": ("Goa", ["Goa"], None, "01/2022", "03/2031", None, 1892.00, 0.00, 0.00),
    "617989": ("Karnataka", ["Karnataka"], "03/2019", "05/2019", "11/2021", "04/2027", 157.32, 16713.20, 69.00),
    "618415": ("Manipur", ["Manipur"], "02/2021", "06/2021", "12/2022", "03/2026", 188.36, 0.00, 100.00),
    "617936": ("Telangana", ["Telangana"], "10/2016", "03/2017", "03/2019", None, 253.99, 0.00, 100.00),
    "618934": ("Assam", ["Assam"], "08/2024", "01/2026", "01/2030", "01/2030", 5729.47, 364.51, 1.30),
    "618738": ("Bihar", ["Bihar"], "09/2022", "09/2023", "09/2027", "03/2029", 6291.69, 769.02, 22.05),
    "615820": ("Assam", ["Assam"], "07/2022", "07/2022", "07/2031", None, 159.77, 112.79, 89.73),
    "701530": ("Multi-States", ["Madhya Pradesh", "Uttar Pradesh"], None, "03/2022", "03/2029", None, 21030.00, 8530.86, 0.00),
    "613787": ("Uttarakhand", ["Uttarakhand"], "10/2023", "11/2023", "06/2029", None, 2584.10, 1379.51, 29.44),
    "707039": ("Sikkim", ["Sikkim"], "10/2018", "12/2018", "12/2026", "07/2026", 250.00, 667.21, 100.00),
    "701593": ("PAN India", [], "11/2020", "11/2020", "03/2024", "03/2026", 28466.00, 9173.00, 98.63),
}

MINISTRY_SECTOR = {
    "617989": ("Ministry of Road Transport & Highways", "Roads & Highways"),
    "400424": ("Ministry of Coal", "Coal"),
    "701593": ("Department of Telecommunications", "Telecommunication"),
    "706865": ("Ministry of Railways", "Railways"),
    "613787": ("Department of Water Resources, River Development & GR", "Water Resources"),
    "707039": ("Ministry of Health & Family Welfare", "Healthcare"),
    "702668": ("Ministry of Housing & Urban Affairs", "Urban Public Transport"),
    "400231": ("Ministry of Coal", "Electricity Generation"),
}

AGENCY_RAW = {
    "400188": "National Buildings Construction Corporation [NBCC]",
    "706724": "Adani Airport Holdings Limited",
    "701593": "Department of Telecommunications [DoT]",
    "615820": "INVALID CO.",
    "619025": "Adani Transmission Limited",
}


@pytest.fixture(scope="module")
def aug():
    df = pd.read_parquet(PROCESSED_DIR / "ongoing_long.parquet")
    return df[df["source_month"] == "2026-08"].set_index("project_code")


@pytest.mark.parametrize("code", sorted(ONGOING_AUG))
def test_ongoing_row(aug, code):
    state, states, appr, start, odoc, rdoc, cost, exp, prog = ONGOING_AUG[code]
    r = aug.loc[code]
    assert r["state_label"] == state
    assert list(r["states"]) == states
    assert r["date_of_approval"] == M(appr) if appr else pd.isna(r["date_of_approval"])
    assert r["start_date"] == M(start)
    assert r["original_doc"] == M(odoc)
    assert (r["revised_doc"] == M(rdoc)) if rdoc else pd.isna(r["revised_doc"])
    assert r["original_cost_cr"] == pytest.approx(cost)
    assert r["cumulative_expenditure_cr"] == pytest.approx(exp)
    assert r["physical_progress_pct"] == pytest.approx(prog)
    assert pd.isna(r["revised_cost_cr"])  # August prints 0.00 for every revised cost


@pytest.mark.parametrize("code", sorted(MINISTRY_SECTOR))
def test_ministry_sector(aug, code):
    assert (aug.loc[code, "ministry"], aug.loc[code, "sector"]) == MINISTRY_SECTOR[code]


@pytest.mark.parametrize("code", sorted(AGENCY_RAW))
def test_agency(aug, code):
    assert aug.loc[code, "agency_raw"] == AGENCY_RAW[code]


def test_completed_mumbai_metro_line_3():
    df = pd.read_parquet(PROCESSED_DIR / "completed.parquet")
    r = df[(df["source_month"] == "2026-08") & (df["project_code"] == "702637")].iloc[0]
    assert r["state_label"] == "Maharashtra"
    assert r["date_of_approval"] == M("07/2013") and r["start_date"] == M("06/2016")
    assert r["actual_completion"] == M("10/2025")
    assert r["original_doc"] == M("03/2023") and r["revised_doc"] == M("08/2025")
    assert r["original_cost_cr"] == pytest.approx(23136.00)
    assert r["revised_cost_cr"] == pytest.approx(37276.00)
    assert r["cumulative_expenditure_cr"] == pytest.approx(36139.24)


def test_newly_added_offshore():
    df = pd.read_parquet(PROCESSED_DIR / "newly_added.parquet")
    r = df[(df["source_month"] == "2026-08") & (df["project_code"] == "944988")].iloc[0]
    assert r["state_label"] == "Offshore"
    assert r["original_doc"] == M("03/2029") and pd.isna(r["revised_doc"])
    assert r["original_cost_cr"] == pytest.approx(6274.00)
