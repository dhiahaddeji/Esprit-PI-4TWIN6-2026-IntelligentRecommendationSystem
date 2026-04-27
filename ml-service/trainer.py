"""
trainer.py — Feedback-driven model retraining.

Training data schema (data/feedback.json):
[
  {
    "features": [f0, f1, ..., f11],   // 12-dim vector from Recommender._score_employee
    "label": 1,                        // 1 = HR selected, 0 = not selected / manager refused
    "activity_id": "...",
    "employee_id": "..."
  },
  ...
]

The model is retrained when:
  • POST /train is called manually by HR
  • OR when feedback count crosses multiples of MIN_SAMPLES (auto-trigger)

Algorithm: GradientBoostingClassifier
  • n_estimators    = 200
  • max_depth       = 4
  • learning_rate   = 0.05
  • subsample       = 0.8
  • min_samples_leaf= 5
  • random_state    = 42
  • class_weight    = 'balanced'  (handles imbalance: more non-selected than selected)

Output: model.joblib + scaler.joblib saved to data/
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report

logger = logging.getLogger(__name__)

FEEDBACK_PATH = Path(__file__).parent / "data" / "feedback.json"
MIN_SAMPLES   = 20     # minimum rows required before training


# ── Feedback storage ───────────────────────────────────────────────────────────

def load_feedback() -> list[dict]:
    if not FEEDBACK_PATH.exists():
        return []
    try:
        with open(FEEDBACK_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Cannot load feedback: %s", e)
        return []


def save_feedback(records: list[dict]) -> None:
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(FEEDBACK_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def add_feedback(
    features: list[float],
    label: int,          # 1 = selected, 0 = not selected
    activity_id: str,
    employee_id: str,
) -> int:
    """
    Append one feedback row.
    Returns total number of feedback rows after insertion.
    """
    records = load_feedback()

    # Deduplicate: one row per (activity_id, employee_id)
    records = [
        r for r in records
        if not (r.get("activity_id") == activity_id and r.get("employee_id") == employee_id)
    ]
    records.append({
        "features":    features,
        "label":       label,
        "activity_id": activity_id,
        "employee_id": employee_id,
    })
    save_feedback(records)
    return len(records)


# ── Model training ─────────────────────────────────────────────────────────────

def train(recommender) -> dict:
    """
    Train (or retrain) the GradientBoosting model on all stored feedback.
    Returns a dict with training metrics.

    Parameters
    ----------
    recommender : Recommender instance — model is saved back via recommender.save_model()
    """
    records = load_feedback()

    if len(records) < MIN_SAMPLES:
        return {
            "status": "skipped",
            "reason": f"Not enough feedback ({len(records)} < {MIN_SAMPLES} required)",
            "n_samples": len(records),
        }

    X = np.array([r["features"] for r in records], dtype=float)
    y = np.array([r["label"]    for r in records], dtype=int)

    n_pos = int(y.sum())
    n_neg = int((y == 0).sum())

    if n_pos < 2 or n_neg < 2:
        return {
            "status": "skipped",
            "reason": f"Need at least 2 positive and 2 negative samples (got {n_pos}+/{n_neg}-).",
            "n_samples": len(records),
        }

    # ── Scale features ─────────────────────────────────────────────────────
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Train model ────────────────────────────────────────────────────────
    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=5,
        random_state=42,
    )

    # Cross-validation (only if enough samples)
    cv_scores: list[float] = []
    if len(records) >= 30:
        n_splits = min(5, n_pos, n_neg)
        if n_splits >= 2:
            cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
            cv_scores = cross_val_score(model, X_scaled, y, cv=cv, scoring="roc_auc").tolist()

    model.fit(X_scaled, y)

    # ── Evaluate on full training set ──────────────────────────────────────
    y_pred = model.predict(X_scaled)
    report = classification_report(y, y_pred, output_dict=True)

    # ── Feature importances ────────────────────────────────────────────────
    feature_names = [
        "coverage_ratio", "avg_level_ratio", "avg_similarity",
        "meets_ratio", "avg_level_gap_norm", "profile_breadth",
        "ctx_weight_norm", "heuristic_score", "experience_norm",
        "match_ratio", "raw_level_gap", "is_certification",
    ]
    importances = dict(zip(feature_names, model.feature_importances_.round(4).tolist()))

    # ── Persist ────────────────────────────────────────────────────────────
    recommender.save_model(model, scaler)

    return {
        "status":       "trained",
        "n_samples":    len(records),
        "n_positive":   n_pos,
        "n_negative":   n_neg,
        "cv_roc_auc":   round(float(np.mean(cv_scores)), 4) if cv_scores else None,
        "train_accuracy": round(float(report["accuracy"]), 4),
        "feature_importances": importances,
    }
