import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib
import os

# Load dataset
DATASET_PATH = "dataset/training/engagement_data.csv"

COLUMNS = [
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

df = pd.read_csv(DATASET_PATH, names=COLUMNS)
df = df.dropna()



# Feature selection
FEATURES = [
    "face_detected",
    "eye_openness",
    "head_pose",
    "typing_speed",
    "mouse_activity",
    "idle_time"
]

X = df[FEATURES]

# Convert labels to numeric
y = df["label"].map({
    "Engaged": 1,
    "Disengaged": 0
})

# Train / Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# XGBoost model
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42
)

# Train model
model.fit(X_train, y_train)


# Evaluation
y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
cm = confusion_matrix(y_test, y_pred)

print("\n XGBoost Training Complete")
print(f"Accuracy: {accuracy * 100:.2f}%")
print("\nConfusion Matrix:")
print(cm)
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["Disengaged", "Engaged"]))

# -------------------------------
# Save model
# -------------------------------
os.makedirs("backend/services/ml/models", exist_ok=True)
joblib.dump(model, "backend/services/ml/models/engagement_xgb.pkl")

print("\n Model saved to backend/services/ml/models/engagement_xgb.pkl")
