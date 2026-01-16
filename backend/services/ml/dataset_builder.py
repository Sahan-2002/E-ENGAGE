import csv
import os
from fusion import calculate_engagement_score

DATASET_PATH = "dataset/training/engagement_data.csv"

HEADER = [
    "face_detected",
    "eye_openness",
    "head_pose",
    "typing_speed",
    "mouse_activity",
    "idle_time",
    "engagement_score",
    "label"
]

def save_record(cv, hci):
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)

    result = calculate_engagement_score(cv, hci)

    row = [
        cv["face_detected"],
        cv["eye_openness"],
        cv["head_pose"],
        hci["typing_speed"],
        hci["mouse_activity"],
        hci["idle_time"],
        result["engagement_score"],
        result["label"]
    ]

    file_exists = os.path.isfile(DATASET_PATH)

    with open(DATASET_PATH, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(HEADER)
        writer.writerow(row)

    print("Record saved:", row)


if __name__ == "__main__":
    # SAMPLE DATA (replace with live values later)
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

    save_record(cv_features, hci_features)
