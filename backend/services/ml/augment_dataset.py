"""
augment_dataset.py
Adds realistic Passive Engagement rows and edge cases to the 3-class CSV.

Run from project root:
    python backend/services/ml/augment_dataset.py

Input:  dataset/training/engagement_data_3class.csv
Output: dataset/training/engagement_data_3class.csv  (overwritten with more rows)
"""

import pandas as pd
import numpy as np
import os

INPUT_PATH  = "dataset/training/engagement_data_3class.csv"
OUTPUT_PATH = "dataset/training/engagement_data_3class.csv"

COLUMNS = [
    "timestamp", "face_detected", "eye_openness", "head_pose",
    "typing_speed", "mouse_activity", "idle_time",
    "engagement_score", "label"
]

rng = np.random.default_rng(seed=42)


def r(lo, hi, n=1, decimals=4):
    """Random floats between lo and hi."""
    vals = rng.uniform(lo, hi, n)
    return np.round(vals, decimals) if n > 1 else round(float(vals[0]), decimals)


def make_rows(n, face, eye_lo, eye_hi, head,
              typing_lo, typing_hi, mouse_lo, mouse_hi,
              idle_lo, idle_hi, label, base_score):
    rows = []
    ts   = 1770300000.0
    for i in range(n):
        eye    = r(eye_lo,    eye_hi)    if face == 1 else 0.0
        head_v = r(head,      min(head + 0.15, 1.0)) if face == 1 else 0.0
        typing = r(typing_lo, typing_hi, decimals=2)
        mouse  = r(mouse_lo,  mouse_hi,  decimals=2)
        idle   = r(idle_lo,   idle_hi,   decimals=2)
        score  = round(base_score + r(-5, 5), 2)
        rows.append([
            round(ts + i * 0.5, 4),
            face, eye, round(head_v, 4),
            typing, mouse, idle,
            score, label
        ])
    return rows


def main():
    print(f"Reading: {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH, names=COLUMNS)
    print(f"Original rows: {len(df)}")

    dist = df["label"].value_counts()
    print("\n── Original Distribution ──")
    for label, count in dist.items():
        print(f"  {label:<22}: {count:>4} ({count/len(df)*100:.1f}%)")

    new_rows = []

    # ══════════════════════════════════════════════════════════════
    # PASSIVE ENGAGEMENT — 220 rows
    # Student is watching/listening/reading — face visible,
    # low keyboard/mouse activity
    # ══════════════════════════════════════════════════════════════

    # 1. Pure listening — face visible, no keyboard, no mouse
    new_rows += make_rows(
        50, face=1,
        eye_lo=0.020, eye_hi=0.030, head=0.75,
        typing_lo=0, typing_hi=15,
        mouse_lo=0,  mouse_hi=10,
        idle_lo=3,   idle_hi=18,
        label="Passive Engagement", base_score=52
    )

    # 2. Reading slides — face visible, occasional mouse scroll
    new_rows += make_rows(
        50, face=1,
        eye_lo=0.018, eye_hi=0.028, head=0.70,
        typing_lo=0,  typing_hi=25,
        mouse_lo=10,  mouse_hi=60,
        idle_lo=2,    idle_hi=15,
        label="Passive Engagement", base_score=55
    )

    # 3. Watching video — face visible, zero interaction
    new_rows += make_rows(
        40, face=1,
        eye_lo=0.022, eye_hi=0.030, head=0.80,
        typing_lo=0,  typing_hi=8,
        mouse_lo=0,   mouse_hi=15,
        idle_lo=5,    idle_hi=20,
        label="Passive Engagement", base_score=53
    )

    # 4. Slow typing — thinking, face visible, low speed
    new_rows += make_rows(
        40, face=1,
        eye_lo=0.018, eye_hi=0.026, head=0.65,
        typing_lo=20, typing_hi=80,
        mouse_lo=5,   mouse_hi=40,
        idle_lo=3,    idle_hi=16,
        label="Passive Engagement", base_score=56
    )

    # 5. Taking notes on paper — face visible, no keyboard
    new_rows += make_rows(
        40, face=1,
        eye_lo=0.016, eye_hi=0.024, head=0.60,
        typing_lo=0,  typing_hi=10,
        mouse_lo=0,   mouse_hi=20,
        idle_lo=4,    idle_hi=18,
        label="Passive Engagement", base_score=50
    )

    # ══════════════════════════════════════════════════════════════
    # CAMERA FAILURE EDGE CASES — 100 rows
    # face=0 but high activity → Passive (benefit of the doubt)
    # ══════════════════════════════════════════════════════════════

    # 6. Camera off — typing fast (clearly working)
    new_rows += make_rows(
        40, face=0,
        eye_lo=0.0, eye_hi=0.0, head=0.0,
        typing_lo=130, typing_hi=350,
        mouse_lo=50,   mouse_hi=200,
        idle_lo=0,     idle_hi=4,
        label="Passive Engagement", base_score=50
    )

    # 7. Camera off — moderate typing
    new_rows += make_rows(
        30, face=0,
        eye_lo=0.0, eye_hi=0.0, head=0.0,
        typing_lo=80,  typing_hi=130,
        mouse_lo=80,   mouse_hi=200,
        idle_lo=0,     idle_hi=5,
        label="Passive Engagement", base_score=48
    )

    # 8. Camera off — mouse only (reading/scrolling)
    new_rows += make_rows(
        30, face=0,
        eye_lo=0.0, eye_hi=0.0, head=0.0,
        typing_lo=0,   typing_hi=20,
        mouse_lo=90,   mouse_hi=250,
        idle_lo=0,     idle_hi=6,
        label="Passive Engagement", base_score=46
    )

    # ══════════════════════════════════════════════════════════════
    # ACTIVE ENGAGEMENT EDGE CASES — 60 rows
    # Ensure model sees active cases with varying eye/head values
    # ══════════════════════════════════════════════════════════════

    # 9. Active — slightly lower eye openness (tired but working)
    new_rows += make_rows(
        30, face=1,
        eye_lo=0.016, eye_hi=0.022, head=0.70,
        typing_lo=150, typing_hi=380,
        mouse_lo=60,   mouse_hi=200,
        idle_lo=0,     idle_hi=3,
        label="Active Engagement", base_score=75
    )

    # 10. Active — high mouse, moderate typing
    new_rows += make_rows(
        30, face=1,
        eye_lo=0.020, eye_hi=0.030, head=0.75,
        typing_lo=60,  typing_hi=130,
        mouse_lo=90,   mouse_hi=300,
        idle_lo=0,     idle_hi=3,
        label="Active Engagement", base_score=72
    )

    # ══════════════════════════════════════════════════════════════
    # DISENGAGED EDGE CASES — 60 rows
    # ══════════════════════════════════════════════════════════════

    # 11. Face visible but completely idle (zoned out)
    new_rows += make_rows(
        30, face=1,
        eye_lo=0.010, eye_hi=0.018, head=0.30,
        typing_lo=0,  typing_hi=8,
        mouse_lo=0,   mouse_hi=10,
        idle_lo=25,   idle_hi=55,
        label="Disengaged", base_score=18
    )

    # 12. No face, no activity (genuinely away)
    new_rows += make_rows(
        30, face=0,
        eye_lo=0.0, eye_hi=0.0, head=0.0,
        typing_lo=0,  typing_hi=15,
        mouse_lo=0,   mouse_hi=15,
        idle_lo=20,   idle_hi=60,
        label="Disengaged", base_score=12
    )

    # ── Combine and shuffle ───────────────────────────────────────
    new_df  = pd.DataFrame(new_rows, columns=COLUMNS)
    full_df = pd.concat([df, new_df], ignore_index=True)
    full_df = full_df.sample(frac=1, random_state=42).reset_index(drop=True)

    # ── Final distribution ────────────────────────────────────────
    dist2 = full_df["label"].value_counts()
    print(f"\n── Distribution After Augmentation ──")
    for label, count in dist2.items():
        pct = count / len(full_df) * 100
        print(f"  {label:<22}: {count:>4} rows  ({pct:.1f}%)")

    min_pct = dist2.min() / len(full_df) * 100
    if min_pct < 20:
        print(f"\n⚠️  WARNING: Smallest class is {min_pct:.1f}% — still consider more data.")
    else:
        print(f"\n✅ Distribution looks balanced.")

    # ── Save ──────────────────────────────────────────────────────
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    full_df.to_csv(OUTPUT_PATH, index=False, header=False)
    print(f"\n✅ Saved {len(full_df)} rows to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
