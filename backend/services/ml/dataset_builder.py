import csv
import os
import time
from .fusion import run_fusion
from ..cv.extract_features import get_cv_features
from ..hci.features import get_hci_features

DATASET_PATH = "dataset/training/engagement_data.csv"

HEADER = [
    "timestamp",
    "face_detected",
    "eye_openness",
    "head_pose",
    "typing_speed",
    "mouse_activity",
    "idle_time",
    "engagement_score",
    "label"
]


def save_record():
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)

    cv = get_cv_features()
    hci = get_hci_features()
    result = run_fusion()

    row = [
        time.time(),
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
    save_record()
