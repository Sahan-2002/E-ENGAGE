"""
backend/api.py  v5
Full classroom session management:
  - Real SQLite auth (users, classes, sessions tables)
  - Teacher: create class, start/stop session
  - Student: poll session status, auto-start monitoring
  - CV/HCI monitoring loop preserved from v4
"""

import sys, os
sys.path.append(os.path.dirname(__file__))

import threading, csv
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from database   import User, Class, Session as ClassSession, create_tables, get_db
from auth_utils import hash_password, verify_password, create_token, decode_token
from services.ml.session_runner import (
    run_session, session_state, reset_session_state, HISTORY_CSV
)

# ── App ────────────────────────────────────────────────────────────
app = FastAPI(title="E-ENGAGE API", version="5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    create_tables()
    print("✅ Database ready (engage.db)")


# ══════════════════════════════════════════════════════════════════
# REQUEST MODELS
# ══════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name:     str
    email:    str
    password: str
    role:     str

class LoginRequest(BaseModel):
    email:    str
    password: str

class CreateClassRequest(BaseModel):
    class_name: str

class StartClassSessionRequest(BaseModel):
    class_id:         int
    interval_minutes: int = 5

class MonitoringRequest(BaseModel):
    user:             str
    role:             str
    interval_minutes: int = 5


# ══════════════════════════════════════════════════════════════════
# AUTH HELPER
# ══════════════════════════════════════════════════════════════════

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: DBSession = Depends(get_db)
):
    """Extract user from Bearer token in Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user = db.query(User).filter(User.email == payload["email"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ══════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.post("/register")
def register(req: RegisterRequest, db: DBSession = Depends(get_db)):
    if req.role not in ("teacher", "student"):
        raise HTTPException(400, "Role must be 'teacher' or 'student'")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(409, "Email already registered")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user = User(
        name          = req.name.strip(),
        email         = req.email.lower().strip(),
        password_hash = hash_password(req.password),
        role          = req.role,
    )
    db.add(user); db.commit(); db.refresh(user)
    token = create_token(user.id, user.email, user.role)
    print(f"✅ Registered: {user.email} ({user.role})")
    return {
        "status": "registered", "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@app.post("/login")
def login(req: LoginRequest, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user.id, user.email, user.role)
    print(f"✅ Login: {user.email} ({user.role})")
    return {
        "status": "success", "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


# ══════════════════════════════════════════════════════════════════
# CLASS MANAGEMENT
# ══════════════════════════════════════════════════════════════════

@app.post("/create-class")
def create_class(
    req: CreateClassRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(403, "Only teachers can create classes")
    if not req.class_name.strip():
        raise HTTPException(400, "Class name cannot be empty")

    cls = Class(teacher_id=current_user.id, class_name=req.class_name.strip())
    db.add(cls); db.commit(); db.refresh(cls)
    print(f"📚 Class created: '{cls.class_name}' by {current_user.email}")
    return {
        "status":     "created",
        "class_id":   cls.class_id,
        "class_name": cls.class_name,
        "teacher_id": cls.teacher_id,
    }


@app.get("/my-classes")
def get_my_classes(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Return all classes belonging to the logged-in teacher."""
    if current_user.role != "teacher":
        raise HTTPException(403, "Only teachers can view their classes")
    classes = db.query(Class).filter(Class.teacher_id == current_user.id).all()
    return {"classes": [
        {"class_id": c.class_id, "class_name": c.class_name}
        for c in classes
    ]}


@app.get("/all-classes")
def get_all_classes(db: DBSession = Depends(get_db)):
    """Students call this to see available classes."""
    classes = db.query(Class).all()
    return {"classes": [
        {"class_id": c.class_id, "class_name": c.class_name, "teacher_id": c.teacher_id}
        for c in classes
    ]}


# ══════════════════════════════════════════════════════════════════
# CLASSROOM SESSION CONTROL
# ══════════════════════════════════════════════════════════════════

@app.post("/start-class-session")
def start_class_session(
    req: StartClassSessionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(403, "Only teachers can start sessions")

    # Verify class belongs to this teacher
    cls = db.query(Class).filter(
        Class.class_id == req.class_id,
        Class.teacher_id == current_user.id
    ).first()
    if not cls:
        raise HTTPException(404, "Class not found or not yours")

    # End any existing active session for this class
    existing = db.query(ClassSession).filter(
        ClassSession.class_id == req.class_id,
        ClassSession.active == True
    ).first()
    if existing:
        existing.active   = False
        existing.end_time = datetime.utcnow()
        db.commit()

    # Create new session record
    new_session = ClassSession(
        class_id         = req.class_id,
        interval_minutes = req.interval_minutes,
        active           = True,
        start_time       = datetime.utcnow(),
    )
    db.add(new_session); db.commit(); db.refresh(new_session)

    print(f"▶️  Class session started: class={cls.class_name} interval={req.interval_minutes}min")
    return {
        "status":          "started",
        "session_id":      new_session.session_id,
        "class_id":        req.class_id,
        "class_name":      cls.class_name,
        "interval_minutes":req.interval_minutes,
    }


@app.post("/stop-class-session")
def stop_class_session(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if current_user.role != "teacher":
        raise HTTPException(403, "Only teachers can stop sessions")

    session = db.query(ClassSession).filter(
        ClassSession.class_id == class_id,
        ClassSession.active   == True,
    ).first()
    if not session:
        return {"status": "no_active_session"}

    session.active   = False
    session.end_time = datetime.utcnow()
    db.commit()

    print(f"⏹️  Class session stopped: class_id={class_id}")
    return {"status": "stopped", "session_id": session.session_id}


@app.get("/class-session-status/{class_id}")
def class_session_status(class_id: int, db: DBSession = Depends(get_db)):
    """
    Polled by students every few seconds.
    Returns whether a session is active for this class + interval setting.
    """
    session = db.query(ClassSession).filter(
        ClassSession.class_id == class_id,
        ClassSession.active   == True,
    ).first()

    if session:
        return {
            "active":            True,
            "session_id":        session.session_id,
            "class_id":          class_id,
            "interval_minutes":  session.interval_minutes,
            "start_time":        session.start_time.isoformat(),
        }
    return {
        "active":     False,
        "session_id": None,
        "class_id":   class_id,
    }


# ══════════════════════════════════════════════════════════════════
# MONITORING LOOP (CV/HCI — unchanged from v4)
# ══════════════════════════════════════════════════════════════════

@app.post("/start-monitoring")
def start_monitoring(req: MonitoringRequest):
    """Student calls this when class session becomes active."""
    if session_state["running"]:
        return {"status": "already_running"}
    reset_session_state()
    thread = threading.Thread(
        target=run_session,
        args=(req.user, req.role, req.interval_minutes),
        daemon=True,
    )
    thread.start()
    return {"status": "started", "interval_minutes": req.interval_minutes}


@app.post("/stop-monitoring")
def stop_monitoring():
    """Student calls this when class session ends."""
    session_state["running"] = False
    return {"status": "stopping"}


@app.get("/monitoring-status")
def monitoring_status():
    s = session_state
    return {
        "running":         s["running"],
        "phase":           s["phase"],
        "tracking_active": s["tracking_active"],
        "current_cycle":   s["current_cycle"],
        "secs_left":       s["secs_left"],
        "interval_minutes":s["interval_minutes"],
        "latest_sample":   s["samples"][-1] if s["samples"] else None,
        "all_samples":     s["samples"],
        "summary":         s["summary"],
        "session_id":      s["session_id"],
        "error":           s["error"],
    }


# ══════════════════════════════════════════════════════════════════
# HISTORY + HEALTH
# ══════════════════════════════════════════════════════════════════

@app.get("/session-history")
def get_session_history(user: str = None, role: str = None):
    if not os.path.isfile(HISTORY_CSV):
        return {"sessions": []}
    rows = []
    with open(HISTORY_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if role == "student" and user and row.get("user") != user:
                continue
            rows.append(row)
    rows.reverse()
    return {"sessions": rows}


@app.get("/health")
def health():
    return {"status": "ok", "version": "5.0"}
