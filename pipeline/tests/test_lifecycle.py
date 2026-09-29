"""Exit-reason classification on a synthetic 5-month panel."""

import pandas as pd

from prism_pipeline.panel import MONTHS, _lifecycle

APR, MAY, JUN, JUL, AUG = MONTHS


def _ongoing(rows):
    return pd.DataFrame(
        [{"project_code": c, "source_month": m, "ministry": ministry} for c, months, ministry in rows for m in months]
    )


def test_exit_reasons():
    ongoing = _ongoing(
        [
            ("A", MONTHS, "Ministry of Power"),
            ("B", [APR, MAY, JUN], "Ministry of Power"),  # completed in July
            ("C", [APR, JUN, JUL, AUG], "Ministry of Power"),  # gap in May
            ("D", [APR, MAY], "Ministry of Railways"),
            ("E", [APR, MAY], "Ministry of Road Transport & Highways"),  # withheld in June
            ("F", [APR, MAY, JUN], "Ministry of Coal"),
            ("G", [APR], "Ministry of Coal"),  # completion reported two months later
        ]
    )
    completed = pd.DataFrame([{"project_code": "B", "source_month": JUL}, {"project_code": "G", "source_month": JUL}])
    newly = pd.DataFrame(columns=["project_code", "source_month"])
    lc = _lifecycle(ongoing, completed, newly, withheld={JUN: {"E"}})

    exits = lc[lc["event"] == "exited"].set_index("project_code")["reason"].to_dict()
    assert "A" not in exits and "B" not in exits  # B is a regular completion
    assert exits["C"] == "temporarily_absent"
    assert exits["D"] == "railways_irpsm_onboarding"
    assert exits["E"] == "withheld_data_inconsistency"
    assert exits["F"] == "unexplained"
    assert exits["G"] == "completed_reported_later"
    assert set(lc[lc["event"] == "completed"]["project_code"]) == {"B", "G"}
    assert list(lc[lc["event"] == "withheld_by_mospi"]["project_code"]) == ["E"]
