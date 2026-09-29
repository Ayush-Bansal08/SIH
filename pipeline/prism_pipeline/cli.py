"""Run the Phase 1 pipeline end to end.

    python -m prism_pipeline.cli            # extract all reports, build tables, QA, reconcile
    python -m prism_pipeline.cli --months 2026-08

Outputs go to ``pipeline/data/processed`` (Parquet + CSV) and generated
reports to ``docs/``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import time
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone

import pandas as pd

from . import __version__
from .config import DOCS_DIR, FLASH_REPORTS, PROCESSED_DIR
from .extract import extract_report
from .panel import build_tables
from .quality import RULES, run_all
from .reconcile import reconcile
from .reports import write_quality_report, write_reconciliation_report

log = logging.getLogger("prism_pipeline")


def _sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _to_csv_friendly(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in df.columns:
        if df[col].map(lambda v: isinstance(v, (list, tuple, set))).any():
            df[col] = df[col].map(lambda v: "; ".join(v) if isinstance(v, (list, tuple, set)) else v)
    return df


def write_table(name: str, df: pd.DataFrame) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROCESSED_DIR / f"{name}.parquet", index=False)
    _to_csv_friendly(df).to_csv(PROCESSED_DIR / f"{name}.csv", index=False, encoding="utf-8-sig")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--months", nargs="*", help="subset of report months (YYYY-MM)")
    parser.add_argument("--workers", type=int, default=5)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    logging.getLogger("pymupdf").setLevel(logging.ERROR)

    reports = [r for r in FLASH_REPORTS if not args.months or r.month in args.months]
    missing = [r.path for r in reports if not r.path.exists()]
    if missing:
        raise SystemExit(f"missing source PDFs: {missing}")

    t0 = time.time()
    with ProcessPoolExecutor(max_workers=min(args.workers, len(reports))) as pool:
        extractions = list(pool.map(extract_report, reports))
    log.info("extracted %d reports in %.1fs", len(reports), time.time() - t0)

    tables = build_tables(extractions)
    register, systemic = run_all(tables)
    recon = reconcile(tables)

    # Attach DQ flags to the project master so every downstream consumer sees them.
    latest = tables["projects"]["source_month"].iloc[0]
    flags = (
        register[register["source_month"] == latest].groupby("project_code")["rule_id"].apply(lambda s: sorted(set(s)))
        if not register.empty else pd.Series(dtype=object)
    )
    tables["projects"]["dq_flags"] = tables["projects"]["project_code"].map(flags).map(
        lambda v: v if isinstance(v, list) else []
    )
    tables["projects"]["dq_has_error"] = tables["projects"]["dq_flags"].map(
        lambda ids: any(RULES[i].severity == "error" for i in ids)
    )

    for name, df in tables.items():
        write_table(name, df)
    write_table("data_quality_register", register)
    write_table("data_quality_systemic", systemic)
    write_table("reconciliation", recon)

    checks = recon[recon["passed"].notna()]
    manifest = {
        "pipeline_version": __version__,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "latest_month": latest,
        "sources": [
            {"label": r.label, "month": r.month, "file": f"reference/{r.filename}", "sha256": _sha256(r.path),
             "origin": "https://paimana-proj.mospi.gov.in/ReportPage"}
            for r in reports
        ],
        "row_counts": {name: int(len(df)) for name, df in tables.items()},
        "reconciliation": {"checks": int(len(checks)), "passed": int(checks["passed"].sum()),
                           "failed": int((~checks["passed"].astype(bool)).sum())},
        "data_quality": register["severity"].value_counts().to_dict() if not register.empty else {},
    }
    (PROCESSED_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    DOCS_DIR.mkdir(exist_ok=True)
    write_reconciliation_report(recon, tables, DOCS_DIR / "reconciliation-report.md", manifest)
    write_quality_report(register, systemic, tables, DOCS_DIR / "data-quality-report.md", manifest)

    log.info("reconciliation: %s", manifest["reconciliation"])
    log.info("data quality: %s", manifest["data_quality"])
    log.info("done in %.1fs", time.time() - t0)
    return 0 if manifest["reconciliation"]["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
