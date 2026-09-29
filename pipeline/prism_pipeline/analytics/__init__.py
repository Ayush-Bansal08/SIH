"""Phase 2 — PRISM analytics engine.

Reads the reconciled Phase 1 tables (``pipeline/data/processed``) and produces:
  * the early-warning risk score (statistical vs ML, fused, calibrated, explained),
  * the budget outlook (reference-class cost escalation with conformal ranges),
  * the completion forecast (Cox proportional hazards, left-truncated),
  * the CUF-Gap attribution, backtests, benchmarks, alerts and the Reallocation Advisor,
  * JSON exports for the web app and a generated evaluation report.

Run with ``python -m prism_pipeline.analytics.run``.
"""
