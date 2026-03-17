"""backend/api.py  v9 — browser capture + deployment ready"""

import sys, os
sys.path.append(os.path.dirname(__file__))

import threading, csv
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database   import User, Class, Session as ClassSession, EngagementRecord, create_tables, get_db
from auth_utils import hash_password, verify_password, create_token, decode_token
from services.ml.fusion import calculate_engagement_score
from services.ml.session_runner import run_session, session_state, reset_session_state, HISTORY_CSV

app = FastAPI(title="E-ENGAGE API", version="9.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    create_tables()
    print("✅ Database ready")


# ── Request models ─────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str; email: str; password: str; role: str

class LoginRequest(BaseModel):
    email: str; password: str

class CreateClassRequest(BaseModel):
    class_name: str

class StartClassSessionRequest(BaseModel):
    class_id: int; interval_minutes: int = 5

class MonitoringRequest(BaseModel):
    user: str; role: str; interval_minutes: int = 5

class SubmitEngagementRequest(BaseModel):
    session_id:       int
    engagement_score: float
    label:            str
    cycle_number:     int = 1

# ── NEW: browser sends raw features, backend scores them ──────────
class SubmitFeaturesRequest(BaseModel):
    session_id:     int
    cycle_number:   int
    face_detected:  int
    eye_openness:   float
    head_pose:      int
    typing_speed:   float
    mouse_activity: float
    idle_time:      float

class UpdateProfileRequest(BaseModel):
    name:  str
    email: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str


# ── Auth helper ────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None),
                     db: DBSession = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header missing")
    try:
        payload = decode_token(authorization.split(" ", 1)[1])
        user = db.query(User).filter(User.email == payload["email"]).first()
        if not user: raise HTTPException(401, "User not found")
        return user
    except HTTPException: raise
    except Exception:     raise HTTPException(401, "Invalid or expired token")


# ── Auth ───────────────────────────────────────────────────────────
@app.post("/register")
def register(req: RegisterRequest, db: DBSession = Depends(get_db)):
    if req.role not in ("teacher","student"): raise HTTPException(400, "Invalid role")
    if db.query(User).filter(User.email == req.email).first(): raise HTTPException(409, "Email already registered")
    if len(req.password) < 6: raise HTTPException(400, "Password must be at least 6 characters")
    user = User(name=req.name.strip(), email=req.email.lower().strip(),
                password_hash=hash_password(req.password), role=req.role)
    db.add(user); db.commit(); db.refresh(user)
    token = create_token(user.id, user.email, user.role)
    return {"status":"registered","token":token,
            "user":{"id":user.id,"name":user.name,"email":user.email,"role":user.role}}

@app.post("/login")
def login(req: LoginRequest, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user.id, user.email, user.role)
    return {"status":"success","token":token,
            "user":{"id":user.id,"name":user.name,"email":user.email,"role":user.role}}


# ── Classes ────────────────────────────────────────────────────────
@app.post("/create-class")
def create_class(req: CreateClassRequest, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    cls = Class(teacher_id=cu.id, class_name=req.class_name.strip())
    db.add(cls); db.commit(); db.refresh(cls)
    return {"status":"created","class_id":cls.class_id,"class_name":cls.class_name}

@app.get("/my-classes")
def get_my_classes(cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    classes = db.query(Class).filter(Class.teacher_id == cu.id).all()
    return {"classes":[{"class_id":c.class_id,"class_name":c.class_name} for c in classes]}

@app.get("/all-classes")
def get_all_classes(db: DBSession = Depends(get_db)):
    return {"classes":[{"class_id":c.class_id,"class_name":c.class_name,"teacher_id":c.teacher_id}
                        for c in db.query(Class).all()]}


# ── Classroom sessions ─────────────────────────────────────────────
@app.post("/start-class-session")
def start_class_session(req: StartClassSessionRequest, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    cls = db.query(Class).filter(Class.class_id == req.class_id, Class.teacher_id == cu.id).first()
    if not cls: raise HTTPException(404, "Class not found")
    existing = db.query(ClassSession).filter(ClassSession.class_id==req.class_id, ClassSession.active==True).first()
    if existing: existing.active=False; existing.end_time=datetime.utcnow(); db.commit()
    s = ClassSession(class_id=req.class_id, interval_minutes=req.interval_minutes, active=True, start_time=datetime.utcnow())
    db.add(s); db.commit(); db.refresh(s)
    return {"status":"started","session_id":s.session_id,"class_id":req.class_id,
            "class_name":cls.class_name,"interval_minutes":req.interval_minutes}

@app.post("/stop-class-session")
def stop_class_session(class_id: int, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    s = db.query(ClassSession).filter(ClassSession.class_id==class_id, ClassSession.active==True).first()
    if not s: return {"status":"no_active_session"}
    s.active=False; s.end_time=datetime.utcnow(); db.commit()
    return {"status":"stopped","session_id":s.session_id}

@app.get("/class-session-status/{class_id}")
def class_session_status(class_id: int, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.class_id==class_id, ClassSession.active==True).first()
    if s:
        return {"active":True,"session_id":s.session_id,"class_id":class_id,
                "interval_minutes":s.interval_minutes,"start_time":s.start_time.isoformat()}
    return {"active":False,"session_id":None,"class_id":class_id}


# ══════════════════════════════════════════════════════════════════
# ENGAGEMENT — browser-based capture (primary production path)
# ══════════════════════════════════════════════════════════════════

@app.post("/submit-features")
def submit_features(req: SubmitFeaturesRequest,
                    cu: User = Depends(get_current_user),
                    db: DBSession = Depends(get_db)):
    """
    Student browser sends raw CV+HCI features.
    Backend runs fusion/XGBoost and stores the result.
    This is the production path — no Python on student machine needed.
    """
    if cu.role != "student": raise HTTPException(403, "Students only")

    session = db.query(ClassSession).filter(ClassSession.session_id == req.session_id).first()
    if not session: raise HTTPException(404, "Session not found")

    # Duplicate check
    existing = db.query(EngagementRecord).filter(
        EngagementRecord.session_id   == req.session_id,
        EngagementRecord.student_id   == cu.id,
        EngagementRecord.cycle_number == req.cycle_number,
    ).first()
    if existing:
        return {"status":"already_recorded","record_id":existing.record_id}

    # Run fusion / XGBoost on the server
    cv  = {
        "face_detected": req.face_detected,
        "eye_openness":  req.eye_openness,
        "head_pose":     req.head_pose,
    }
    hci = {
        "typing_speed":   req.typing_speed,
        "mouse_activity": req.mouse_activity,
        "idle_time":      req.idle_time,
    }
    result = calculate_engagement_score(cv, hci)

    record = EngagementRecord(
        session_id       = req.session_id,
        student_id       = cu.id,
        timestamp        = datetime.utcnow(),
        engagement_score = result["engagement_score"],
        label            = result["label"],
        cycle_number     = req.cycle_number,
    )
    db.add(record); db.commit(); db.refresh(record)

    print(f"📊 [browser] {cu.name} | cycle={req.cycle_number} | "
          f"{result['engagement_score']:.1f}% | {result['label']} | src={result['score_source']}")

    return {
        "status":           "recorded",
        "record_id":        record.record_id,
        "engagement_score": result["engagement_score"],
        "label":            result["label"],
        "confidence":       result["confidence"],
        "score_source":     result["score_source"],
    }


# ══════════════════════════════════════════════════════════════════
# ENGAGEMENT — legacy submit (local Python monitoring)
# ══════════════════════════════════════════════════════════════════

@app.post("/submit-engagement")
def submit_engagement(req: SubmitEngagementRequest,
                      cu: User = Depends(get_current_user),
                      db: DBSession = Depends(get_db)):
    if cu.role != "student": raise HTTPException(403, "Students only")
    session = db.query(ClassSession).filter(ClassSession.session_id == req.session_id).first()
    if not session: raise HTTPException(404, "Session not found")
    existing = db.query(EngagementRecord).filter(
        EngagementRecord.session_id   == req.session_id,
        EngagementRecord.student_id   == cu.id,
        EngagementRecord.cycle_number == req.cycle_number,
    ).first()
    if existing:
        return {"status":"already_recorded","record_id":existing.record_id}
    record = EngagementRecord(
        session_id=req.session_id, student_id=cu.id,
        timestamp=datetime.utcnow(),
        engagement_score=round(float(req.engagement_score), 2),
        label=req.label, cycle_number=req.cycle_number,
    )
    db.add(record); db.commit(); db.refresh(record)
    return {"status":"recorded","record_id":record.record_id,
            "student":cu.name,"score":record.engagement_score,"label":record.label}


@app.get("/class-engagement/{class_id}")
def get_class_engagement(class_id: int, session_id: Optional[int] = None,
                          cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    sessions_q = db.query(ClassSession).filter(ClassSession.class_id == class_id)
    if session_id: sessions_q = sessions_q.filter(ClassSession.session_id == session_id)
    session_ids = [s.session_id for s in sessions_q.all()]
    if not session_ids: return {"records":[],"summary":[],"total_records":0}
    records = (db.query(EngagementRecord)
               .filter(EngagementRecord.session_id.in_(session_ids))
               .order_by(EngagementRecord.timestamp).all())
    student_map = {}
    for r in records:
        sid = r.student_id
        if sid not in student_map:
            student_map[sid] = {"student_id":sid,"student_name":r.student.name,
                                "scores":[],"labels":[],"timeline":[]}
        student_map[sid]["scores"].append(r.engagement_score)
        student_map[sid]["labels"].append(r.label)
        student_map[sid]["timeline"].append({
            "cycle":r.cycle_number,"score":r.engagement_score,
            "label":r.label,"timestamp":r.timestamp.isoformat()
        })
    summary = []
    for sid, d in student_map.items():
        avg        = round(sum(d["scores"]) / len(d["scores"]), 1)
        active     = sum(1 for l in d["labels"] if l == "Active Engagement")
        passive    = sum(1 for l in d["labels"] if l == "Passive Engagement")
        disengaged = sum(1 for l in d["labels"] if l == "Disengaged")
        overall    = ("Highly Engaged" if avg >= 70 else "Moderately Engaged" if avg >= 50 else "Disengaged")
        summary.append({"student_id":sid,"student_name":d["student_name"],
                        "avg_score":avg,"total_cycles":len(d["scores"]),
                        "active_cycles":active,"passive_cycles":passive,
                        "disengaged_cycles":disengaged,"overall_label":overall,
                        "timeline":d["timeline"]})
    summary.sort(key=lambda x: x["avg_score"], reverse=True)
    return {"class_id":class_id,"summary":summary,"total_records":len(records)}


@app.get("/student-engagement")
def get_student_engagement(session_id: Optional[int] = None,
                            cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    q = db.query(EngagementRecord).filter(EngagementRecord.student_id == cu.id)
    if session_id: q = q.filter(EngagementRecord.session_id == session_id)
    records = q.order_by(EngagementRecord.timestamp).all()
    return {"records":[{"record_id":r.record_id,"session_id":r.session_id,
                        "cycle_number":r.cycle_number,"engagement_score":r.engagement_score,
                        "label":r.label,"timestamp":r.timestamp.isoformat()} for r in records]}


# ══════════════════════════════════════════════════════════════════
# STUDENT HISTORY & DELETE
# ══════════════════════════════════════════════════════════════════

@app.get("/student-history/{student_id}")
def get_student_history(student_id: int, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student: raise HTTPException(404, "Student not found")
    records = (db.query(EngagementRecord).filter(EngagementRecord.student_id == student_id)
               .order_by(EngagementRecord.timestamp).all())
    session_map = {}
    for r in records:
        sid = r.session_id
        if sid not in session_map:
            session_map[sid] = {"session_id":sid,"class_id":r.session.class_id,
                                "class_name":r.session.cls.class_name,
                                "start_time":r.session.start_time.isoformat(),
                                "scores":[],"labels":[],"timeline":[]}
        session_map[sid]["scores"].append(r.engagement_score)
        session_map[sid]["labels"].append(r.label)
        session_map[sid]["timeline"].append({"record_id":r.record_id,"cycle":r.cycle_number,
                                             "score":r.engagement_score,"label":r.label,
                                             "timestamp":r.timestamp.isoformat()})
    sessions = []
    for sid, d in session_map.items():
        avg        = round(sum(d["scores"]) / len(d["scores"]), 1)
        active     = sum(1 for l in d["labels"] if l == "Active Engagement")
        passive    = sum(1 for l in d["labels"] if l == "Passive Engagement")
        disengaged = sum(1 for l in d["labels"] if l == "Disengaged")
        overall    = ("Highly Engaged" if avg >= 70 else "Moderately Engaged" if avg >= 50 else "Disengaged")
        sessions.append({"session_id":sid,"class_id":d["class_id"],"class_name":d["class_name"],
                         "start_time":d["start_time"],"avg_score":avg,"total_cycles":len(d["scores"]),
                         "active_cycles":active,"passive_cycles":passive,"disengaged_cycles":disengaged,
                         "overall_label":overall,"timeline":d["timeline"]})
    sessions.sort(key=lambda x: x["start_time"], reverse=True)
    return {"student_id":student_id,"student_name":student.name,
            "total_sessions":len(sessions),"total_records":len(records),"sessions":sessions}

@app.delete("/student-history/{student_id}/session/{session_id}")
def delete_student_session_history(student_id: int, session_id: int,
                                    cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    records = (db.query(EngagementRecord)
               .filter(EngagementRecord.student_id==student_id,
                       EngagementRecord.session_id==session_id).all())
    if not records: raise HTTPException(404, "No records found")
    count = len(records)
    for r in records: db.delete(r)
    db.commit()
    return {"status":"deleted","student_id":student_id,"session_id":session_id,"records_deleted":count}

@app.delete("/student-history/{student_id}/all")
def delete_all_student_history(student_id: int, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    records = db.query(EngagementRecord).filter(EngagementRecord.student_id==student_id).all()
    count = len(records)
    for r in records: db.delete(r)
    db.commit()
    return {"status":"deleted","student_id":student_id,"records_deleted":count}


# ══════════════════════════════════════════════════════════════════
# SETTINGS
# ══════════════════════════════════════════════════════════════════

@app.put("/update-profile")
def update_profile(req: UpdateProfileRequest, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if not req.name.strip():  raise HTTPException(400, "Name cannot be empty")
    if not req.email.strip(): raise HTTPException(400, "Email cannot be empty")
    existing = db.query(User).filter(User.email==req.email.lower().strip(), User.id!=cu.id).first()
    if existing: raise HTTPException(409, "Email already in use")
    cu.name=req.name.strip(); cu.email=req.email.lower().strip()
    db.commit(); db.refresh(cu)
    return {"status":"updated","name":cu.name,"email":cu.email}

@app.put("/change-password")
def change_password_endpoint(req: ChangePasswordRequest, cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if not verify_password(req.current_password, cu.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    cu.password_hash = hash_password(req.new_password)
    db.commit()
    return {"status":"password_changed"}

@app.delete("/delete-all-my-data")
def delete_all_my_data(cu: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if cu.role != "teacher": raise HTTPException(403, "Teachers only")
    classes   = db.query(Class).filter(Class.teacher_id==cu.id).all()
    class_ids = [c.class_id for c in classes]
    if not class_ids: return {"status":"nothing_to_delete"}
    sessions    = db.query(ClassSession).filter(ClassSession.class_id.in_(class_ids)).all()
    session_ids = [s.session_id for s in sessions]
    records_deleted = 0
    if session_ids:
        records = db.query(EngagementRecord).filter(EngagementRecord.session_id.in_(session_ids)).all()
        records_deleted = len(records)
        for r in records: db.delete(r)
    for s in sessions: db.delete(s)
    db.commit()
    return {"status":"deleted","classes_affected":len(class_ids),
            "sessions_deleted":len(sessions),"records_deleted":records_deleted}


# ── Local Python monitoring (kept for local dev/testing only) ──────
@app.post("/start-monitoring")
def start_monitoring(req: MonitoringRequest):
    if session_state["running"]: return {"status":"already_running"}
    reset_session_state()
    threading.Thread(target=run_session, args=(req.user,req.role,req.interval_minutes), daemon=True).start()
    return {"status":"started","interval_minutes":req.interval_minutes}

@app.post("/stop-monitoring")
def stop_monitoring():
    session_state["running"] = False
    return {"status":"stopping"}

@app.get("/monitoring-status")
def monitoring_status():
    s = session_state
    return {"running":s["running"],"phase":s["phase"],"tracking_active":s["tracking_active"],
            "current_cycle":s["current_cycle"],"secs_left":s["secs_left"],
            "interval_minutes":s["interval_minutes"],
            "latest_sample":s["samples"][-1] if s["samples"] else None,
            "all_samples":s["samples"],"summary":s["summary"],
            "session_id":s["session_id"],"error":s["error"]}

@app.get("/session-history")
def get_session_history(user: str = None, role: str = None):
    if not os.path.isfile(HISTORY_CSV): return {"sessions":[]}
    rows = []
    with open(HISTORY_CSV,"r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if role=="student" and user and row.get("user") != user: continue
            rows.append(row)
    rows.reverse()
    return {"sessions":rows}

@app.get("/health")
def health(): return {"status":"ok","version":"9.0"}
