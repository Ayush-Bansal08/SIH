"""Shared helpers for the analytics engine: loading, evaluation groups, metrics."""

from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, roc_auc_score

from ..config import PIPELINE_DIR, PROCESSED_DIR

SEED = 42
EXPORT_DIR = PIPELINE_DIR / "data" / "export"

# July 2026 note: "Project ID 706775 has been split into 26 sub-projects" (research.md C10).
# The sub-projects share one history, so they count as one cluster in evaluation.
_BHARATNET_SPLIT = re.compile(r"^Amended BharatNet Program", re.IGNORECASE)

TABLES = (
    "ongoing_long", "projects", "completed", "newly_added", "lifecycle", "kpis",
    "ministry_totals", "data_quality_register", "data_quality_systemic", "agency_aliases",
)


def load_processed() -> dict[str, pd.DataFrame]:
    missing = [t for t in TABLES if not (PROCESSED_DIR / f"{t}.parquet").exists()]
    if missing:
        raise FileNotFoundError(
            f"Phase 1 outputs missing ({', '.join(missing)}); run `python -m prism_pipeline.cli` first."
        )
    return {t: pd.read_parquet(PROCESSED_DIR / f"{t}.parquet") for t in TABLES}


def eval_group(project_code: str, project_name: str | None) -> str:
    if project_name and _BHARATNET_SPLIT.search(project_name):
        return "706775-split"
    return str(project_code)


def error_projects(dq_register: pd.DataFrame) -> set[str]:
    """Projects with an error-severity data-quality finding: excluded from training."""
    return set(dq_register.loc[dq_register["severity"] == "error", "project_code"].astype(str))


# ---------------------------------------------------------------- metrics


def expected_calibration_error(y: np.ndarray, p: np.ndarray, bins: int = 10) -> float:
    """ECE with equal-count bins (robust when most probabilities are small)."""
    y, p = np.asarray(y, float), np.asarray(p, float)
    order = np.argsort(p, kind="mergesort")
    ece = 0.0
    for chunk in np.array_split(order, bins):
        if len(chunk):
            ece += len(chunk) / len(p) * abs(y[chunk].mean() - p[chunk].mean())
    return float(ece)


def top_fraction_stats(y: np.ndarray, score: np.ndarray, fraction: float = 0.10) -> dict:
    y, score = np.asarray(y, float), np.asarray(score, float)
    k = max(1, int(round(fraction * len(y))))
    top = np.argsort(-score, kind="mergesort")[:k]
    hits = y[top].sum()
    return {
        "k": int(k),
        "precision": float(hits / k),
        "recall": float(hits / max(1.0, y.sum())),
        "lift": float((hits / k) / max(1e-9, y.mean())),
    }


def binary_metrics(y, p, probabilistic: bool = True) -> dict:
    """Ranking metrics always; probability metrics only for calibrated outputs."""
    y, p = np.asarray(y, float), np.asarray(p, float)
    out = {
        "n": int(len(y)),
        "positives": int(y.sum()),
        "base_rate": float(y.mean()),
        "auc": float(roc_auc_score(y, p)),
        "pr_auc": float(average_precision_score(y, p)),
        "top10": top_fraction_stats(y, p, 0.10),
    }
    if probabilistic:
        pc = np.clip(p, 1e-6, 1 - 1e-6)
        out["brier"] = float(brier_score_loss(y, pc))
        out["log_loss"] = float(log_loss(y, pc, labels=[0, 1]))
        out["ece"] = expected_calibration_error(y, pc)
    return out


@dataclass(frozen=True)
class DeltaCI:
    delta: float
    low: float
    high: float
    p_not_better: float  # share of bootstrap replicates where delta <= 0

    def as_dict(self) -> dict:
        return {
            "delta": self.delta,
            "ci95": [self.low, self.high],
            "p_not_better": self.p_not_better,
            "significant": bool(self.low > 0 or self.high < 0),
        }


def cluster_bootstrap_delta(
    y, score_a, score_b, groups, metric=roc_auc_score, n_boot: int = 1000, seed: int = SEED
) -> DeltaCI:
    """metric(score_a) - metric(score_b), 95% percentile CI resampling whole clusters.

    Clustering (by project / split programme) respects that rows of one project
    are not independent.
    """
    y = np.asarray(y, float)
    a, b = np.asarray(score_a, float), np.asarray(score_b, float)
    groups = np.asarray(groups)
    uniq, inv = np.unique(groups, return_inverse=True)
    members = [np.flatnonzero(inv == i) for i in range(len(uniq))]
    rng = np.random.default_rng(seed)
    point = metric(y, a) - metric(y, b)
    deltas = []
    for _ in range(n_boot):
        pick = rng.integers(0, len(uniq), len(uniq))
        idx = np.concatenate([members[i] for i in pick])
        yy = y[idx]
        if yy.min() == yy.max():
            continue
        deltas.append(metric(yy, a[idx]) - metric(yy, b[idx]))
    deltas = np.asarray(deltas)
    return DeltaCI(
        delta=float(point),
        low=float(np.quantile(deltas, 0.025)),
        high=float(np.quantile(deltas, 0.975)),
        p_not_better=float((deltas <= 0).mean()),
    )


def logit(p):
    p = np.clip(np.asarray(p, float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.asarray(z, float)))
