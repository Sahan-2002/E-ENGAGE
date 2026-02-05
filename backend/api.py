from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time
import random

# -----------------------------
# App Initialization
# -----------------------------
app = FastAPI(
    title="Student Engagement Detection API",
    description="Backend service for engagement prediction using CV, HCI, and ML",
    version="1.0"
)

# -----------------------------
# CORS Configuration
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Configuration
# -----------------------------
DEMO_MODE = True   # Switch OFF after IPD

# -----------------------------
# API Endpoints
# -----------------------------
@app.post("/predict-engagement")
def predict_engagement():
    """
    Returns student engagement prediction.
    In DEMO_MODE, values are simulated for UI stability.
    """

    if DEMO_MODE:
        score = round(random.uniform(45, 85), 2)
        label = "Engaged" if score >= 60 else "Disengaged"

        return {
            "status": "success",
            "mode": "demo",
            "timestamp": int(time.time()),
            "data": {
                "engagement_score": score,
                "label": label
            }
        }

    # (Real pipeline will go here after IPD)
