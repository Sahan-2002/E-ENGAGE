import os
import csv
from extract_features import extract_facial_features

DATASET_DIR = "dataset/face_expression/archive (1)/Faces/Faces"
OUTPUT_CSV = "dataset/training/cv_features.csv"

HEADER = [
    "image_path",
    "face_detected",
    "eye_openness",
    "head_pose"
]

def batch_extract():
    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADER)

        for img_name in os.listdir(DATASET_DIR):
            if not img_name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

    img_path = os.path.join(DATASET_DIR, img_name)

    try:
        features = extract_facial_features(img_path)

        writer.writerow([
            img_path,
            features["face_detected"],
            features["eye_openness"],
            features["head_pose"]
        ])

    except Exception as e:
        print(f"Skipped {img_path}: {e}")


    print("✅ Batch feature extraction completed.")


if __name__ == "__main__":
    batch_extract()
