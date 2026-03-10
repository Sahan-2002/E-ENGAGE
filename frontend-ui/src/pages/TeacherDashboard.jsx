import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { getUser } from "../services/auth";
import {
  createClass, getMyClasses,
  startClassSession, stopClassSession, getClassSessionStatus,
} from "../services/api";
import { Plus, Play, Square, BookOpen, Activity, Timer, AlertCircle } from "lucide-react";

function StatusPill({ active }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap: 6,
      padding:"4px 12px", borderRadius: 20, fontSize:"0.75rem", fontWeight: 700,
      background: active ? "rgba(61,122,95,0.1)" : "rgba(148,163,184,0.1)",
      color: active ? "var(--sage)" : "var(--text-muted)",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius:"50%",
        background: active ? "var(--sage)" : "var(--border)",
        animation: active ? "pulse 1.4s infinite" : "none",
        boxShadow: active ? "0 0 0 3px rgba(61,122,95,0.2)" : "none",
      }} />
      {active ? "LIVE" : "IDLE"}
    </span>
  );
}

export default function TeacherDashboard() {
  const user = getUser();

  const [classes,          setClasses]          = useState([]);
  const [selectedClass,    setSelectedClass]     = useState(null);
  const [newClassName,     setNewClassName]      = useState("");
  const [creating,         setCreating]          = useState(false);
  const [showCreate,       setShowCreate]        = useState(false);
  const [sessionActive,    setSessionActive]     = useState(false);
  const [intervalMinutes,  setIntervalMinutes]   = useState(5);
  const [sessionStarting,  setSessionStarting]   = useState(false);
  const [sessionError,     setSessionError]      = useState("");
  const [sessionInfo,      setSessionInfo]       = useState(null);

  // All refs at top level
  const pollRef           = useRef(null);
  const selectedClassRef  = useRef(null);

  // Keep ref in sync
  useEffect(() => { selectedClassRef.current = selectedClass; }, [selectedClass]);

  const loadClasses = useCallback(async () => {
    try {
      const data = await getMyClasses();
      setClasses(data.classes || []);
      if (data.classes?.length && !selectedClassRef.current) {
        setSelectedClass(data.classes[0]);
      }
    } catch (e) {
      console.error("Could not load classes:", e.message);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  // Poll session status for selected class
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!selectedClass) return;

    async function poll() {
      try {
        const data = await getClassSessionStatus(selectedClass.class_id);
        setSessionActive(data.active);
        setSessionInfo(data.active ? data : null);
      } catch {}
    }

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedClass]);

  async function handleCreateClass(e) {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setCreating(true);
    try {
      const data = await createClass(newClassName);
      setNewClassName("");
      setShowCreate(false);
      await loadClasses();
      setSelectedClass({ class_id: data.class_id, class_name: data.class_name });
    } catch (err) {
      setSessionError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStartSession() {
    if (!selectedClass) return;
    setSessionStarting(true);
    setSessionError("");
    try {
      await startClassSession(selectedClass.class_id, intervalMinutes);
      setSessionActive(true);
    } catch (err) {
      setSessionError(err.message);
    } finally {
      setSessionStarting(false);
    }
  }

  async function handleStopSession() {
    if (!selectedClass) return;
    try {
      await stopClassSession(selectedClass.class_id);
      setSessionActive(false);
      setSessionInfo(null);
    } catch (err) {
      setSessionError(err.message);
    }
  }

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-body">

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 28 }}>
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-desc">Manage your classes and monitor student attention</p>
          </div>
          <span className="badge badge-primary">👨‍🏫 {user?.name}</span>
        </div>

        {sessionError && (
          <div style={{
            background:"rgba(192,57,43,0.07)", border:"1px solid rgba(192,57,43,0.2)",
            borderRadius:"var(--radius-sm)", padding:"11px 15px",
            color:"var(--danger)", fontSize:"0.85rem", marginBottom: 20,
            display:"flex", alignItems:"center", gap: 8,
          }}>
            <AlertCircle size={15}/> {sessionError}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap: 20, alignItems:"start" }}>

          {/* Left: class list */}
          <div className="card fade-up">
            <div className="card-header" style={{ marginBottom: 14 }}>
              <div className="card-title" style={{ display:"flex", alignItems:"center", gap: 8 }}>
                <BookOpen size={16} style={{ color:"var(--sage)" }} /> My Classes
              </div>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowCreate(v => !v)}
                style={{ padding:"4px 8px" }}>
                <Plus size={14} />
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreateClass} style={{ marginBottom: 14 }}>
                <input className="form-input"
                  placeholder="e.g. Software Engineering 2B"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  style={{ marginBottom: 8 }} autoFocus />
                <button type="submit" className="btn btn-primary btn-full"
                  disabled={creating || !newClassName.trim()}
                  style={{ fontSize:"0.84rem" }}>
                  {creating ? "Creating..." : "Create Class"}
                </button>
              </form>
            )}

            {classes.length === 0 ? (
              <div style={{ textAlign:"center", padding:"28px 12px", color:"var(--text-muted)", fontSize:"0.85rem" }}>
                <BookOpen size={28} style={{ margin:"0 auto 10px", opacity: 0.2 }} />
                No classes yet.<br />Click + to create one.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap: 6 }}>
                {classes.map(cls => (
                  <button key={cls.class_id}
                    onClick={() => { setSelectedClass(cls); setSessionError(""); }}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"11px 14px", borderRadius:"var(--radius-sm)",
                      border:`1.5px solid ${selectedClass?.class_id === cls.class_id ? "var(--navy)" : "var(--border-light)"}`,
                      background: selectedClass?.class_id === cls.class_id ? "rgba(15,31,61,0.04)" : "transparent",
                      cursor:"pointer", textAlign:"left", width:"100%", transition:"all 0.15s",
                    }}>
                    <span style={{
                      fontSize:"0.88rem", fontWeight: 600,
                      color: selectedClass?.class_id === cls.class_id ? "var(--navy)" : "var(--text-secondary)",
                    }}>
                      {cls.class_name}
                    </span>
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>
                      #{cls.class_id}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: session control */}
          <div>
            {!selectedClass ? (
              <div className="card fade-up" style={{
                textAlign:"center", padding:"64px 24px",
                background:"linear-gradient(160deg, #F8FAFF, #EEF2FF)",
              }}>
                <BookOpen size={36} style={{ margin:"0 auto 16px", opacity: 0.2 }} />
                <div style={{ fontFamily:"var(--font-display)", fontSize:"1.1rem", fontWeight: 600, marginBottom: 8 }}>
                  Select or create a class
                </div>
                <div style={{ fontSize:"0.88rem", color:"var(--text-muted)" }}>
                  Choose a class from the left to start monitoring
                </div>
              </div>
            ) : (
              <>
                <div className="card fade-up" style={{ marginBottom: 16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 24 }}>
                    <div>
                      <div style={{
                        fontFamily:"var(--font-display)", fontWeight: 700,
                        fontSize:"1.3rem", color:"var(--navy)", marginBottom: 4,
                      }}>
                        {selectedClass.class_name}
                      </div>
                      <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>
                        Class ID: <span style={{ fontFamily:"var(--font-mono)" }}>#{selectedClass.class_id}</span>
                      </div>
                    </div>
                    <StatusPill active={sessionActive} />
                  </div>

                  {sessionActive && sessionInfo && (
                    <div style={{
                      background:"rgba(61,122,95,0.06)", border:"1px solid rgba(61,122,95,0.15)",
                      borderRadius:"var(--radius-sm)", padding:"14px 16px", marginBottom: 20,
                      display:"flex", alignItems:"center", gap: 12,
                    }}>
                      <Activity size={16} style={{ color:"var(--sage)", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize:"0.84rem", fontWeight: 600, color:"var(--sage)" }}>
                          Session is live — students are being monitored
                        </div>
                        <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop: 2 }}>
                          Interval: {sessionInfo.interval_minutes} min ·
                          Started: {new Date(sessionInfo.start_time).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display:"flex", alignItems:"center", gap: 14, flexWrap:"wrap" }}>
                    <div style={{
                      display:"flex", alignItems:"center", gap: 10,
                      background:"var(--bg)", borderRadius:"var(--radius-sm)",
                      padding:"10px 16px", opacity: sessionActive ? 0.5 : 1,
                    }}>
                      <Timer size={14} style={{ color:"var(--text-muted)" }} />
                      <span style={{ fontSize:"0.84rem", color:"var(--text-secondary)", fontWeight: 500 }}>
                        Interval:
                      </span>
                      <input type="number" min={1} max={60}
                        value={intervalMinutes}
                        onChange={e => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={sessionActive}
                        style={{
                          width: 50, padding:"6px 8px",
                          border:"1.5px solid var(--border)", borderRadius:"var(--radius-sm)",
                          fontFamily:"var(--font-display)", fontWeight: 700,
                          fontSize:"0.95rem", color:"var(--navy)",
                          textAlign:"center", outline:"none",
                          background: sessionActive ? "var(--bg)" : "white",
                        }} />
                      <span style={{ fontSize:"0.84rem", color:"var(--text-muted)" }}>min</span>
                    </div>

                    <button className="btn btn-sage" onClick={handleStartSession}
                      disabled={sessionActive || sessionStarting} style={{ minWidth: 150 }}>
                      {sessionStarting ? "Starting..." : <><Play size={14}/> Start Session</>}
                    </button>

                    <button className="btn btn-danger" onClick={handleStopSession}
                      disabled={!sessionActive}>
                      <Square size={14}/> Stop Session
                    </button>
                  </div>
                </div>

                <div className="card fade-up-2" style={{ background:"linear-gradient(160deg, #F8FAFF, #EEF2FF)" }}>
                  <div className="card-title" style={{ marginBottom: 14 }}>How it works</div>
                  {[
                    { icon:<Play size={14}/>,     text:"Click Start Session — students are notified automatically" },
                    { icon:<Activity size={14}/>, text:"Students' browsers begin monitoring via CV and keyboard/mouse signals" },
                    { icon:<Timer size={14}/>,    text:`Every ${intervalMinutes} minutes, a new 20-second measurement cycle runs` },
                    { icon:<Square size={14}/>,   text:"Click Stop Session to end monitoring for all students" },
                  ].map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap: 12, marginBottom: i < 3 ? 12 : 0 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background:"rgba(15,31,61,0.07)",
                        display:"flex", alignItems:"center", justifyContent:"center", color:"var(--navy)",
                      }}>{item.icon}</span>
                      <span style={{ fontSize:"0.85rem", color:"var(--text-secondary)", lineHeight: 1.6 }}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
