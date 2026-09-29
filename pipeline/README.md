# PRISM data pipeline

Turns the official PAIMANA monthly **Flash Reports** (PDF) into clean,
reconciled, provenance-tagged tables. The pipeline is open source (PyMuPDF,
pandas, pyarrow, pytest) and needs no network access.

## Run

```powershell
# one-time setup (Windows, from the repo root)
py -3.10 -m venv pipeline\.venv
pipeline\.venv\Scripts\python -m pip install -r pipeline\requirements.txt

# extract + normalise + data-quality + reconcile (about 80 s; the 5 reports run in parallel)
cd pipeline
.venv\Scripts\python -m prism_pipeline.cli

# prototype data package (about 35 s): scores, drivers, Advisor scenarios, Ask PRISM answers
.venv\Scripts\python -m prism_pipeline.analytics.run

# tests (unit + integration against the outputs)
.venv\Scripts\python -m pytest -q
```

The CLI exits non-zero if any reconciliation check fails. The data build is
deterministic: re-running it produces byte-identical JSON (apart from timestamps).

## Prototype data package (`prism_pipeline/analytics/`)

```
data/processed/*.parquet
  └─ features.py       one row per project-month; history looks backwards only (leakage-tested)
  └─ early_warning.py  logistic + Cox (statistical) and XGBoost (+ random forest comparator);
                       trained Apr–May, calibrated Jun, tested once on Jul→Aug, then refit to score Aug
  └─ explain.py        exact per-project decomposition of the fused score → plain-language drivers
  └─ advisor.py        same-ministry buffer → shortfall pairings from official figures only
  └─ benchmark.py      portfolio counts, peer groups, alert types
  └─ ask.py            grounded Ask PRISM answers with sources
  └─ run.py            curates the ~60-project prototype sample and writes the JSON
→ data/export/{portfolio,projects,advisor,ask,evidence,demo,manifest}.json + docs/evidence-report.md
```

Contract of each file: `docs/prototype-plan.md`.

## What it does

```
reference/FlashReport_2026-0{4..8}.pdf
  └─ extract.py     ruled-table detection (PyMuPDF) + colour-coded span parsing of the Name cell
                    Tables 1, 3, 4, 5, 6 · overview KPIs · NER KPIs · HML sector overviews · report notes
  └─ normalize.py   agency / state canonicalisation, ministry short labels, sector → HML category
  └─ panel.py       long panel keyed by project code, latest-snapshot master, lifecycle with exit reasons
  └─ quality.py     18 data-quality rules (flag, never fix) with report + page provenance
  └─ reconcile.py   855 checks against the totals the reports themselves print
  └─ reports.py     docs/reconciliation-report.md, docs/data-quality-report.md
→ data/processed/*.parquet|csv + manifest.json (SHA-256 of every source PDF)
```

## Adding a new month

1. Download the Flash Report from https://paimana-proj.mospi.gov.in/ReportPage.
2. Save it as `reference/FlashReport_YYYY-MM.pdf`.
3. Add a `FlashReport(...)` entry to `prism_pipeline/config.py`.
4. Re-run the CLI and the tests. If the reconciliation passes, the month was read faithfully.

## Design rules

- **Never impute or repair official values.** Suspicious values go to the data-quality register with the PDF page number.
- **Every row carries provenance:** `source_month`, `source_table`, `source_page`.
- **Extraction is proven, not assumed:** row counts reconcile exactly with the report's own totals, and 32 rows are spot-checked field by field in `tests/test_spot_check.py`.
