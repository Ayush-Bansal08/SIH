"""Canonicalise names that drift between monthly reports.

Examples seen in the official reports:
  'Northern Coalfields Limited [NCL]'  (Apr/May)   vs  'NCL - CIL'   (Jul/Aug)
  'Department of Telecommunications [DoT]'          vs  'Department of Telecommunications'
  'ministry of housing and urban affairs'           vs  'Ministry of Housing & Urban Affairs'

The canonical key is deterministic and every mapping is written to
``agency_aliases.csv`` so it can be audited by a human.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict

from .config import NE_STATES

# Short labels for ministries/departments, following PAIMANA's own
# abbreviations where it uses them (e.g. 'MoM', 'DPIIT', 'DWR, RD & GR').
MINISTRY_SHORT = {
    "Department for Promotion of Industry & Internal Trade": "DPIIT",
    "Department of Higher Education": "DoHE",
    "Department of Sports": "DoSports",
    "Department of Telecommunications": "DoT",
    "Department of Water Resources, River Development & GR": "DWR, RD & GR",
    "Ministry of Civil Aviation": "MoCA",
    "Ministry of Coal": "MoC",
    "Ministry of Health & Family Welfare": "MoHFW",
    "Ministry of Housing & Urban Affairs": "MoHUA",
    "Ministry of Labour and Employment": "MoLE",
    "Ministry of Mines": "MoM",
    "Ministry of Petroleum & Natural Gas": "MoPNG",
    "Ministry of Ports, Shipping and Waterways": "MoPSW",
    "Ministry of Power": "MoP",
    "Ministry of Railways": "MoR",
    "Ministry of Road Transport & Highways": "MoRTH",
    "Ministry of Steel": "MoS",
}

_ACRONYM_BRACKET = re.compile(r"[\[(]\s*([A-Za-z][A-Za-z&.\- ]{1,20}?)\s*[\])]\s*$")
_ACRONYM_PARENT = re.compile(r"^([A-Za-z]{2,10})\s*-\s*([A-Za-z]{2,10})$")
_ALL_CAPS_TOKEN = re.compile(r"^[A-Za-z]{2,10}$")


def _norm_words(text: str) -> str:
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


_ROMAN = re.compile(r"^(?=[IVX])I{0,3}(?:V|IV|IX|X)?I{0,3}$")


def agency_parts(raw: str | None) -> tuple[str | None, str | None, str | None]:
    """→ (acronym, parent_acronym, full_name) extracted from a raw agency string.

    The acronym keeps its original case (e.g. 'DoT'); callers upper-case it for keys.
    """
    if not raw:
        return None, None, None
    text = re.sub(r"\s+", " ", raw).strip()
    m = _ACRONYM_PARENT.match(text)
    if m:  # 'NCL - CIL' → parent CIL;  'RVNL - II' → unit suffix, no parent
        parent = m.group(2)
        return m.group(1), (None if _ROMAN.match(parent.upper()) or len(parent) < 3 else parent.upper()), None
    m = _ACRONYM_BRACKET.search(text)
    if m:  # 'Northern Coalfields Limited [NCL]'
        full = text[: m.start()].strip(" ,-")
        acronym = re.sub(r"\s+", "", m.group(1))
        return acronym, None, full or None
    if _ALL_CAPS_TOKEN.match(text) and (text.isupper() or text in {"MoRTH"}):  # 'NHAI', 'MoRTH'
        return text, None, None
    return None, None, text


def build_agency_map(raw_agencies: list[str]) -> dict[str, dict]:
    """Map each raw agency string to canonical {key, display, parent}."""
    counts = Counter(a for a in raw_agencies if a)
    full_to_acr: dict[str, str] = {}
    display_candidates: dict[str, Counter] = defaultdict(Counter)
    parents: dict[str, str] = {}

    parsed = {raw: agency_parts(raw) for raw in counts}
    for raw, (acr, parent, full) in parsed.items():
        if acr and full:
            full_to_acr[_norm_words(full)] = acr
        if acr and parent:
            parents[acr.upper()] = parent

    mapping = {}
    for raw, (acr, parent, full) in parsed.items():
        if acr is None and full is not None:
            acr = full_to_acr.get(_norm_words(full))
        key = acr.upper() if acr else _norm_words(full or raw)
        mapping[raw] = {"key": key}
        # Prefer 'Full Name [ACR]' as the display form, else the most frequent variant.
        if acr and full:
            display_candidates[key][f"{full} [{acr}]"] += counts[raw] + 10_000
        else:
            display_candidates[key][raw] += counts[raw]

    for raw, info in mapping.items():
        key = info["key"]
        info["display"] = display_candidates[key].most_common(1)[0][0]
        info["parent"] = parents.get(key)
    return mapping


# --------------------------------------------------------------------------- states

STATE_ALIASES = {
    "Andaman & Nicobar": "Andaman & Nicobar Islands",
    "Jammu & Kashmir": "Jammu and Kashmir",
    "Dadra & Nagar Haveli and Daman & Diu": "Dadra & Nagar Haveli and Daman & Diu",
}


def normalize_state(name: str | None) -> str | None:
    if not name:
        return None
    name = re.sub(r"\s+", " ", name).strip()
    return STATE_ALIASES.get(name, name)


def is_ner(states: list[str]) -> bool:
    return any(s in NE_STATES for s in states)
