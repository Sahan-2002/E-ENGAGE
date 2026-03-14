import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import EngagementCard from "../components/EngagementCard";
import ChartComponent from "../components/ChartComponent";
import FeatureMetricsPanel from "../components/FeatureMetricsPanel";
import { getUser } from "../services/auth";
import {
  getAllClasses, getClassSessionStatus,
  startMonitoring, stopMonitoring, getMonitoringStatus,
  submitEngagement,
} from "../services/api";
import {
  WifiOff, Clock, Activity, AlertCircle,
  BookOpen, ChevronDown, CheckCircle,
} from "lucide-react";

const POLL_CLASS_MS   = 4000;
const POLL_MONITOR_MS = 1000;

function fmt(s) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

function PhaseBadge({ phase }) {
  const cfg = {
    idle:     { label:"IDLE",     bg:"#F1F5F9",              color:"#64748B",     pulse:false },
    tracking: { label:"TRACKING", bg:"rgba(61,122,95,0.1)",  color:"var(--sage)", pulse:true  },
    waiting:  { label:"WAITING",  bg:"rgba(201,150,58,0.1)", color:"var(--gold)", pulse:false },
  }[phase] || { label:"IDLE", bg:"#F1F5F9", color:"#64748B", pulse:false };
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:7,
      background:cfg.bg,color:cfg.color,
      padding:"6px 14px",borderRadius:40,
      fontWeight:700,fontSize:"0.74rem",letterSpacing:"0.1em",
    }}>
      <span style={{
        width:7,height:7,borderRadius:"50%",background:cfg.color,
        animation:cfg.pulse?"pulse 1.4s infinite":"none",
        boxShadow:cfg.pulse?`0 0 0 3px ${cfg.color}33`:"none",
      }}/>
      {cfg.label}
    </span>
  );
}

export default function StudentDashboard() {
  const user = getUser();

  const [classes,        setClasses]        = useState([]);
  const [selectedClass,  setSelectedClass]  = useState(null);
  const [showDrop,       setShowDrop]       = useState(false);
  const [teacherSession, setTeacherSession] = useState(null);
  const [monitoring,     setMonitoring]     = useState(null);
  const [localSecs,      setLocalSecs]      = useState(0);
  const [localPhase,     setLocalPhase]     = useState("idle");
  const [backendError,   setBackendError]   = useState("");
  const [submittedCount, setSubmittedCount] = useState(0);

  // Refs — never trigger re-renders
  const classPollRef      = useRef(null);
  const monitorPollRef    = useRef(null);
  const countdownRef      = useRef(null);
  const dropdownRef       = useRef(null);   // NEW: for click-outside detection
  const monitoringStarted = useRef(false);
  const submittedCycles   = useRef(new Set());
  const teacherSessionRef = useRef(null);
  const userRef           = useRef(user);

  useEffect(() => { userRef.current          = user;           }, [user]);
  useEffect(() => { teacherSessionRef.current = teacherSession; }, [teacherSession]);

  // ── Close dropdown on click outside ────────────────────────────
  useEffect(() => {
    if (!showDrop) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDrop]);

  // Load classes once
  useEffect(() => {
    getAllClasses()
      .then(d => { setClasses(d.classes||[]); if(d.classes?.length) setSelectedClass(d.classes[0]); })
      .catch(() => setBackendError("Cannot reach backend"));
  }, []);

  // ── Monitoring poll — also submits completed cycles ──────────────
  function startMonitorPoll() {
    clearInterval(monitorPollRef.current);
    monitorPollRef.current = setInterval(async () => {
      try {
        const data = await getMonitoringStatus();
        setMonitoring(data);
        setLocalPhase(data.phase || "idle");
        setLocalSecs(data.secs_left || 0);

        const samples = data.all_samples || [];
        for (const sample of samples) {
          const cycle = sample.cycle;
          const tsess = teacherSessionRef.current;

          if (
            tsess?.session_id &&
            !submittedCycles.current.has(cycle) &&
            (data.phase === "waiting" || !data.running)
          ) {
            submittedCycles.current.add(cycle);
            try {
              await submitEngagement(
                tsess.session_id,
                sample.engagement_score,
                sample.label,
                cycle,
              );
              setSubmittedCount(n => n + 1);
            } catch (e) {
              if (!e.message?.includes("already_recorded")) {
                console.warn("Submit failed:", e.message);
              }
            }
          }
        }
      } catch {}
    }, POLL_MONITOR_MS);
  }

  function stopMonitorPoll() {
    clearInterval(monitorPollRef.current);
    setMonitoring(null);
    setLocalPhase("idle");
    setLocalSecs(0);
  }

  // ── Class session poll — restarts when class changes ─────────────
  useEffect(() => {
    if (!selectedClass) return;
    clearInterval(classPollRef.current);
    clearInterval(monitorPollRef.current);

    monitoringStarted.current = false;
    submittedCycles.current.clear();
    setTeacherSession(null);
    setMonitoring(null);
    setLocalPhase("idle");
    setLocalSecs(0);
    setSubmittedCount(0);

    async function pollClassSession() {
      try {
        const data = await getClassSessionStatus(selectedClass.class_id);

        if (data.active) {
          setTeacherSession(data);
          setBackendError("");

          if (!monitoringStarted.current) {
            monitoringStarted.current = true;
            try {
              await startMonitoring(
                userRef.current?.email || "student",
                "student",
                data.interval_minutes,
              );
            } catch (e) {
              if (!e.message?.includes("already_running")) {
                setBackendError(e.message);
                monitoringStarted.current = false;
                return;
              }
            }
            startMonitorPoll();
          }
        } else {
          if (monitoringStarted.current) {
            monitoringStarted.current = false;
            stopMonitorPoll();
            try { await stopMonitoring(); } catch {}
          }
          setTeacherSession(null);
        }
      } catch {
        setBackendError("Cannot reach backend. Is FastAPI running?");
      }
    }

    pollClassSession();
    classPollRef.current = setInterval(pollClassSession, POLL_CLASS_MS);
    return () => {
      clearInterval(classPollRef.current);
      clearInterval(monitorPollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  // Smooth local countdown
  useEffect(() => {
    clearInterval(countdownRef.current);
    if (localPhase === "idle") return;
    countdownRef.current = setInterval(() => setLocalSecs(s => Math.max(0, s-1)), 1000);
    return () => clearInterval(countdownRef.current);
  }, [localPhase, monitoring?.current_cycle]);

  const latest    = monitoring?.latest_sample;
  const chartData = (monitoring?.all_samples||[]).map(s => ({ time:`C${s.cycle}`, score:s.engagement_score }));

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-body">

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
          <div>
            <h1 className="page-title">Student Dashboard</h1>
            <p className="page-desc">Monitoring starts automatically when your teacher begins a session</p>
          </div>
          <span className="badge badge-sage">👨‍🎓 {user?.name}</span>
        </div>

        {backendError && (
          <div style={{
            background:"rgba(192,57,43,0.07)",border:"1px solid rgba(192,57,43,0.2)",
            borderRadius:"var(--radius-sm)",padding:"11px 15px",
            color:"var(--danger)",fontSize:"0.85rem",marginBottom:20,
            display:"flex",alignItems:"center",gap:8,
          }}>
            <WifiOff size={15}/> {backendError}
          </div>
        )}

        {/* ── Class selector ── */}
        {/*
          FIX: The card's box-shadow creates a stacking context that traps
          child z-index values. We pull the dropdown's wrapper OUT of the
          card's overflow by using overflow:visible on the card row, and
          set zIndex:9999 on the dropdown panel itself so it floats above
          everything including the navbar (z-index:100).
        */}
        <div className={`card fade-up student-class-selector-card${showDrop ? " open" : ""}`} style={{marginBottom:20,padding:"16px 20px",overflow:"visible"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",overflow:"visible"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <BookOpen size={15} style={{color:"var(--sage)"}}/>
              <span style={{fontSize:"0.88rem",fontWeight:600,color:"var(--text-secondary)"}}>Joined class:</span>
            </div>

            {/* Dropdown wrapper — ref used for click-outside */}
            <div ref={dropdownRef} className="student-class-selector" style={{position:"relative"}}>
              <button
                className="class-selector-btn"
                onClick={() => setShowDrop(v => !v)}
                style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"9px 14px",borderRadius:"var(--radius-sm)",
                  border:"1.5px solid var(--border)",background:"white",
                  cursor:"pointer",fontSize:"0.9rem",fontWeight:600,
                  color:"var(--navy)",minWidth:240,
                }}>
                <span style={{flex:1,textAlign:"left"}}>
                  {selectedClass ? selectedClass.class_name : "Select a class..."}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color:"var(--text-muted)",flexShrink:0,
                    transform: showDrop ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>

              {showDrop && (
                <div className="class-selector-dropdown" style={{
                  position:"absolute",top:"calc(100% + 6px)",left:0,
                  background:"white",border:"1px solid var(--border)",
                  borderRadius:"var(--radius)",
                  boxShadow:"0 12px 40px rgba(15,31,61,0.18)",
                  minWidth:260,
                  zIndex:9999,   // FIX: high enough to escape all stacking contexts
                }}>
                  {classes.length === 0 ? (
                    <div style={{padding:"16px",fontSize:"0.85rem",color:"var(--text-muted)"}}>
                      No classes yet.
                    </div>
                  ) : (
                    classes.map((cls, idx) => (
                      <button
                        key={cls.class_id}
                        onClick={() => { setSelectedClass(cls); setShowDrop(false); }}
                        style={{
                          display:"block",width:"100%",textAlign:"left",
                          padding:"11px 16px",border:"none",
                          background: selectedClass?.class_id === cls.class_id
                            ? "rgba(61,122,95,0.06)" : "none",
                          cursor:"pointer",fontSize:"0.88rem",fontWeight:500,
                          color: selectedClass?.class_id === cls.class_id
                            ? "var(--sage)" : "var(--text-primary)",
                          borderBottom: idx < classes.length - 1
                            ? "1px solid var(--border-light)" : "none",
                          borderRadius: idx === 0 ? "var(--radius) var(--radius) 0 0"
                            : idx === classes.length - 1 ? "0 0 var(--radius) var(--radius)" : "0",
                        }}>
                        {cls.class_name}
                        <span style={{
                          marginLeft:8,fontSize:"0.75rem",
                          color:"var(--text-muted)",fontFamily:"var(--font-mono)",
                        }}>
                          #{cls.class_id}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {teacherSession && (
              <span style={{
                display:"inline-flex",alignItems:"center",gap:6,
                padding:"5px 12px",borderRadius:20,
                background:"rgba(61,122,95,0.1)",color:"var(--sage)",
                fontSize:"0.78rem",fontWeight:700,
              }}>
                <span style={{
                  width:7,height:7,borderRadius:"50%",
                  background:"var(--sage)",animation:"pulse 1.4s infinite",
                  boxShadow:"0 0 0 3px rgba(61,122,95,0.2)",
                }}/>
                Teacher session live
              </span>
            )}
          </div>
        </div>

        {/* Waiting */}
        {!teacherSession && (
          <div className="card fade-up" style={{
            textAlign:"center",padding:"72px 24px",
            background:"linear-gradient(160deg,var(--cream),var(--cream-dark))",
          }}>
            <div style={{
              width:72,height:72,borderRadius:"50%",
              background:"rgba(15,31,61,0.06)",
              display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",
            }}>
              <Clock size={32} style={{color:"var(--navy)",opacity:0.35}}/>
            </div>
            <div style={{fontFamily:"var(--font-display)",fontSize:"1.3rem",fontWeight:600,color:"var(--navy)",marginBottom:10}}>
              Waiting for your teacher
            </div>
            <div style={{fontSize:"0.9rem",color:"var(--text-muted)",maxWidth:420,margin:"0 auto",lineHeight:1.8}}>
              {selectedClass
                ? <>You're in <strong style={{color:"var(--navy)"}}>{selectedClass.class_name}</strong>.<br/>
                    Monitoring starts automatically when your teacher begins a session.</>
                : "Select a class above to begin."}
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:7,marginTop:28}}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:7,height:7,borderRadius:"50%",background:"var(--border)",
                  animation:`dotPulse 1.6s ease-in-out ${i*0.25}s infinite`,
                }}/>
              ))}
            </div>
            <div style={{fontSize:"0.75rem",color:"var(--text-muted)",marginTop:12}}>
              Checking every {POLL_CLASS_MS/1000}s...
            </div>
          </div>
        )}

        {/* Active monitoring */}
        {teacherSession && (
          <>
            <div className="card fade-up" style={{marginBottom:16,padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <PhaseBadge phase={localPhase}/>
                  <div style={{fontSize:"0.88rem",color:"var(--text-secondary)"}}>
                    {localPhase==="tracking" && (
                      <><strong style={{fontFamily:"var(--font-display)",color:"var(--sage)"}}>{fmt(localSecs)}</strong> remaining</>
                    )}
                    {localPhase==="waiting" && (
                      <>Next cycle in <strong style={{fontFamily:"var(--font-display)",color:"var(--gold)"}}>{fmt(localSecs)}</strong></>
                    )}
                    {localPhase==="idle" && "Monitoring active — first cycle starting..."}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  {submittedCount > 0 && (
                    <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.8rem",color:"var(--sage)"}}>
                      <CheckCircle size={13}/>
                      {submittedCount} cycle{submittedCount!==1?"s":""} submitted to teacher
                    </div>
                  )}
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Activity size={13} style={{color:"var(--text-muted)"}}/>
                    <span style={{fontSize:"0.82rem",color:"var(--text-muted)"}}>
                      {monitoring?.current_cycle||0} recorded
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!latest && (
              <div className="card" style={{textAlign:"center",padding:"48px 24px"}}>
                <Activity size={28} style={{margin:"0 auto 14px",opacity:0.2}}/>
                <div style={{fontSize:"0.9rem",color:"var(--text-muted)"}}>First measurement cycle starting...</div>
              </div>
            )}

            {latest && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16,marginBottom:16}}>
                  <EngagementCard score={latest.engagement_score} confidence={latest.confidence} label={latest.label}/>
                  <ChartComponent data={chartData}/>
                </div>
                <FeatureMetricsPanel features={latest.features||{}}/>
                {latest.face_detected===0 && (
                  <div style={{
                    marginTop:14,padding:"12px 16px",
                    background:"rgba(192,57,43,0.07)",border:"1px solid rgba(192,57,43,0.2)",
                    borderRadius:"var(--radius-sm)",display:"flex",alignItems:"center",gap:8,
                    color:"var(--danger)",fontSize:"0.85rem",
                  }}>
                    <AlertCircle size={14}/> Face not detected — make sure your camera is visible
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes dotPulse{0%,80%,100%{opacity:0.25;transform:scale(1)}40%{opacity:1;transform:scale(1.5)}}
      `}</style>
    </div>
  );
}
