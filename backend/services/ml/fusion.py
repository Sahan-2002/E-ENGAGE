from ..hci.features import get_hci_features
from ..cv.extract_features import get_cv_features


def normalize(value, min_val, max_val):
    if max_val - min_val == 0:
        return 0
    return max(0, min(1, (value - min_val) / (max_val - min_val)))


def calculate_engagement_score(cv, hci):
    eye = normalize(cv["eye_openness"], 0.0, 0.05)
    typing = normalize(hci["typing_speed"], 0, 200)
    mouse = normalize(hci["mouse_activity"], 0, 500)
    idle = 1 - normalize(hci["idle_time"], 0, 10)

    score = (
        0.3 * eye +
        0.3 * typing +
        0.2 * mouse +
        0.2 * idle
    )

    engagement_score = round(max(score * 100, 5), 2)
    label = "Engaged" if engagement_score >= 60 else "Disengaged"

    return {
        "engagement_score": engagement_score,
        "label": label
    }


# Optional standalone test
if __name__ == "__main__":
    sample_cv = {"face_detected": 1, "eye_openness": 0.03, "head_pose": 1}
    sample_hci = {"typing_speed": 50, "mouse_activity": 100, "idle_time": 0.5}
    print(calculate_engagement_score(sample_cv, sample_hci))
