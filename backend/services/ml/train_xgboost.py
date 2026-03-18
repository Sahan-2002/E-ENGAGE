"""
train_xgboost.py  — 3-class engagement model
Run from project root:
    python backend/services/ml/train_xgboost.py

Input:  dataset/training/engagement_data_3class.csv
Output: backend/services/ml/models/engagement_xgb.pkl
"""

import os
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib

# ── Paths ──────────────────────────────────────────────────────────
DATASET_PATH = "dataset/training/engagement_data_3class.csv"
MODEL_PATH   = "backend/services/ml/models/engagement_xgb.pkl"

COLUMNS = [
    "timestamp", "face_detected", "eye_openness", "head_pose",
    "typing_speed", "mouse_activity", "idle_time",
    "engagement_score", "label"
]

FEATURES = [
    "face_detected", "eye_openness", "head_pose",
    "typing_speed", "mouse_activity", "idle_time"
]

# ── Label map (must match inference.py) ───────────────────────────
LABEL_MAP = {
    "Active Engagement":  0,
    "Passive Engagement": 1,
    "Disengaged":         2,
}
LABEL_NAMES = ["Active Engagement", "Passive Engagement", "Disengaged"]


def main():
    # ── Load data ─────────────────────────────────────────────────
    print(f"Loading: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH, names=COLUMNS)
    df = df.dropna()
    print(f"Total rows: {len(df)}")

    # ── Distribution check ────────────────────────────────────────
    dist = df["label"].value_counts()
    print("\n── Label Distribution ──")
    for label, count in dist.items():
        print(f"  {label:<22}: {count:>4} ({count/len(df)*100:.1f}%)")

    # ── Features & labels ─────────────────────────────────────────
    X = df[FEATURES].astype(float)
    y = df["label"].map(LABEL_MAP)

    if y.isnull().any():
        unknown = df["label"][y.isnull()].unique()
        print(f"\n⚠️  Unknown labels found and dropped: {unknown}")
        mask = y.notnull()
        X, y = X[mask], y[mask]

    y = y.astype(int)

    # ── Train / test split ────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nTrain: {len(X_train)} rows | Test: {len(X_test)} rows")

    # ── Model ─────────────────────────────────────────────────────
    model = xgb.XGBClassifier(
        n_estimators      = 200,
        max_depth         = 5,
        learning_rate     = 0.1,
        subsample         = 0.8,
        colsample_bytree  = 0.8,
        objective         = "multi:softprob",
        num_class         = 3,
        eval_metric       = "mlogloss",
        random_state      = 42,
        )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # ── Evaluation ────────────────────────────────────────────────
    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)

    print(f"\n── Results ──────────────────────────────")
    print(f"  Accuracy: {acc * 100:.2f}%")
    print(f"\nConfusion Matrix (rows=actual, cols=predicted):")
    print(f"  Labels: {LABEL_NAMES}")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=LABEL_NAMES))

    # ── Feature importance ────────────────────────────────────────
    print("── Feature Importance ───────────────────")
    for feat, imp in sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    ):
        bar = "█" * int(imp * 40)
        print(f"  {feat:<18} {bar} {imp:.4f}")

    # ── Save ──────────────────────────────────────────────────────
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"\n✅ Model saved to: {MODEL_PATH}")
    print(f"   Classes: {LABEL_NAMES}")
    print(f"   Label map: {LABEL_MAP}")


if __name__ == "__main__":
    main()
