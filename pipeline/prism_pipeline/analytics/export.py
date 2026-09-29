"""JSON export helpers: strict JSON (no NaN/Infinity), ISO dates, stable ordering."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


def to_jsonable(obj):
    if obj is None or isinstance(obj, (bool, str)):
        return obj
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, (pd.Timestamp, dt.datetime)):
        return None if pd.isna(obj) else obj.date().isoformat()
    if isinstance(obj, dt.date):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set, np.ndarray, pd.Index)):
        items = sorted(obj) if isinstance(obj, set) else list(obj)
        return [to_jsonable(v) for v in items]
    if isinstance(obj, pd.Series):
        return to_jsonable(obj.to_dict())
    if obj is pd.NaT:
        return None
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    raise TypeError(f"not JSON-serialisable: {type(obj).__name__}")


def write_json(path: Path, payload) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(to_jsonable(payload), ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    data = text.encode("utf-8")
    return {"file": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def r2(x, nd: int = 2):
    """Round floats, keep None for missing."""
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(v) or math.isinf(v):
        return None
    return round(v, nd)
