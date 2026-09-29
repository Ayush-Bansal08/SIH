"""Early-warning engine: P(the official completion date is pushed later in the next report).

Two statistical models and two ML models are trained on the same rows:

  statistical  logit  multivariate logistic regression (standardised, L2)
               cox    Cox proportional hazards for recurrent delay events
                      (Andersen-Gill counting process; time axis = elapsed share of
                      the planned duration, so entry into observation is left-truncated)
  ML           xgb    gradient-boosted trees (XGBoost)
               rf     random forest (comparator)

Temporal protocol (never trains on the future):
  evaluation   fit on all labelled months except the last two, calibrate + weight on the
               second-to-last, test once on the last labelled month (e.g. Jul -> Aug 2026).
  live         the same recipe shifted by one month: fit on all but the last labelled
               month, calibrate on the last, score the latest report.

Fusion: each member is Platt-calibrated on the calibration month, then pooled in
log-odds space with weights proportional to its calibration-month skill (AUC - 0.5),
then recalibrated once. Pooling in log-odds keeps every fused score *exactly*
decomposable into feature contributions (linear terms for logit/Cox, TreeSHAP for
XGBoost). Random forest has no exact decomposition in this stack, so it is reported
as a comparator but not fused.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
import xgboost as xgb
from lifelines import CoxTimeVaryingFitter
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

from .common import SEED, binary_metrics, cluster_bootstrap_delta, logit, sigmoid

MODELS: dict[str, dict] = {
    "logit": {"label": "Logistic regression", "track": "statistical", "fused": True},
    "cox": {"label": "Cox proportional hazards (recurrent delays)", "track": "statistical", "fused": True},
    "xgb": {"label": "XGBoost (gradient-boosted trees)", "track": "ml", "fused": True},
    "rf": {"label": "Random forest", "track": "ml", "fused": False},
}
FUSED = tuple(m for m, spec in MODELS.items() if spec["fused"])

BASELINES: dict[str, str] = {
    "due_soon": "Rule of thumb: target date within 1 month or already passed",
    "slipped_last": "Persistence: date was pushed in the last report",
    "either_rule": "Either rule above",
}

# Calibrated probability of a delay revision in the next report -> band.
BANDS: tuple[tuple[str, float], ...] = (("high", 0.40), ("elevated", 0.20), ("moderate", 0.08), ("low", 0.0))
BAND_LABELS = {"high": "High", "elevated": "Elevated", "moderate": "Moderate", "low": "Low"}

GRIDS: dict[str, list[dict]] = {
    "logit": [{"C": c} for c in (0.01, 0.03, 0.1, 0.3, 1.0)],
    "cox": [{"penalizer": p} for p in (0.03, 0.1, 0.3, 1.0)],
    "xgb": [
        {"max_depth": d, "n_estimators": n}
        for d in (2, 3, 4)
        for n in (150, 300, 600)
    ],
    "rf": [
        {"min_samples_leaf": leaf, "max_features": mf}
        for leaf in (5, 20)
        for mf in ("sqrt", 0.3)
    ],
}


def band_of(p: float) -> str:
    for name, lower in BANDS:
        if p >= lower:
            return name
    return "low"


def risk_score(p) -> np.ndarray:
    """0-10 risk score = 10 x calibrated probability, one decimal."""
    return np.round(10 * np.clip(np.asarray(p, float), 0, 1), 1)


# ----------------------------------------------------------------- members


class _LinearPrep:
    """Median imputation + standardisation, fitted on training rows only."""

    def __init__(self, X: pd.DataFrame):
        std = X.std()
        self.columns = [c for c in X.columns if np.isfinite(std[c]) and std[c] > 0]
        self.imputer = SimpleImputer(strategy="median").fit(X[self.columns].to_numpy())
        self.scaler = StandardScaler().fit(self.imputer.transform(X[self.columns].to_numpy()))

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        return self.scaler.transform(self.imputer.transform(X[self.columns].to_numpy()))


class Member:
    name = ""

    def __init__(self, **params):
        self.params = params
        self.design_columns: list[str] = []

    def fit(self, X: pd.DataFrame, y: np.ndarray, meta: pd.DataFrame) -> "Member":
        raise NotImplementedError

    def margin(self, X: pd.DataFrame) -> np.ndarray:
        raise NotImplementedError

    def contributions(self, X: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
        """Per-feature additive contributions to the margin, and the base value.

        ``contrib.sum(axis=1) + base == margin(X)`` (checked in tests).
        """
        raise NotImplementedError


class LogitMember(Member):
    name = "logit"

    def fit(self, X, y, meta):
        self.design_columns = list(X.columns)
        self.prep = _LinearPrep(X)
        self.model = LogisticRegression(C=self.params["C"], max_iter=5000).fit(self.prep.transform(X), y)
        return self

    def margin(self, X):
        return self.model.decision_function(self.prep.transform(X))

    def contributions(self, X):
        phi = self.prep.transform(X) * self.model.coef_[0]
        contrib = pd.DataFrame(0.0, index=X.index, columns=self.design_columns)
        contrib[self.prep.columns] = phi
        return contrib, np.full(len(X), float(self.model.intercept_[0]))

    def coefficients(self) -> pd.Series:
        return pd.Series(self.model.coef_[0], index=self.prep.columns)


def cox_intervals(meta: pd.DataFrame, fallback_duration: float) -> tuple[np.ndarray, np.ndarray]:
    """Interval (start, stop] on the normalised project clock for each project-month row."""
    planned = meta["planned_duration"].fillna(fallback_duration).clip(lower=1).to_numpy(float)
    elapsed = meta["months_since_start"].fillna(meta["months_since_approval"]).fillna(0).to_numpy(float)
    start = elapsed / planned
    return start, start + 1.0 / planned


class CoxMember(Member):
    name = "cox"

    def fit(self, X, y, meta):
        self.design_columns = list(X.columns)
        self.prep = _LinearPrep(X)
        Z = self.prep.transform(X)
        cols = [f"x{i}" for i in range(Z.shape[1])]
        df = pd.DataFrame(Z, columns=cols)
        self.fallback_duration = float(meta["planned_duration"].median())
        start, stop = cox_intervals(meta, self.fallback_duration)
        df["_start"], df["_stop"] = start, stop
        df["_event"] = np.asarray(y, int)
        df["_id"] = meta["project_code"].to_numpy()
        self.model = CoxTimeVaryingFitter(penalizer=self.params["penalizer"]).fit(
            df, id_col="_id", event_col="_event", start_col="_start", stop_col="_stop", show_progress=False
        )
        self.beta = self.model.params_.reindex(cols).to_numpy(float)
        return self

    def margin(self, X):
        return self.prep.transform(X) @ self.beta

    def contributions(self, X):
        contrib = pd.DataFrame(0.0, index=X.index, columns=self.design_columns)
        contrib[self.prep.columns] = self.prep.transform(X) * self.beta
        return contrib, np.zeros(len(X))

    def coefficients(self) -> pd.Series:
        return pd.Series(self.beta, index=self.prep.columns)


class XGBMember(Member):
    name = "xgb"

    def fit(self, X, y, meta):
        self.design_columns = list(X.columns)
        self.model = xgb.XGBClassifier(
            objective="binary:logistic",
            eval_metric="logloss",
            learning_rate=0.05,
            min_child_weight=5,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=2.0,
            tree_method="hist",
            random_state=SEED,
            n_jobs=4,
            **self.params,
        ).fit(X.to_numpy(float), np.asarray(y, int))
        return self

    def margin(self, X):
        return self.model.predict(X[self.design_columns].to_numpy(float), output_margin=True)

    def contributions(self, X):
        booster = self.model.get_booster()
        shap = booster.predict(xgb.DMatrix(X[self.design_columns].to_numpy(float)), pred_contribs=True)
        return pd.DataFrame(shap[:, :-1], index=X.index, columns=self.design_columns), shap[:, -1]


class RFMember(Member):
    name = "rf"

    def fit(self, X, y, meta):
        self.design_columns = list(X.columns)
        self.imputer = SimpleImputer(strategy="median", keep_empty_features=True).fit(X.to_numpy(float))
        self.model = RandomForestClassifier(
            n_estimators=400, random_state=SEED, n_jobs=-1, **self.params
        ).fit(self.imputer.transform(X.to_numpy(float)), np.asarray(y, int))
        return self

    def margin(self, X):
        p = self.model.predict_proba(self.imputer.transform(X[self.design_columns].to_numpy(float)))[:, 1]
        return logit(np.clip(p, 1e-3, 1 - 1e-3))


MEMBER_CLASSES = {"logit": LogitMember, "cox": CoxMember, "xgb": XGBMember, "rf": RFMember}


def make_member(name: str, params: dict) -> Member:
    return MEMBER_CLASSES[name](**params)


# ----------------------------------------------------------------- recipe


@dataclass
class Platt:
    a: float
    b: float

    @classmethod
    def fit(cls, margin: np.ndarray, y: np.ndarray) -> "Platt":
        lr = LogisticRegression(C=1e6, max_iter=5000).fit(np.asarray(margin).reshape(-1, 1), y)
        return cls(float(lr.intercept_[0]), float(lr.coef_[0, 0]))

    def logit(self, margin) -> np.ndarray:
        return self.a + self.b * np.asarray(margin, float)

    def proba(self, margin) -> np.ndarray:
        return sigmoid(self.logit(margin))


@dataclass
class Recipe:
    """Fitted members + calibration + fusion weights (one temporal fold)."""

    fit_months: list[str]
    cal_month: str
    members: dict[str, Member]
    platt: dict[str, Platt]
    weights: dict[str, float]
    final: Platt
    cal_auc: dict[str, float]
    rule_rates: dict[str, tuple[float, float]] = field(default_factory=dict)

    def member_proba(self, X: pd.DataFrame) -> dict[str, np.ndarray]:
        return {m: self.platt[m].proba(self.members[m].margin(X)) for m in self.members}

    def fused_logit(self, X: pd.DataFrame) -> np.ndarray:
        pooled = sum(self.weights[m] * self.platt[m].logit(self.members[m].margin(X)) for m in FUSED)
        return self.final.logit(pooled)

    def proba(self, X: pd.DataFrame) -> np.ndarray:
        return sigmoid(self.fused_logit(X))

    def track_proba(self, X: pd.DataFrame) -> dict[str, np.ndarray]:
        """Statistical track (logit + Cox, pooled by their weights) and ML track (XGBoost)."""
        out = {}
        for track in ("statistical", "ml"):
            names = [m for m in FUSED if MODELS[m]["track"] == track]
            total = sum(self.weights[m] for m in names)
            if total <= 0:
                w = {m: 1 / len(names) for m in names}
            else:
                w = {m: self.weights[m] / total for m in names}
            out[track] = sigmoid(sum(w[m] * self.platt[m].logit(self.members[m].margin(X)) for m in names))
        return out

    def explain(self, X: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
        """Exact additive decomposition of the fused log-odds."""
        contrib = pd.DataFrame(0.0, index=X.index, columns=X.columns)
        base = np.zeros(len(X))
        for m in FUSED:
            phi, b0 = self.members[m].contributions(X)
            scale = self.final.b * self.weights[m] * self.platt[m].b
            contrib = contrib.add(phi.reindex(columns=X.columns, fill_value=0.0) * scale)
            base += self.final.b * self.weights[m] * (self.platt[m].a + self.platt[m].b * b0)
        base += self.final.a
        return contrib, base

    def rule_proba(self, panel: pd.DataFrame) -> dict[str, np.ndarray]:
        scores = baseline_scores(panel)
        return {r: np.where(scores[r] > 0, p1, p0) for r, (p0, p1) in self.rule_rates.items()}


def baseline_scores(panel: pd.DataFrame) -> dict[str, np.ndarray]:
    due = (panel["months_to_expected"] <= 1).fillna(False).to_numpy(float)
    slipped = panel["slipped_last_month"].fillna(0).to_numpy(float)
    return {"due_soon": due, "slipped_last": slipped, "either_rule": np.maximum(due, slipped)}


def _labelled(panel: pd.DataFrame, months) -> pd.DataFrame:
    return panel[panel["source_month"].isin(list(months)) & panel["y_slip_next"].notna() & ~panel["excluded"]]


def fit_members(train: pd.DataFrame, X: pd.DataFrame, hyper: dict[str, dict], names=None) -> dict[str, Member]:
    y = train["y_slip_next"].to_numpy(int)
    names = names or list(MODELS)
    return {m: make_member(m, hyper[m]).fit(X, y, train) for m in names}


def fit_recipe(panel: pd.DataFrame, design, fit_months, cal_month, hyper) -> Recipe:
    train = _labelled(panel, fit_months)
    cal = _labelled(panel, [cal_month])
    Xtr, Xcal = design(train), design(cal)
    ycal = cal["y_slip_next"].to_numpy(int)
    members = fit_members(train, Xtr, hyper)
    margins = {m: members[m].margin(Xcal) for m in members}
    platt = {m: Platt.fit(margins[m], ycal) for m in members}
    cal_auc = {m: float(roc_auc_score(ycal, margins[m])) for m in members}
    skill = {m: max(cal_auc[m] - 0.5, 0.0) for m in FUSED}
    total = sum(skill.values())
    weights = {m: (skill[m] / total if total > 0 else 1 / len(FUSED)) for m in FUSED}
    pooled = sum(weights[m] * platt[m].logit(margins[m]) for m in FUSED)
    final = Platt.fit(pooled, ycal)
    rules = baseline_scores(cal)
    rule_rates = {}
    for r, s in rules.items():
        flagged = s > 0
        p1 = ycal[flagged].mean() if flagged.any() else ycal.mean()
        p0 = ycal[~flagged].mean() if (~flagged).any() else ycal.mean()
        rule_rates[r] = (float(p0), float(p1))
    return Recipe(list(fit_months), cal_month, members, platt, weights, final, cal_auc, rule_rates)


def select_hyperparams(panel, design, train_months, val_month) -> tuple[dict[str, dict], dict]:
    """Pick each model's settings by validation AUC (ties -> first, i.e. simplest)."""
    train = _labelled(panel, train_months)
    val = _labelled(panel, [val_month])
    Xtr, Xval = design(train), design(val)
    ytr, yval = train["y_slip_next"].to_numpy(int), val["y_slip_next"].to_numpy(int)
    chosen, trace = {}, {}
    for name, grid in GRIDS.items():
        scores = []
        for params in grid:
            member = make_member(name, params).fit(Xtr, ytr, train)
            scores.append(float(roc_auc_score(yval, member.margin(Xval))))
        best = int(np.argmax(scores))
        chosen[name] = grid[best]
        trace[name] = [{"params": p, "val_auc": s} for p, s in zip(grid, scores)]
    return chosen, trace


# ----------------------------------------------------------------- evaluation


def evaluate_on(recipe: Recipe, panel: pd.DataFrame, design, month: str, n_boot: int = 1000) -> dict:
    test = _labelled(panel, [month])
    X = design(test)
    y = test["y_slip_next"].to_numpy(int)
    groups = test["eval_group"].to_numpy()
    probs = recipe.member_proba(X)
    probs["fused"] = recipe.proba(X)
    tracks = recipe.track_proba(X)
    probs["track_statistical"] = tracks["statistical"]
    probs["track_ml"] = tracks["ml"]
    rules = recipe.rule_proba(test)

    metrics = {k: binary_metrics(y, v) for k, v in probs.items()}
    metrics.update({f"rule_{k}": binary_metrics(y, v) for k, v in rules.items()})

    band = np.array([band_of(p) for p in probs["fused"]])
    band_table = []
    for name, _ in BANDS:
        sel = band == name
        band_table.append(
            {
                "band": name,
                "n": int(sel.sum()),
                "slipped": int(y[sel].sum()),
                "observed_rate": float(y[sel].mean()) if sel.any() else None,
                "mean_predicted": float(probs["fused"][sel].mean()) if sel.any() else None,
            }
        )
    high = band == "high"
    at_high = {
        "flagged": int(high.sum()),
        "true_positives": int(y[high].sum()),
        "precision": float(y[high].mean()) if high.any() else None,
        "recall": float(y[high].sum() / max(1, y.sum())),
    }
    watch = np.isin(band, ["high", "elevated"])
    at_elevated = {
        "flagged": int(watch.sum()),
        "true_positives": int(y[watch].sum()),
        "precision": float(y[watch].mean()) if watch.any() else None,
        "recall": float(y[watch].sum() / max(1, y.sum())),
    }

    best_rule = max(rules, key=lambda r: metrics[f"rule_{r}"]["auc"])
    comparisons = {
        "xgb_vs_logit": ("xgb", "logit"),
        "xgb_vs_cox": ("xgb", "cox"),
        "rf_vs_logit": ("rf", "logit"),
        "cox_vs_logit": ("cox", "logit"),
        "fused_vs_logit": ("fused", "logit"),
        "fused_vs_xgb": ("fused", "xgb"),
        "track_ml_vs_track_statistical": ("track_ml", "track_statistical"),
        "logit_vs_best_rule": ("logit", None),
        "fused_vs_best_rule": ("fused", None),
    }
    deltas = {}
    for key, (a, b) in comparisons.items():
        sb = rules[best_rule] if b is None else probs[b]
        deltas[key] = cluster_bootstrap_delta(y, probs[a], sb, groups, n_boot=n_boot).as_dict()
    return {
        "month": month,
        "label_month": _next_month(month),
        "metrics": metrics,
        "bands": band_table,
        "at_high": at_high,
        "at_elevated_or_high": at_elevated,
        "best_rule": best_rule,
        "deltas_auc": deltas,
        "n_clusters": int(len(np.unique(groups))),
    }


def rolling_origin(panel, design, months: list[str], hyper) -> list[dict]:
    """Each labelled month k >= 2nd: fit on all months before k, test on k (ranking only)."""
    out = []
    for k in range(1, len(months)):
        train = _labelled(panel, months[:k])
        test = _labelled(panel, [months[k]])
        Xtr, Xte = design(train), design(test)
        y = test["y_slip_next"].to_numpy(int)
        members = fit_members(train, Xtr, hyper)
        row = {"train_months": months[:k], "test_month": months[k], "n": int(len(y)), "positives": int(y.sum())}
        row["auc"] = {m: float(roc_auc_score(y, members[m].margin(Xte))) for m in members}
        for r, s in baseline_scores(test).items():
            row["auc"][f"rule_{r}"] = float(roc_auc_score(y, s))
        out.append(row)
    return out


def lead_time(panel, design, months: list[str], hyper) -> dict:
    """Out-of-sample flags from the full recipe at every origin where it can run.

    A delay event is 'caught' when the project was in the High band in the report
    before the revision. Lead = consecutive earlier reports in which it was already
    flagged without an intervening revision (bounded by the available window).
    """
    flags: dict[str, pd.DataFrame] = {}
    for k in range(2, len(months)):
        recipe = fit_recipe(panel, design, months[: k - 1], months[k - 1], hyper)
        rows = _labelled(panel, [months[k]])
        p = recipe.proba(design(rows))
        flags[months[k]] = pd.DataFrame(
            {
                "project_code": rows["project_code"].to_numpy(),
                "p": p,
                "high": p >= BANDS[0][1],
                "y": rows["y_slip_next"].to_numpy(int),
            }
        ).set_index("project_code")
    origins = sorted(flags)
    events, caught, leads = 0, 0, []
    per_origin = []
    for i, m in enumerate(origins):
        f = flags[m]
        ev = f[f["y"] == 1]
        c = ev[ev["high"]]
        per_origin.append(
            {
                "origin": m,
                "revision_report": _next_month(m),
                "events": int(len(ev)),
                "caught": int(len(c)),
                "flagged": int(f["high"].sum()),
                "precision": float(f.loc[f["high"], "y"].mean()) if f["high"].any() else None,
            }
        )
        events += len(ev)
        caught += len(c)
        for code in c.index:
            lead = 1
            for j in range(i - 1, -1, -1):
                prev = flags[origins[j]]
                if code in prev.index and bool(prev.at[code, "high"]) and int(prev.at[code, "y"]) == 0:
                    lead += 1
                else:
                    break
            leads.append(lead)
    return {
        "origins": per_origin,
        "events": int(events),
        "caught": int(caught),
        "recall": float(caught / max(1, events)),
        "mean_lead_reports": float(np.mean(leads)) if leads else None,
        "max_window_reports": len(origins),
    }


def _next_month(month: str) -> str:
    y, m = map(int, month.split("-"))
    y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return f"{y:04d}-{m:02d}"
