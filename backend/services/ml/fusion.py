# backend/services/ml/fusion.py  v4
# 3-class soft-scoring fusion — matches train_xgboost.py label scheme
# No hard boolean gates. OR logic. Face absence does not force Disengaged.

ACTIVE_LABEL     = "Active Engagement"
PASSIVE_LABEL    = "Passive Engagement"
DISENGAGED_LABEL = "Disengaged"


def _normalize(value, min_val, max_val):
    if max_val <= min_val:
        return 0.0
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def _soft_score(face_detected, eye_openness, head_pose,
                typing_speed, mouse_activity, idle_time) -> float:
    """
    Compute a 0–100 engagement score using weighted soft scoring.
    Matches the logic in relabel_csv.py so rule-based and model labels
    are consistent.

    Camera failure handling:
      - face=0 BUT high activity → partial credit (10 pts)
        Could be camera failure, not genuine disengagement
      - face=0 AND low activity  → no visual credit
    No hard gates — idle_time is a penalty, not a binary switch.
    """
    score  = 0.0
    face   = int(face_detected)
    typing = float(typing_speed)
    mouse  = float(mouse_activity)
    idle   = float(idle_time)

    # ── Visual attention (max 75 pts) ──────────────────────────────
    if face == 1:
        score += 30.0
    elif typing > 120 or mouse > 80:
        # Camera failure case — partial credit for high activity
        score += 10.0

    eye = float(eye_openness)
    if eye > 0.025:
        score += 25.0
    elif eye > 0.02:
        score += 18.0
    elif eye > 0.015:
        score += 10.0

    head = float(head_pose)
    if head > 0.5:
        score += 20.0
    elif head > 0.25:
        score += 10.0

    # ── Interaction (max 25 pts) ───────────────────────────────────
    if typing > 200:
        score += 15.0
    elif typing > 120:
        score += 12.0
    elif typing > 50:
        score += 6.0

    if mouse > 150:
        score += 10.0
    elif mouse > 80:
        score += 7.0
    elif mouse > 30:
        score += 3.0

    # ── Idle penalty ──────────────────────────────────────────────
    if idle > 30:
        score -= 30.0
    elif idle > 15:
        score -= 15.0
    elif idle > 10:
        score -= 8.0

    return max(0.0, min(100.0, score))


def _label_from_soft_score(score: float, face_detected: int,
                           typing_speed: float, mouse_activity: float) -> str:
    """
    Assign label from soft score with camera failure override.

    Camera failure cap:
      face=0 + high activity → max Passive (can't confirm Active without face)
    Thresholds match relabel_csv.py.
    """
    if score >= 65:
        label = ACTIVE_LABEL
    elif score >= 38:
        label = PASSIVE_LABEL
    else:
        label = DISENGAGED_LABEL

    # Camera failure override — cap at Passive if no face but active
    if face_detected == 0 and (typing_speed > 120 or mouse_activity > 80):
        if label == ACTIVE_LABEL:
            label = PASSIVE_LABEL

    return label


def _confidence_from_score(score: float, label: str) -> float:
    """Estimate confidence based on how far score is from thresholds."""
    if label == ACTIVE_LABEL:
        # max confidence when score = 100, min at threshold 65
        return round(min(0.99, 0.70 + 0.29 * _normalize(score, 65, 100)), 4)
    if label == PASSIVE_LABEL:
        # centred around 51.5 (midpoint of 38–65)
        distance = 1.0 - abs(score - 51.5) / 27.0
        return round(max(0.50, min(0.85, 0.60 + 0.25 * distance)), 4)
    # Disengaged — more confident as score drops
    return round(min(0.99, 0.70 + 0.29 * _normalize(37 - score, 0, 37)), 4)


def calculate_engagement_score(cv: dict, hci: dict) -> dict:
    """
    Primary entry point called by api.py /submit-features.

    Strategy:
      1. Try XGBoost 3-class model (inference.py)
      2. If unavailable, fall back to soft-scoring rule-based system
         (same logic as relabel_csv.py for consistency)

    Returns:
        engagement_score : float  0–100
        label            : str    Active / Passive / Disengaged
        confidence       : float  0–1
        score_source     : str    "xgboost" | "rules"
    """
    face_detected  = int(float(cv.get("face_detected",  0)))
    eye_openness   = float(cv.get("eye_openness",        0.0))
    head_pose      = float(cv.get("head_pose",           0.0))
    typing_speed   = float(hci.get("typing_speed",       0.0))
    mouse_activity = float(hci.get("mouse_activity",     0.0))
    idle_time      = float(hci.get("idle_time",          0.0))

    # ── 1. Try XGBoost model ──────────────────────────────────────
    try:
        from .inference import predict_engagement
        result = predict_engagement(cv, hci)

        if result is not None:
            label = result["label"]

            # Camera failure cap — apply same override to XGBoost output
            if face_detected == 0 and (typing_speed > 120 or mouse_activity > 80):
                if label == ACTIVE_LABEL:
                    label = PASSIVE_LABEL

            return {
                "engagement_score": result["score"],
                "label":            label,
                "confidence":       result["confidence"],
                "score_source":     "xgboost",
            }
    except Exception:
        pass

    # ── 2. Rule-based soft-scoring fallback ───────────────────────
    score      = _soft_score(face_detected, eye_openness, head_pose,
                             typing_speed, mouse_activity, idle_time)
    label      = _label_from_soft_score(score, face_detected,
                                        typing_speed, mouse_activity)
    confidence = _confidence_from_score(score, label)

    return {
        "engagement_score": round(score, 2),
        "label":            label,
        "confidence":       confidence,
        "score_source":     "rules",
    }


# ── Backward compatibility ────────────────────────────────────────
# session_runner.py imports normalize — keep this alias so the
# server doesn't crash on import even though session_runner is
# never actually called in production (Railway uses CaptureEngine).
normalize = _normalize
