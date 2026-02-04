import csv
import os
import time
import random

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


def generate_engaged():
    return [
        time.time(),
        1,
        round(random.uniform(0.020, 0.030), 4),
        1,
        round(random.uniform(120, 350), 2),
        random.randint(50, 300),
        round(random.uniform(0.0, 1.5), 2),
        round(random.uniform(60, 85), 2),
        "Engaged"
    ]


def generate_disengaged():
    return [
        time.time(),
        random.choice([0, 1]),
        0.0,
        0,
        round(random.uniform(0, 80), 2),
        random.randint(0, 400),
        round(random.uniform(3, 20), 2),
        round(random.uniform(5, 50), 2),
        "Disengaged"
    ]


def simulate_dataset(engaged_count=30, disengaged_count=30):
    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)

    file_exists = os.path.isfile(DATASET_PATH)

    with open(DATASET_PATH, "a", newline="") as f:
        writer = csv.writer(f)

        if not file_exists:
            writer.writerow(HEADER)

        for _ in range(engaged_count):
            writer.writerow(generate_engaged())

        for _ in range(disengaged_count):
            writer.writerow(generate_disengaged())

    print(f"✅ Simulated {engaged_count} Engaged and {disengaged_count} Disengaged samples added.")


if __name__ == "__main__":
    simulate_dataset()
