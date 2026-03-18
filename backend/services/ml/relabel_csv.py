"""
relabel_csv.py
Run once locally to convert 2-class CSV → 3-class CSV using soft scoring.

Usage:
    python relabel_csv.py

Input:  dataset/training/engagement_data.csv
Output: dataset/training/engagement_data_3class.csv
"""

import pandas as pd
import os

INPUT_PATH  = "dataset/training/engagement_data.csv"
OUTPUT_PATH = "dataset/training/engagement_data_3class.csv"

COLUMNS = [
    "timestamp", "face_detected", "eye_openness", "head_pose",
    "typing_speed", "mouse_activity", "idle_time",
    "engagement_score", "label"
]


def soft_score(row):
    """
    Compute a 0–100 engagement score using weighted soft scoring.
    No hard boolean gates — each feature contributes independently.

    Camera failure handling:
      - face=0 BUT high activity → partial credit (10 pts)
        Could be camera failure, not disengagement
      - face=0 AND low activity  → no visual credit (genuine disengagement)
    """
    score   = 0
    face    = int(row["face_detected"])
    typing  = float(row["typing_speed"])
    mouse   = float(row["mouse_activity"])
    idle    = float(row["idle_time"])

    # ── Visual attention (max 75 points) ──────────────────────────
    if face == 1:
        score += 30
    elif typing > 120 or mouse > 80:
        # Camera failure case — give partial credit for activity
        score += 10

    eye = float(row["eye_openness"])
    if eye > 0.025:
        score += 25
    elif eye > 0.02:
        score += 18
    elif eye > 0.015:
        score += 10

    head = float(row["head_pose"])
    if head > 0.5:
        score += 20
    elif head > 0.25:
        score += 10

    # ── Interaction (max 25 points) ───────────────────────────────
    if typing > 200:
        score += 15
    elif typing > 120:
        score += 12
    elif typing > 50:
        score += 6

    if mouse > 150:
        score += 10
    elif mouse > 80:
        score += 7
    elif mouse > 30:
        score += 3

    # ── Idle penalty ──────────────────────────────────────────────
    if idle > 30:
        score -= 30
    elif idle > 15:
        score -= 15
    elif idle > 10:
        score -= 8

    return max(0, min(100, score))


def assign_label(score, face, typing, mouse):
    """
    Assign 3-class label from soft score.

    Camera failure override:
      If face=0 but activity is high, cap at Passive — we can't
      confirm Active without face, but we don't penalize either.
    """
    if score >= 65:
        label = "Active Engagement"
    elif score >= 38:
        label = "Passive Engagement"
    else:
        label = "Disengaged"

    # Camera failure cap: no face + high activity → max Passive
    if face == 0 and (typing > 120 or mouse > 80):
        if label == "Active Engagement":
            label = "Passive Engagement"

    return label


def main():
    print(f"Reading: {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH, names=COLUMNS)
    df = df.dropna()
    print(f"Total rows: {len(df)}")

    # Compute soft score and new label
    df["soft_score"] = df.apply(soft_score, axis=1)
    df["label"]      = df.apply(
        lambda r: assign_label(
            r["soft_score"],
            int(r["face_detected"]),
            float(r["typing_speed"]),
            float(r["mouse_activity"]),
        ), axis=1
    )

    # Drop soft_score column (not needed in final CSV)
    df = df.drop(columns=["soft_score"])

    # ── Print distribution ────────────────────────────────────────
    dist = df["label"].value_counts()
    print("\n── Label Distribution After Relabeling ──")
    for label, count in dist.items():
        pct = count / len(df) * 100
        print(f"  {label:<22}: {count:>4} rows  ({pct:.1f}%)")

    # ── Balance check ─────────────────────────────────────────────
    min_pct = dist.min() / len(df) * 100
    if min_pct < 15:
        print(f"\n⚠️  WARNING: Smallest class is only {min_pct:.1f}% — consider adding more data.")
    else:
        print(f"\n✅ Distribution looks balanced.")

    # ── Save ──────────────────────────────────────────────────────
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False, header=False)
    print(f"\n✅ Saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
