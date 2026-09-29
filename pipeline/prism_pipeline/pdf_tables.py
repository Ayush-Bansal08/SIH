"""Locate report sections and iterate ruled tables with PyMuPDF.

The Flash Reports are generated with ruled (bordered) tables, so PyMuPDF's
line-based ``find_tables`` recovers the cell grid reliably. For the
Project Name column we additionally keep the coloured text spans inside
the cell, which lets us split name / agency / code without guessing.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Iterator

import pymupdf

log = logging.getLogger(__name__)


@dataclass
class TableRow:
    page: int  # 1-based PDF page number (for provenance)
    row_index: int
    cells: list[str | None]
    cell_spans: dict[int, list[tuple[int, str]]] = field(default_factory=dict)


def first_line(page: pymupdf.Page) -> str:
    for line in page.get_text().split("\n"):
        if line.strip():
            return line.strip()
    return ""


def section_pages(doc: pymupdf.Document, title: str) -> list[int]:
    """0-based indices of pages whose first line is exactly ``title``."""
    return [i for i, page in enumerate(doc) if first_line(page) == title]


def _page_spans(page: pymupdf.Page) -> list[tuple[tuple[float, float, float, float], int, str]]:
    spans = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if span["text"].strip():
                    spans.append((tuple(span["bbox"]), span["color"], span["text"]))
    return spans


def _spans_in_bbox(spans, bbox) -> list[tuple[int, str]]:
    x0, y0, x1, y1 = bbox
    inside = []
    for (sx0, sy0, sx1, sy1), color, text in spans:
        cx, cy = (sx0 + sx1) / 2, (sy0 + sy1) / 2
        if x0 <= cx <= x1 and y0 <= cy <= y1:
            inside.append((round(sy0, 1), sx0, color, text))
    inside.sort(key=lambda s: (s[0], s[1]))
    return [(color, text) for _, _, color, text in inside]


def iter_table_rows(
    doc: pymupdf.Document,
    page_indices: list[int],
    min_cols: int,
    span_columns: tuple[int, ...] = (),
) -> Iterator[TableRow]:
    """Yield every row of the main ruled table on each page, in reading order.

    ``span_columns`` lists column indices for which coloured spans are
    collected (used for the Project Name cell).
    """
    for index in page_indices:
        page = doc[index]
        tables = [t for t in page.find_tables().tables if t.col_count >= min_cols]
        if not tables:
            log.warning("page %s: no table with >= %s columns", index + 1, min_cols)
            continue
        spans = _page_spans(page) if span_columns else []
        for table in sorted(tables, key=lambda t: t.bbox[1]):
            texts = table.extract()
            for r, (row_text, row_obj) in enumerate(zip(texts, table.rows)):
                cell_spans = {}
                for col in span_columns:
                    if col < len(row_obj.cells) and row_obj.cells[col] is not None:
                        cell_spans[col] = _spans_in_bbox(spans, row_obj.cells[col])
                yield TableRow(page=index + 1, row_index=r, cells=list(row_text), cell_spans=cell_spans)
