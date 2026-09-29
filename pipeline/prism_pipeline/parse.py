"""Pure parsing helpers for Flash Report cell text.

Every function here is side-effect free and unit tested
(``tests/test_parse.py``). Parsers return ``None`` for "not reported"
values — they never guess.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

_MISSING_TOKENS = {"", "-", "(-)", "na", "n/a", "nil", "none", "(na)"}

# Span colours used by the Flash Report generator inside the "Project Name" cell.
COLOR_NAME = 0x000000
COLOR_AGENCY = 0x800000  # maroon, bold-oblique
COLOR_CODE = 0x122587  # navy, bold
COLOR_LEGACY = 0x696969  # grey, bold  (Legacy OCMS code)
COLOR_PMGID = 0x2E8B57  # green, bold (PMG id)


def clean_text(value: str | None) -> str | None:
    """Collapse internal whitespace/newlines; return None for empty cells."""
    if value is None:
        return None
    text = re.sub(r"\s+", " ", value).strip()
    return text or None


def is_missing(value: str | None) -> bool:
    return value is None or clean_text(value) is None or clean_text(value).lower() in _MISSING_TOKENS


def parse_number(value: str | None) -> float | None:
    """Parse '1,712.00', '(1693.81)', '₹ 30,71,947', '0.00' → float.

    Parentheses in these reports mark the *secondary* value of a stacked
    cell (e.g. revised cost), not a negative number.
    """
    if is_missing(value):
        return None
    text = clean_text(value)
    text = text.replace("₹", "").replace(",", "").strip()
    text = text.strip("()").strip()
    if not text or text.lower() in _MISSING_TOKENS:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_month(value: str | None) -> date | None:
    """Parse 'MM/YYYY' or '(MM/YYYY)' → first day of that month."""
    if is_missing(value):
        return None
    match = re.search(r"(\d{1,2})\s*/\s*(\d{4})", value)
    if not match:
        return None
    month, year = int(match.group(1)), int(match.group(2))
    if not (1 <= month <= 12 and 1900 <= year <= 2100):
        return None
    return date(year, month, 1)


def split_stacked(value: str | None, parts: int = 2) -> list[str | None]:
    """Split a vertically stacked cell ('03/2023\\n(01/2024)') into its lines.

    Always returns exactly ``parts`` items, padding with None.
    """
    if value is None:
        return [None] * parts
    lines = [line.strip() for line in value.split("\n") if line.strip()]
    lines = lines[:parts]
    return lines + [None] * (parts - len(lines))


def split_state(value: str | None) -> tuple[str | None, list[str]]:
    """'Multi-States (Madhya Pradesh, Uttar Pradesh)' → ('Multi-States', [MP, UP]).

    Plain states return (state, [state]). 'PAN India' / 'Offshore' return
    (label, []).
    """
    text = clean_text(value)
    if text is None:
        return None, []
    match = re.match(r"^Multi-States\s*\((.*)\)\s*$", text)
    if match:
        states = [clean_text(s) for s in match.group(1).split(",")]
        return "Multi-States", [s for s in states if s]
    if text in {"PAN India", "Offshore"}:
        return text, []
    return text, [text]


@dataclass
class NameCell:
    name: str | None
    agency: str | None
    project_code: str | None
    legacy_ocms_code: str | None
    pmg_id: str | None
    method: str  # "color" or "regex" — how the cell was split, kept for auditing


def _strip_parens(text: str | None) -> str | None:
    text = clean_text(text)
    if text is None:
        return None
    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1].strip()
    return None if is_missing(text) else text


def parse_name_cell_from_spans(spans: list[tuple[int, str]]) -> NameCell | None:
    """Split the Project Name cell using the report's span colours.

    ``spans`` is a reading-ordered list of (rgb_int, text). Returns None if the
    colour convention is not present (caller then falls back to regex).
    """
    buckets: dict[int, list[str]] = {}
    for color, text in spans:
        buckets.setdefault(color, []).append(text)
    if COLOR_CODE not in buckets and COLOR_AGENCY not in buckets:
        return None

    def joined(color: int) -> str | None:
        return clean_text(" ".join(buckets.get(color, [])))

    # Legacy and PMG id sit on one line as "(-) (-)" in different colours.
    return NameCell(
        name=joined(COLOR_NAME),
        agency=_strip_parens(joined(COLOR_AGENCY)),
        project_code=_strip_parens(joined(COLOR_CODE)),
        legacy_ocms_code=_strip_parens(joined(COLOR_LEGACY)),
        pmg_id=_strip_parens(joined(COLOR_PMGID)),
        method="color",
    )


_CODE_LINE = re.compile(r"^\(?\s*(\d{5,7})\s*\)?$")
_LEGACY_LINE = re.compile(r"^\(([^()]*)\)\s*\(([^()]*)\)$")


def parse_name_cell_from_text(text: str | None) -> NameCell:
    """Regex fallback: name lines, '(Agency)' (may wrap), '(code)', '(legacy) (pmgid)'."""
    lines = [line.strip() for line in (text or "").split("\n") if line.strip()]
    legacy = pmg = code = None

    if lines:
        m = _LEGACY_LINE.match(lines[-1])
        if m and not _CODE_LINE.match(lines[-1]):
            legacy, pmg = _strip_parens(f"({m.group(1)})"), _strip_parens(f"({m.group(2)})")
            lines = lines[:-1]
    if lines and _CODE_LINE.match(lines[-1]):
        code = _CODE_LINE.match(lines[-1]).group(1)
        lines = lines[:-1]

    # Agency: the trailing parenthesised block; it may wrap over several lines.
    agency = None
    if lines and lines[-1].endswith(")"):
        for start in range(len(lines) - 1, -1, -1):
            if lines[start].startswith("("):
                candidate = " ".join(lines[start:])
                if start > 0:  # never consume the whole cell as agency
                    agency = _strip_parens(candidate)
                    lines = lines[:start]
                break
    return NameCell(
        name=clean_text(" ".join(lines)),
        agency=agency,
        project_code=code,
        legacy_ocms_code=legacy,
        pmg_id=pmg,
        method="regex",
    )


_TOTAL_ROW = re.compile(r"^Total\s*\((\d+)\)$", re.IGNORECASE)


def parse_total_label(text: str | None) -> int | None:
    """'Total (26)' → 26."""
    match = _TOTAL_ROW.match(clean_text(text) or "")
    return int(match.group(1)) if match else None


def months_between(start: date | None, end: date | None) -> int | None:
    if start is None or end is None:
        return None
    return (end.year - start.year) * 12 + (end.month - start.month)
