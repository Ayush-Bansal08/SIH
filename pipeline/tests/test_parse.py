from datetime import date

import pytest

from prism_pipeline.parse import (
    COLOR_AGENCY,
    COLOR_CODE,
    COLOR_LEGACY,
    COLOR_NAME,
    COLOR_PMGID,
    months_between,
    parse_month,
    parse_name_cell_from_spans,
    parse_name_cell_from_text,
    parse_number,
    parse_total_label,
    split_stacked,
    split_state,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("1,712.00", 1712.0),
        ("(1693.81)", 1693.81),
        ("₹ 30,71,947", 3071947.0),
        ("0.00", 0.0),
        ("3,071,947.05", 3071947.05),
        ("(-)", None),
        ("-", None),
        ("NA", None),
        ("", None),
        (None, None),
        ("abc", None),
    ],
)
def test_parse_number(raw, expected):
    assert parse_number(raw) == expected


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("03/2023", date(2023, 3, 1)),
        ("(01/2024)", date(2024, 1, 1)),
        ("NA", None),
        ("(-)", None),
        ("13/2024", None),
        (None, None),
    ],
)
def test_parse_month(raw, expected):
    assert parse_month(raw) == expected


def test_split_stacked_pads():
    assert split_stacked("03/2023\n(01/2024)") == ["03/2023", "(01/2024)"]
    assert split_stacked("1,413.00") == ["1,413.00", None]
    assert split_stacked(None, 3) == [None, None, None]
    assert split_stacked("a\nb\nc", 3) == ["a", "b", "c"]


def test_split_state():
    assert split_state("Multi-States\n(Madhya Pradesh,\nUttar Pradesh)") == (
        "Multi-States",
        ["Madhya Pradesh", "Uttar Pradesh"],
    )
    assert split_state("Assam") == ("Assam", ["Assam"])
    assert split_state("PAN India") == ("PAN India", [])
    assert split_state("Offshore") == ("Offshore", [])
    assert split_state(None) == (None, [])


def test_total_label():
    assert parse_total_label("Total (26)") == 26
    assert parse_total_label("Total(3)") == 3
    assert parse_total_label("Total") is None
    assert parse_total_label("Ministry of Coal") is None


def test_months_between():
    assert months_between(date(2023, 3, 1), date(2026, 8, 1)) == 41
    assert months_between(None, date(2026, 8, 1)) is None


def test_name_cell_by_colour():
    spans = [
        (COLOR_NAME, "Construction of New Domestic Terminal Building"),
        (COLOR_NAME, "at Kadapa Airport"),
        (COLOR_AGENCY, "(Airport Authority of India [AAI])"),
        (COLOR_CODE, "(612786)"),
        (COLOR_LEGACY, "(N04000106)"),
        (COLOR_PMGID, "(4353)"),
    ]
    cell = parse_name_cell_from_spans(spans)
    assert cell.name == "Construction of New Domestic Terminal Building at Kadapa Airport"
    assert cell.agency == "Airport Authority of India [AAI]"
    assert cell.project_code == "612786"
    assert cell.legacy_ocms_code == "N04000106"
    assert cell.pmg_id == "4353"


def test_name_cell_colour_absent_returns_none():
    assert parse_name_cell_from_spans([(COLOR_NAME, "only a name")]) is None


def test_name_cell_regex_fallback_wrapped_agency():
    text = (
        "Construction of Balance works of Major Bridge over Middle Strait Creek\n"
        "(National Highways & Infrastructure\nDevelopment Corporation Ltd. [NHIDCL])\n"
        "(619186)\n(-) (-)"
    )
    cell = parse_name_cell_from_text(text)
    assert cell.project_code == "619186"
    assert cell.agency == "National Highways & Infrastructure Development Corporation Ltd. [NHIDCL]"
    assert cell.name.startswith("Construction of Balance works")
    assert cell.legacy_ocms_code is None and cell.pmg_id is None


def test_name_cell_regex_unparenthesised_code():
    cell = parse_name_cell_from_text("Upgradation of Sewerage system in Gandhinagar City\n"
                                     "(ministry of housing and urban affairs)\n707267")
    assert cell.project_code == "707267"
    assert cell.agency == "ministry of housing and urban affairs"
