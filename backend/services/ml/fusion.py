from ..hci.features import get_hci_features
from ..cv.extract_features import get_cv_features

# backend/services/ml/fusion.py  v3
# When XGBoost model is available:
#   - Score comes from XGBoost P(Engaged) × 100
#   - Label is derived from that score (score >= 70 → Active, >= 50 → Passive, else Disengaged)
# When model is unavailable:
#   - Full rule-based fallback for both score and label

ACTIVE_LABEL     = "Active Engagement"
PASSIVE_LABEL    = "Passive Engagement"
DISENGAGED_LABEL = "Disengaged"

# ── Thresholds ─────────────────────────────────────────────────────
TYPING_SPEED_THRESHOLD   = 30
MOUSE_ACTIVITY_THRESHOLD = 8
EYE_OPENNESS_THRESHOLD   = 0.015
IDLE_TIME_DISENGAGED     = 40

# Score thresholds for label derivation from XGBoost score
SCORE_ACTIVE   = 70   # score >= 70  → Active Engagement
SCORE_PASSIVE  = 50   # score >= 50  → Passive Engagement
                      # score <  50  → Disengaged


def normalize(value, min_val, max_val):
    if max_val - min_val == 0:
        return 0
    return max(0, min(1, (value - min_val) / (max_val - min_val)))


def _label_from_score(score):
    """Derive 3-state label directly from engagement score."""
    if score >= SCORE_ACTIVE:
        return ACTIVE_LABEL
    if score >= SCORE_PASSIVE:
        return PASSIVE_LABEL
    return DISENGAGED_LABEL


def _rule_based_label(face_detected, eye_openness, head_pose,
                      typing_speed, mouse_activity):
    """Fallback 3-state label — used only when XGBoost is unavailable."""
    if face_detected == 0:
        return DISENGAGED_LABEL
    if typing_speed > TYPING_SPEED_THRESHOLD or mouse_activity > MOUSE_ACTIVITY_THRESHOLD:
        return ACTIVE_LABEL
    if eye_openness > EYE_OPENNESS_THRESHOLD and head_pose == 1:
        return PASSIVE_LABEL
    return DISENGAGED_LABEL


def _rule_based_score(label, face_detected, eye_openness, head_pose,
                      typing_speed, mouse_activity, idle_time):
    """Fallback score + confidence — used only when XGBoost is unavailable."""
    visual_attention = (
        0.45 * normalize(eye_openness, EYE_OPENNESS_THRESHOLD, 0.05)
        + 0.35 * normalize(head_pose, 0, 1)
        + 0.20 * face_detected
    )
    interaction_level = (
        0.60 * normalize(typing_speed, 0, 200)
        + 0.40 * normalize(mouse_activity, 0, 60)
    )
    idle_readiness = 1 - normalize(idle_time, 0, IDLE_TIME_DISENGAGED)

    if label == ACTIVE_LABEL:
        score      = 0.55 + 0.30 * interaction_level + 0.15 * visual_attention
        confidence = 0.75 + 0.20 * max(interaction_level, visual_attention)
    elif label == PASSIVE_LABEL:
        score      = 0.45 + 0.40 * visual_attention + 0.15 * idle_readiness
        confidence = 0.70 + 0.20 * min(1, (visual_attention + idle_readiness) / 2)
    else:
        disengaged_signal = (
            0.45 * (1 - min(face_detected, 1))
            + 0.25 * (1 - normalize(eye_openness, EYE_OPENNESS_THRESHOLD, 0.05))
            + 0.20 * (1 - normalize(head_pose, 0, 1))
            + 0.10 * normalize(idle_time, IDLE_TIME_DISENGAGED, 120)
        )
        score      = max(0.05, 0.35 * (1 - disengaged_signal))
        confidence = 0.72 + 0.20 * disengaged_signal

    return round(max(5, min(score * 100, 100)), 2), round(max(0.5, min(confidence, 0.99)), 2)


def calculate_engagement_score(cv, hci):
    """
    Hybrid inference:

    XGBoost available:
      - score  = XGBoost P(Engaged) × 100
      - label  = derived from score (>= 70 Active, >= 50 Passive, else Disengaged)
      - confidence = rule-based (proxy)

    XGBoost unavailable:
      - score, label, confidence = full rule-based
    """
    face_detected  = int(cv.get("face_detected",  0))
    eye_openness   = float(cv.get("eye_openness", 0.0))
    head_pose      = int(cv.get("head_pose",      0))
    typing_speed   = float(hci.get("typing_speed",   0))
    mouse_activity = float(hci.get("mouse_activity", 0))
    idle_time      = float(hci.get("idle_time",      0))

    # ── Try XGBoost score ──────────────────────────────────────────
    xgb_score = None
    try:
        from .inference import predict_engagement_score
        xgb_score = predict_engagement_score(cv, hci)
    except ImportError:
        pass

    if xgb_score is not None:
        # Score AND label both come from XGBoost output
        label = _label_from_score(xgb_score)

        # Confidence: reuse rule-based proxy
        _, confidence = _rule_based_score(
            label, face_detected, eye_openness, head_pose,
            typing_speed, mouse_activity, idle_time
        )
        return {
            "engagement_score": xgb_score,
            "label":            label,
            "confidence":       confidence,
            "score_source":     "xgboost",
        }

    # ── Full rule-based fallback ───────────────────────────────────
    label = _rule_based_label(
        face_detected, eye_openness, head_pose, typing_speed, mouse_activity
    )
    score, confidence = _rule_based_score(
        label, face_detected, eye_openness, head_pose,
        typing_speed, mouse_activity, idle_time
    )
    return {
        "engagement_score": score,
        "label":            label,
        "confidence":       confidence,
        "score_source":     "rules",
    }
