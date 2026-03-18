"""
backend/services/ml/inference.py  — 3-class engagement model

Loads the trained XGBoost 3-class model and returns:
  - label:      "Active Engagement" | "Passive Engagement" | "Disengaged"
  - confidence: float 0.0–1.0
  - score:      float 0–100 derived from class probabilities

Feature order must match train_xgboost.py exactly:
  face_detected, eye_openness, head_pose,
  typing_speed, mouse_activity, idle_time
"""

import os
import numpy as np

# ── Model path ─────────────────────────────────────────────────────
_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "engagement_xgb.pkl"
)

# ── Label map — must match train_xgboost.py ────────────────────────
# 0 → Active Engagement
# 1 → Passive Engagement
# 2 → Disengaged
LABEL_NAMES = ["Active Engagement", "Passive Engagement", "Disengaged"]

# Score centres for each class (used to convert probabilities → score)
# Active ~ 85, Passive ~ 55, Disengaged ~ 20
LABEL_SCORE_CENTRES = [85.0, 55.0, 20.0]

# ── Lazy-load model ────────────────────────────────────────────────
_model           = None
_model_available = False


def _load_model():
    global _model, _model_available
    if _model is not None:
        return
    try:
        import joblib
        _model           = joblib.load(_MODEL_PATH)
        _model_available = True
        print(f"✅ XGBoost 3-class model loaded from {_MODEL_PATH}")
    except Exception as e:
        _model_available = False
        print(f"⚠️  XGBoost model not available — rule-based fallback active. ({e})")


_load_model()


def predict_engagement(cv: dict, hci: dict) -> dict | None:
    """
    Returns a dict with:
        label:      str   — "Active Engagement" | "Passive Engagement" | "Disengaged"
        score:      float — 0–100 engagement score (NO hard floor/ceiling clamp)
        confidence: float — 0.0–1.0 probability of predicted class

    Returns None if model is unavailable (fusion.py falls back to rule-based).

    Feature vector (must match training order):
        [face_detected, eye_openness, head_pose,
         typing_speed, mouse_activity, idle_time]
    """
    if not _model_available or _model is None:
        return None

    try:
        features = np.array([[
            int(float(cv.get("face_detected",  0))),
            float(cv.get("eye_openness",        0.0)),
            float(cv.get("head_pose",           0.0)),   # float, not forced int
            float(hci.get("typing_speed",       0.0)),
            float(hci.get("mouse_activity",     0.0)),
            float(hci.get("idle_time",          0.0)),
        ]])

        # predict_proba → shape (1, 3)  [P(Active), P(Passive), P(Disengaged)]
        proba      = _model.predict_proba(features)[0]
        class_idx  = int(np.argmax(proba))
        confidence = float(proba[class_idx])
        label      = LABEL_NAMES[class_idx]

        # Weighted score: sum of (probability × score_centre) for each class
        # Gives a smooth continuous score rather than a hard jump
        score = float(np.dot(proba, LABEL_SCORE_CENTRES))
        score = round(max(0.0, min(100.0, score)), 2)

        return {
            "label":      label,
            "score":      score,
            "confidence": round(confidence, 4),
            "proba":      {
                "active":     round(float(proba[0]), 4),
                "passive":    round(float(proba[1]), 4),
                "disengaged": round(float(proba[2]), 4),
            }
        }

    except Exception as e:
        print(f"⚠️  XGBoost inference error: {e}")
        return None


def model_is_available() -> bool:
    return _model_available
