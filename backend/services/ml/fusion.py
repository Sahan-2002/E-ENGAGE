def normalize(value, min_val, max_val):
    if max_val - min_val == 0:
        return 0
    return (value - min_val) / (max_val - min_val)


def calculate_engagement_score(cv, hci):
    # Normalize features (example ranges)
    eye = normalize(cv["eye_openness"], 0.0, 0.05)
    typing = normalize(hci["typing_speed"], 0, 200)
    mouse = normalize(hci["mouse_activity"], 0, 500)
    idle = 1 - normalize(hci["idle_time"], 0, 10)

    # Simple weighted fusion
    score = (
        0.3 * eye +
        0.3 * typing +
        0.2 * mouse +
        0.2 * idle
    )

    engagement_score = round(score * 100, 2)

    label = "Engaged" if engagement_score >= 60 else "Disengaged"

    return {
        "engagement_score": engagement_score,
        "label": label
    }


if __name__ == "__main__":
    cv_features = {
        "face_detected": 1,
        "eye_openness": 0.0318,
        "head_pose": 1
    }

    hci_features = {
        "typing_speed": 77.8,
        "mouse_activity": 451,
        "idle_time": 0.01
    }

    result = calculate_engagement_score(cv_features, hci_features)
    print(result)
