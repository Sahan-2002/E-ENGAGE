"""
session_runner.py v3
Fixes: duration tracking, score saving, proper state reset on new session.
"""

import time
import threading
import csv
import os
import uuid
from datetime import datetime

from services.cv.capture_manager import camera
from services.hci.track_input import track_input
from services.ml.fusion import calculate_engagement_score, normalize

import joblib
import numpy as np

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "models", "engagement_xgb.pkl")
HISTORY_CSV = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "dataset", "training", "session_history.csv"
)
HISTORY_HEADER = [
    "session_id", "user", "role", "date", "time",
    "duration_minutes", "total_cycles", "avg_score",
    "engaged_count", "disengaged_count", "label_summary"
]

CYCLE_DURATION = 20

try:
    ml_model = joblib.load(MODEL_PATH)
    print("✅ XGBoost model loaded")
except Exception as e:
    ml_model = None
    print(f"⚠️  Model not loaded: {e}")

# ── Global state ───────────────────────────────────────────────────────────
session_state = {
    "running":          False,
    "tracking_active":  False,
    "phase":            "idle",
    "current_cycle":    0,
    "secs_left":        0,
    "interval_minutes": 5,
    "samples":          [],
    "summary":          None,
    "user":             "unknown",
    "role":             "student",
    "session_id":       None,
    "error":            None,
    "progress_pct":     0,
    "start_time":       None,
}


def _run_single_cycle(cycle_num):
    """20-second window: CV + HCI run in parallel."""
    print(f"\n🔄 Cycle {cycle_num} — 20s window")

    cv_result  = {}
    hci_result = {}
    cv_done    = threading.Event()

    def capture_cv():
        result = camera.get_cv_features_averaged(num_frames=5, spread_seconds=10)
        cv_result.update(result)
        cv_done.set()

    def capture_hci():
        result = track_input(duration=CYCLE_DURATION)
        hci_result.update(result)

    cv_thread  = threading.Thread(target=capture_cv,  daemon=True)
    hci_thread = threading.Thread(target=capture_hci, daemon=True)
    cv_thread.start()
    hci_thread.start()

    # Countdown
    for s in range(CYCLE_DURATION, 0, -1):
        session_state["secs_left"] = s
        time.sleep(1)
        if not session_state["running"]:
            break

    cv_done.wait(timeout=5)
    hci_thread.join(timeout=5)

    cv  = cv_result  if cv_result  else {"face_detected": 0, "eye_openness": 0.0, "head_pose": 0.0}
    hci = hci_result if hci_result else {"typing_speed": 0,  "mouse_activity": 0,  "idle_time": float(CYCLE_DURATION)}

    # Fusion score
    fusion     = calculate_engagement_score(cv, hci)
    confidence = 0.75
    ml_label   = fusion["label"]

    if ml_model:
        try:
            arr = np.array([[
                cv["face_detected"],    cv["eye_openness"],
                cv.get("head_pose", 0), hci["typing_speed"],
                hci["mouse_activity"],  hci["idle_time"],
            ]])
            ml_int     = int(ml_model.predict(arr)[0])
            confidence = float(ml_model.predict_proba(arr)[0][ml_int])
            ml_label   = "Engaged" if ml_int == 1 else "Disengaged"
        except Exception as e:
            print(f"⚠️  ML error: {e}")

    features_display = {
        "eye_openness":   round(normalize(cv.get("eye_openness", 0),   0.0, 0.05), 2),
        "head_pose":      round(float(cv.get("head_pose", 0)),                      2),
        "typing_speed":   round(normalize(hci["typing_speed"],          0,   200),  2),
        "mouse_activity": round(normalize(hci["mouse_activity"],        0,   500),  2),
        "idle_time":      round(normalize(hci["idle_time"],             0,    20),  2),
    }

    sample = {
        "cycle":            cycle_num,
        "timestamp":        int(time.time()),
        "engagement_score": fusion["engagement_score"],
        "label":            ml_label,
        "confidence":       round(confidence, 2),
        "features":         features_display,
        "face_detected":    cv.get("face_detected", 0),
    }

    print(f"✅ Cycle {cycle_num}: {sample['engagement_score']}% — {ml_label}")
    return sample


def _wait_interval(interval_minutes):
    total = interval_minutes * 60
    session_state["phase"]     = "waiting"
    session_state["secs_left"] = total
    print(f"⏳ Waiting {interval_minutes} min...")

    for s in range(total, 0, -1):
        if not session_state["running"]:
            break
        session_state["secs_left"] = s
        time.sleep(1)

    session_state["secs_left"] = 0


def _build_summary(samples, user, role, session_id, start_time):
    if not samples:
        return None

    # Calculate ACTUAL elapsed duration
    elapsed_secs    = time.time() - start_time
    duration_minutes= round(elapsed_secs / 60, 1)

    scores           = [s["engagement_score"] for s in samples]
    avg_score        = round(sum(scores) / len(scores), 2)
    engaged_count    = sum(1 for s in samples if s["label"] == "Engaged")
    disengaged_count = len(samples) - engaged_count
    best  = max(samples, key=lambda x: x["engagement_score"])
    worst = min(samples, key=lambda x: x["engagement_score"])
    overall = ("Highly Engaged"     if avg_score >= 70 else
               "Moderately Engaged" if avg_score >= 50 else "Disengaged")

    return {
        "session_id":        session_id,
        "user":              user,
        "role":              role,
        "date":              datetime.now().strftime("%Y-%m-%d"),
        "time":              datetime.now().strftime("%H:%M"),
        "duration_minutes":  duration_minutes,
        "total_cycles":      len(samples),
        "avg_score":         avg_score,
        "engaged_count":     engaged_count,
        "disengaged_count":  disengaged_count,
        "overall_label":     overall,
        "best_cycle":        best["cycle"],
        "best_score":        best["engagement_score"],
        "worst_cycle":       worst["cycle"],
        "worst_score":       worst["engagement_score"],
        "chart_data":        [{"cycle": s["cycle"], "score": s["engagement_score"]} for s in samples],
    }


def _save_to_history(summary):
    os.makedirs(os.path.dirname(HISTORY_CSV), exist_ok=True)
    exists = os.path.isfile(HISTORY_CSV)
    with open(HISTORY_CSV, "a", newline="") as f:
        w = csv.writer(f)
        if not exists:
            w.writerow(HISTORY_HEADER)
        w.writerow([
            summary["session_id"],
            summary["user"],
            summary["role"],
            summary["date"],
            summary["time"],
            summary["duration_minutes"],   # ← actual elapsed time
            summary["total_cycles"],
            summary["avg_score"],
            summary["engaged_count"],
            summary["disengaged_count"],
            summary["overall_label"],
        ])
    print(f"💾 Saved: {summary['session_id']} | "
          f"score={summary['avg_score']}% | "
          f"duration={summary['duration_minutes']}min")


def reset_session_state():
    """Called by /start-session to fully clear previous session."""
    session_state.update({
        "running":          False,
        "tracking_active":  False,
        "phase":            "idle",
        "current_cycle":    0,
        "secs_left":        0,
        "samples":          [],
        "summary":          None,   # ← clears old summary so dashboard resets
        "error":            None,
        "progress_pct":     0,
        "start_time":       None,
    })


def run_session(user="unknown", role="student", interval_minutes=5):
    """
    Infinite loop: track 20s → wait N min → track 20s → ...
    Stops when running=False (via /stop-session).
    """
    session_id = str(uuid.uuid4())[:8].upper()
    start_time = time.time()

    session_state.update({
        "running":          True,
        "tracking_active":  False,
        "phase":            "tracking",
        "current_cycle":    0,
        "secs_left":        CYCLE_DURATION,
        "interval_minutes": interval_minutes,
        "samples":          [],
        "summary":          None,
        "user":             user,
        "role":             role,
        "session_id":       session_id,
        "error":            None,
        "progress_pct":     0,
        "start_time":       start_time,
    })

    if not camera.start():
        session_state["error"]   = "Camera could not be opened"
        session_state["running"] = False
        return

    cycle = 0
    try:
        while session_state["running"]:
            # ── Track ──────────────────────────────────────────────────
            cycle += 1
            session_state["current_cycle"]   = cycle
            session_state["phase"]           = "tracking"
            session_state["tracking_active"] = True

            sample = _run_single_cycle(cycle)
            session_state["samples"].append(sample)
            session_state["tracking_active"] = False
            session_state["progress_pct"]    = cycle

            if not session_state["running"]:
                break

            # ── Wait ───────────────────────────────────────────────────
            _wait_interval(interval_minutes)

    except Exception as e:
        session_state["error"] = str(e)
        print(f"❌ Error: {e}")

    finally:
        camera.stop()
        session_state.update({
            "running":         False,
            "tracking_active": False,
            "phase":           "idle",
            "secs_left":       0,
        })

        summary = _build_summary(
            session_state["samples"], user, role, session_id, start_time
        )
        session_state["summary"] = summary

        if summary:
            _save_to_history(summary)
            print(f"\n🏁 Session {session_id} complete — "
                  f"{cycle} cycles | avg={summary['avg_score']}%")
        else:
            print(f"\n🏁 Session {session_id} ended with no data")
