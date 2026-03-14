from ..hci.features import get_hci_features
from ..cv.extract_features import get_cv_features


# backend/services/ml/fusion.py

ACTIVE_LABEL    = "Active Engagement"
PASSIVE_LABEL   = "Passive Engagement"
DISENGAGED_LABEL = "Disengaged"

# ── Thresholds ─────────────────────────────────────────────────────
# Lowered interaction thresholds: online students type/click much less
# than in-person students. Even occasional scrolling or reactions count.
TYPING_SPEED_THRESHOLD   = 30    # was 120 — catches any real keyboard use
MOUSE_ACTIVITY_THRESHOLD = 8     # was 15  — catches scrolling, reactions

# Visual attention threshold — unchanged, derived from dataset analysis
EYE_OPENNESS_THRESHOLD   = 0.015

# Idle time only used to confirm disengagement, NOT to gate passive.
# 40s is clearly checked-out; 15s was far too aggressive for lecture watching.
IDLE_TIME_DISENGAGED     = 40    # was 15


def normalize(value, min_val, max_val):
    if max_val - min_val == 0:
        return 0
    return max(0, min(1, (value - min_val) / (max_val - min_val)))


def calculate_engagement_score(cv, hci):
    face_detected  = int(cv.get("face_detected", 0))
    eye_openness   = float(cv.get("eye_openness", 0.0))
    head_pose      = int(cv.get("head_pose", 0))
    typing_speed   = float(hci.get("typing_speed", 0))
    mouse_activity = float(hci.get("mouse_activity", 0))
    idle_time      = float(hci.get("idle_time", 0))

    # ── Classification logic ───────────────────────────────────────
    # Step 1: No face → always disengaged
    if face_detected == 0:
        label = DISENGAGED_LABEL

    # Step 2: Any real interaction → actively engaged
    elif typing_speed > TYPING_SPEED_THRESHOLD or mouse_activity > MOUSE_ACTIVITY_THRESHOLD:
        label = ACTIVE_LABEL

    # Step 3: Face present, eyes open, head facing screen → passively engaged
    # NOTE: idle_time intentionally removed from this condition.
    # A student watching a lecture WILL have high idle time — that is normal
    # and must not be penalised here. Face + eyes + head pose is sufficient
    # evidence of attention.
    elif eye_openness > EYE_OPENNESS_THRESHOLD and head_pose == 1:
        label = PASSIVE_LABEL

    # Step 4: Face present but eyes closed / head turned / very long idle
    else:
        label = DISENGAGED_LABEL

    # ── Score calculation ──────────────────────────────────────────
    visual_attention = (
        0.45 * normalize(eye_openness, EYE_OPENNESS_THRESHOLD, 0.05)
        + 0.35 * normalize(head_pose, 0, 1)
        + 0.20 * face_detected
    )
    interaction_level = (
        0.60 * normalize(typing_speed, 0, 200)
        + 0.40 * normalize(mouse_activity, 0, 60)
    )
    # idle_readiness uses the new 40s disengaged threshold as ceiling
    idle_readiness = 1 - normalize(idle_time, 0, IDLE_TIME_DISENGAGED)

    if label == ACTIVE_LABEL:
        score      = 0.55 + 0.30 * interaction_level + 0.15 * visual_attention
        confidence = 0.75 + 0.20 * max(interaction_level, visual_attention)

    elif label == PASSIVE_LABEL:
        # Passive score driven primarily by visual attention.
        # idle_readiness is still used here as a soft boost/penalty
        # (e.g. student who has been idle for 35s gets a lower passive score
        # than one idle for 5s), but it no longer gates the label itself.
        score      = 0.45 + 0.40 * visual_attention + 0.15 * idle_readiness
        confidence = 0.70 + 0.20 * min(1, (visual_attention + idle_readiness) / 2)

    else:  # DISENGAGED
        disengaged_signal = (
            0.45 * (1 - min(face_detected, 1))
            + 0.25 * (1 - normalize(eye_openness, EYE_OPENNESS_THRESHOLD, 0.05))
            + 0.20 * (1 - normalize(head_pose, 0, 1))
            + 0.10 * normalize(idle_time, IDLE_TIME_DISENGAGED, 120)
        )
        score      = max(0.05, 0.35 * (1 - disengaged_signal))
        confidence = 0.72 + 0.20 * disengaged_signal

    engagement_score = round(max(5, min(score * 100, 100)), 2)
    confidence       = round(max(0.5, min(confidence, 0.99)), 2)

    return {
        "engagement_score": engagement_score,
        "label":            label,
        "confidence":       confidence,
    }
