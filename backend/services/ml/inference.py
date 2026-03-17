"""
backend/services/ml/inference.py

Loads the trained XGBoost model and provides engagement score prediction.

Strategy — Hybrid:
  - XGBoost predicts P(Engaged) → used as the engagement score (× 100)
  - Rule-based fusion.py still assigns the 3-state label (Active / Passive / Disengaged)
  - If the model file is missing or fails to load, falls back to rule-based score silently

Feature order must match train_xgboost.py exactly:
  face_detected, eye_openness, head_pose, typing_speed, mouse_activity, idle_time
"""

import os
import numpy as np

# ── Model path ─────────────────────────────────────────────────────
_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "engagement_xgb.pkl"
)

# ── Lazy-load the model once ───────────────────────────────────────
_model = None
_model_available = False

def _load_model():
    global _model, _model_available
    if _model is not None:
        return
    try:
        import joblib
        _model = joblib.load(_MODEL_PATH)
        _model_available = True
        print(f"XGBoost model loaded from {_MODEL_PATH}")
    except Exception as e:
        _model_available = False
        print(f"WARNING: XGBoost model not available - using rule-based fallback. ({e})")

_load_model()


def predict_engagement_score(cv: dict, hci: dict) -> float | None:
    """
    Returns P(Engaged) × 100 as a float score in range [5, 100],
    or None if the model is unavailable (caller falls back to rule-based).

    Feature vector (must match training order):
      [face_detected, eye_openness, head_pose, typing_speed, mouse_activity, idle_time]
    """
    if not _model_available or _model is None:
        return None

    try:
        features = np.array([[
            int(cv.get("face_detected",  0)),
            float(cv.get("eye_openness", 0.0)),
            int(cv.get("head_pose",      0)),
            float(hci.get("typing_speed",   0.0)),
            float(hci.get("mouse_activity", 0.0)),
            float(hci.get("idle_time",      0.0)),
        ]])

        # predict_proba returns [[P(Disengaged), P(Engaged)]]
        proba = float(_model.predict_proba(features)[0][1])   # P(Engaged)

        # Scale to [5, 100] — same bounds as rule-based score
        score = float(round(max(5.0, min(proba * 100, 100.0)), 2))
        return score

    except Exception as e:
        print(f"WARNING: XGBoost inference error: {e}")
        return None


def model_is_available() -> bool:
    return _model_available
