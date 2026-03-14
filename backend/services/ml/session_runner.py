"""
session_runner.py
Runs the monitoring loop and builds per-session summaries.
"""

import csv
import os
import threading
import time
import uuid
from datetime import datetime

from services.cv.capture_manager import camera
from services.hci.track_input import track_input
from services.ml.fusion import (
    ACTIVE_LABEL,
    DISENGAGED_LABEL,
    PASSIVE_LABEL,
    calculate_engagement_score,
    normalize,
)

HISTORY_CSV = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "dataset", "training", "session_history.csv"
)
HISTORY_HEADER = [
    "session_id",
    "user",
    "role",
    "date",
    "time",
    "duration_minutes",
    "total_cycles",
    "avg_score",
    "active_count",
    "passive_count",
    "disengaged_count",
    "label_summary",
]

CYCLE_DURATION = 20

session_state = {
    "running": False,
    "tracking_active": False,
    "phase": "idle",
    "current_cycle": 0,
    "secs_left": 0,
    "interval_minutes": 5,
    "samples": [],
    "summary": None,
    "user": "unknown",
    "role": "student",
    "session_id": None,
    "error": None,
    "progress_pct": 0,
    "start_time": None,
}


def _run_single_cycle(cycle_num):
    """Run CV and HCI capture in parallel for one 20-second cycle."""
    print(f"\nCycle {cycle_num}: tracking for {CYCLE_DURATION}s")

    cv_result = {}
    hci_result = {}
    cv_done = threading.Event()

    def capture_cv():
        result = camera.get_cv_features_averaged(num_frames=5, spread_seconds=10)
        cv_result.update(result)
        cv_done.set()

    def capture_hci():
        result = track_input(duration=CYCLE_DURATION)
        hci_result.update(result)

    cv_thread = threading.Thread(target=capture_cv, daemon=True)
    hci_thread = threading.Thread(target=capture_hci, daemon=True)
    cv_thread.start()
    hci_thread.start()

    for s in range(CYCLE_DURATION, 0, -1):
        session_state["secs_left"] = s
        time.sleep(1)
        if not session_state["running"]:
            break

    cv_done.wait(timeout=5)
    hci_thread.join(timeout=5)

    cv = cv_result if cv_result else {"face_detected": 0, "eye_openness": 0.0, "head_pose": 0}
    hci = hci_result if hci_result else {
        "typing_speed": 0,
        "mouse_activity": 0,
        "idle_time": float(CYCLE_DURATION),
    }

    fusion = calculate_engagement_score(cv, hci)

    features_display = {
        "eye_openness": round(normalize(cv.get("eye_openness", 0), 0.0, 0.05), 2),
        "head_pose": round(float(cv.get("head_pose", 0)), 2),
        "typing_speed": round(normalize(hci["typing_speed"], 0, 200), 2),
        "mouse_activity": round(normalize(hci["mouse_activity"], 0, 60), 2),
        "idle_time": round(normalize(hci["idle_time"], 0, 20), 2),
    }

    sample = {
        "cycle": cycle_num,
        "timestamp": int(time.time()),
        "engagement_score": fusion["engagement_score"],
        "label": fusion["label"],
        "confidence": fusion["confidence"],
        "features": features_display,
        "face_detected": cv.get("face_detected", 0),
    }

    print(f"Cycle {cycle_num} result: {sample['engagement_score']}% | {sample['label']}")
    return sample


def _wait_interval(interval_minutes):
    total = interval_minutes * 60
    session_state["phase"] = "waiting"
    session_state["secs_left"] = total
    print(f"Waiting {interval_minutes} minute(s)")

    for s in range(total, 0, -1):
        if not session_state["running"]:
            break
        session_state["secs_left"] = s
        time.sleep(1)

    session_state["secs_left"] = 0


def _build_summary(samples, user, role, session_id, start_time):
    if not samples:
        return None

    elapsed_secs = time.time() - start_time
    duration_minutes = round(elapsed_secs / 60, 1)

    scores = [s["engagement_score"] for s in samples]
    avg_score = round(sum(scores) / len(scores), 2)
    active_count = sum(1 for s in samples if s["label"] == ACTIVE_LABEL)
    passive_count = sum(1 for s in samples if s["label"] == PASSIVE_LABEL)
    disengaged_count = sum(1 for s in samples if s["label"] == DISENGAGED_LABEL)
    best = max(samples, key=lambda x: x["engagement_score"])
    worst = min(samples, key=lambda x: x["engagement_score"])

    if active_count >= max(passive_count, disengaged_count):
        overall = "Highly Engaged"
    elif active_count + passive_count > disengaged_count:
        overall = "Moderately Engaged"
    else:
        overall = DISENGAGED_LABEL

    return {
        "session_id": session_id,
        "user": user,
        "role": role,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M"),
        "duration_minutes": duration_minutes,
        "total_cycles": len(samples),
        "avg_score": avg_score,
        "active_count": active_count,
        "passive_count": passive_count,
        "disengaged_count": disengaged_count,
        "overall_label": overall,
        "best_cycle": best["cycle"],
        "best_score": best["engagement_score"],
        "worst_cycle": worst["cycle"],
        "worst_score": worst["engagement_score"],
        "chart_data": [{"cycle": s["cycle"], "score": s["engagement_score"]} for s in samples],
    }


def _save_to_history(summary):
    os.makedirs(os.path.dirname(HISTORY_CSV), exist_ok=True)
    existing_rows = []
    rewrite = False

    if os.path.isfile(HISTORY_CSV):
        with open(HISTORY_CSV, "r", newline="") as f:
            reader = csv.DictReader(f)
            existing_header = reader.fieldnames or []
            if existing_header != HISTORY_HEADER:
                rewrite = True
                for row in reader:
                    existing_rows.append({
                        "session_id": row.get("session_id", ""),
                        "user": row.get("user", ""),
                        "role": row.get("role", ""),
                        "date": row.get("date", ""),
                        "time": row.get("time", ""),
                        "duration_minutes": row.get("duration_minutes", ""),
                        "total_cycles": row.get("total_cycles", ""),
                        "avg_score": row.get("avg_score", ""),
                        "active_count": row.get("active_count", row.get("engaged_count", 0)),
                        "passive_count": row.get("passive_count", 0),
                        "disengaged_count": row.get("disengaged_count", 0),
                        "label_summary": row.get("label_summary", ""),
                    })

    mode = "w" if rewrite or not os.path.isfile(HISTORY_CSV) else "a"
    with open(HISTORY_CSV, mode, newline="") as f:
        writer = csv.DictWriter(f, fieldnames=HISTORY_HEADER)
        if mode == "w":
            writer.writeheader()
            if existing_rows:
                writer.writerows(existing_rows)
        writer.writerow({
            "session_id": summary["session_id"],
            "user": summary["user"],
            "role": summary["role"],
            "date": summary["date"],
            "time": summary["time"],
            "duration_minutes": summary["duration_minutes"],
            "total_cycles": summary["total_cycles"],
            "avg_score": summary["avg_score"],
            "active_count": summary["active_count"],
            "passive_count": summary["passive_count"],
            "disengaged_count": summary["disengaged_count"],
            "label_summary": summary["overall_label"],
        })
    print(
        f"Saved session {summary['session_id']} | score={summary['avg_score']}% | "
        f"duration={summary['duration_minutes']}min"
    )


def reset_session_state():
    """Called by /start-session to fully clear previous session."""
    session_state.update({
        "running": False,
        "tracking_active": False,
        "phase": "idle",
        "current_cycle": 0,
        "secs_left": 0,
        "samples": [],
        "summary": None,
        "error": None,
        "progress_pct": 0,
        "start_time": None,
    })


def run_session(user="unknown", role="student", interval_minutes=5):
    """Track 20s, wait N minutes, and continue until stopped."""
    session_id = str(uuid.uuid4())[:8].upper()
    start_time = time.time()

    session_state.update({
        "running": True,
        "tracking_active": False,
        "phase": "tracking",
        "current_cycle": 0,
        "secs_left": CYCLE_DURATION,
        "interval_minutes": interval_minutes,
        "samples": [],
        "summary": None,
        "user": user,
        "role": role,
        "session_id": session_id,
        "error": None,
        "progress_pct": 0,
        "start_time": start_time,
    })

    if not camera.start():
        session_state["error"] = "Camera could not be opened"
        session_state["running"] = False
        return

    cycle = 0
    try:
        while session_state["running"]:
            cycle += 1
            session_state["current_cycle"] = cycle
            session_state["phase"] = "tracking"
            session_state["tracking_active"] = True

            sample = _run_single_cycle(cycle)
            session_state["samples"].append(sample)
            session_state["tracking_active"] = False
            session_state["progress_pct"] = cycle

            if not session_state["running"]:
                break

            _wait_interval(interval_minutes)

    except Exception as e:
        session_state["error"] = str(e)
        print(f"Error: {e}")

    finally:
        camera.stop()
        session_state.update({
            "running": False,
            "tracking_active": False,
            "phase": "idle",
            "secs_left": 0,
        })

        summary = _build_summary(session_state["samples"], user, role, session_id, start_time)
        session_state["summary"] = summary

        if summary:
            _save_to_history(summary)
            print(f"Session {session_id} complete | cycles={cycle} | avg={summary['avg_score']}%")
        else:
            print(f"Session {session_id} ended with no data")
