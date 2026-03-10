"""
backend/api.py v3
Fixes: /start-session now calls reset_session_state() to clear old summary.
"""

import sys, os
sys.path.append(os.path.dirname(__file__))

import threading, csv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.ml.session_runner import (
    run_session, session_state, reset_session_state, HISTORY_CSV, HISTORY_HEADER
)

app = FastAPI(title="E-ENGAGE API", version="3.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS = {
    "teacher@eengage.com": {"password": "password123", "name": "Dr. Smith",    "role": "teacher"},
    "student@eengage.com": {"password": "student123",  "name": "Alex Johnson", "role": "student"},
    "student2@eengage.com":{"password": "student123",  "name": "Sara Lee",     "role": "student"},
}

class LoginRequest(BaseModel):
    email: str
    password: str

class StartSessionRequest(BaseModel):
    user:             str
    role:             str
    interval_minutes: int = 5

@app.post("/login")
def login(req: LoginRequest):
    user = USERS.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "status": "success",
        "token":  f"mock-jwt-{req.email}",
        "user":   {"email": req.email, "name": user["name"], "role": user["role"]},
    }

@app.post("/start-session")
def start_session(req: StartSessionRequest):
    if session_state["running"]:
        raise HTTPException(status_code=409, detail="A session is already running")

    # ← KEY FIX: clear previous summary before starting new session
    reset_session_state()

    thread = threading.Thread(
        target=run_session,
        args=(req.user, req.role, req.interval_minutes),
        daemon=True,
    )
    thread.start()

    return {
        "status":           "started",
        "user":             req.user,
        "interval_minutes": req.interval_minutes,
        "cycle_duration":   20,
    }

@app.post("/stop-session")
def stop_session():
    if not session_state["running"]:
        return {"status": "not_running"}
    session_state["running"] = False
    return {"status": "stopping"}

@app.get("/session-status")
def get_session_status():
    s = session_state
    return {
        "running":          s["running"],
        "phase":            s["phase"],
        "tracking_active":  s["tracking_active"],
        "current_cycle":    s["current_cycle"],
        "secs_left":        s["secs_left"],
        "interval_minutes": s["interval_minutes"],
        "progress_pct":     s["progress_pct"],
        "latest_sample":    s["samples"][-1] if s["samples"] else None,
        "all_samples":      s["samples"],
        "summary":          s["summary"],
        "session_id":       s["session_id"],
        "user":             s["user"],
        "role":             s["role"],
        "error":            s["error"],
    }

@app.get("/session-history")
def get_session_history(user: str = None, role: str = None):
    if not os.path.isfile(HISTORY_CSV):
        return {"sessions": []}
    sessions = []
    with open(HISTORY_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if role == "student" and user and row.get("user") != user:
                continue
            sessions.append(row)
    sessions.reverse()
    return {"sessions": sessions}

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.1"}
