from prism_pipeline.normalize import agency_parts, build_agency_map, is_ner, normalize_state


def test_agency_parts():
    assert agency_parts("NCL - CIL") == ("NCL", "CIL", None)
    assert agency_parts("RVNL - II") == ("RVNL", None, None)  # unit suffix, not a parent
    assert agency_parts("Northern Coalfields Limited [NCL]") == ("NCL", None, "Northern Coalfields Limited")
    assert agency_parts("Steel Authority of India Limited (SAIL)") == ("SAIL", None, "Steel Authority of India Limited")
    assert agency_parts("NHAI") == ("NHAI", None, None)
    assert agency_parts("MoRTH") == ("MoRTH", None, None)
    assert agency_parts("Oil India Limited") == (None, None, "Oil India Limited")


def test_agency_map_merges_monthly_variants():
    raw = [
        "Northern Coalfields Limited [NCL]",
        "NCL - CIL",
        "NCL - CIL",
        "Department of Telecommunications [DoT]",
        "Department of Telecommunications",
        "ministry of housing and urban affairs",
        "Ministry of Housing & Urban Affairs",
        "Ministry of Housing & Urban Affairs",
    ]
    m = build_agency_map(raw)
    assert m["NCL - CIL"]["key"] == m["Northern Coalfields Limited [NCL]"]["key"] == "NCL"
    assert m["NCL - CIL"]["display"] == "Northern Coalfields Limited [NCL]"
    assert m["NCL - CIL"]["parent"] == "CIL"
    assert m["Department of Telecommunications"]["key"] == "DOT"
    assert m["Department of Telecommunications"]["display"] == "Department of Telecommunications [DoT]"
    assert m["ministry of housing and urban affairs"]["key"] == m["Ministry of Housing & Urban Affairs"]["key"]
    assert m["ministry of housing and urban affairs"]["display"] == "Ministry of Housing & Urban Affairs"


def test_states():
    assert normalize_state("Andaman & Nicobar") == "Andaman & Nicobar Islands"
    assert normalize_state("  Assam ") == "Assam"
    assert is_ner(["Madhya Pradesh", "Assam"])
    assert not is_ner(["Delhi"])
