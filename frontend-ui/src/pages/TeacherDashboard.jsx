import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import { getUser } from "../services/auth";
import {
  createClass, getMyClasses,
  startClassSession, stopClassSession, getClassSessionStatus,
  getClassEngagement,
  getStudentHistory, deleteStudentSessionHistory, deleteAllStudentHistory,
} from "../services/api";
import {
  Plus, Play, Square, BookOpen, Activity,
  Timer, AlertCircle, Users, TrendingUp, Award,
  History, Trash2, X, ChevronDown, ChevronUp,
  Zap,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";

// ── Helpers ────────────────────────────────────────────────────────
const LINE_COLORS = ["#3D7A5F","#2A6496","#C9963A","#8B5CF6","#EC4899","#0891B2"];

function scoreColor(v) {
  return v >= 70 ? "var(--success)" : v >= 50 ? "var(--warning)" : "var(--danger)";
}

// Real-time attention ring
function AttentionRing({ score, size = 52 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - (score || 0) / 100);
  const col = scoreColor(score || 0);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={5}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{
          fontSize: size < 50 ? "0.62rem" : "0.72rem",
          fontWeight: 800,
          fill: col,
          transform: "rotate(90deg)",
          transformOrigin: `${size/2}px ${size/2}px`,
          fontFamily: "var(--font-display)",
        }}
      >
        {score != null ? `${Math.round(score)}%` : "—"}
      </text>
    </svg>
  );
}

function StatusPill({ active }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:6,
      padding:"4px 12px",borderRadius:20,fontSize:"0.75rem",fontWeight:700,
      background:active?"rgba(61,122,95,0.1)":"rgba(148,163,184,0.1)",
      color:active?"var(--sage)":"var(--text-muted)",
    }}>
      <span style={{
        width:7,height:7,borderRadius:"50%",
        background:active?"var(--sage)":"var(--border)",
        animation:active?"pulse 1.4s infinite":"none",
        boxShadow:active?"0 0 0 3px rgba(61,122,95,0.2)":"none",
      }}/>
      {active ? "LIVE" : "IDLE"}
    </span>
  );
}

function ResultBadge({ label }) {
  const cfg = {
    "Highly Engaged":     { bg:"rgba(61,122,95,0.1)",  color:"var(--sage)" },
    "Moderately Engaged": { bg:"rgba(201,150,58,0.1)", color:"var(--gold)" },
    "Disengaged":         { bg:"rgba(192,57,43,0.08)", color:"var(--danger)" },
  }[label] || { bg:"rgba(148,163,184,0.1)", color:"var(--text-muted)" };
  return (
    <span style={{
      display:"inline-block",background:cfg.bg,color:cfg.color,
      padding:"3px 10px",borderRadius:20,fontSize:"0.75rem",fontWeight:700,
    }}>
      {label}
    </span>
  );
}

function buildChartData(summary) {
  if (!summary?.length) return { data:[], students:[] };
  const maxCycles = Math.max(...summary.map(s => s.timeline?.length || 0));
  const data = Array.from({ length: maxCycles }, (_,i) => {
    const point = { cycle: `C${i+1}` };
    summary.forEach(s => {
      if (s.timeline?.[i]) point[s.student_name] = s.timeline[i].score;
    });
    return point;
  });
  return { data, students: summary.map(s => s.student_name) };
}

// ── Student History Modal ──────────────────────────────────────────
function StudentHistoryModal({ student, onClose, onDeleteSession }) {
  const [history, setHistory]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [expanded, setExpanded]       = useState({});
  const [deleting, setDeleting]       = useState({});
  const [confirmAll, setConfirmAll]   = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await getStudentHistory(student.student_id);
      setHistory(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [student.student_id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleDeleteSession(sessionId) {
    setDeleting(d => ({ ...d, [sessionId]: true }));
    try {
      await deleteStudentSessionHistory(student.student_id, sessionId);
      await loadHistory();
      if (onDeleteSession) onDeleteSession();
    } catch (e) { setError(e.message); }
    finally { setDeleting(d => ({ ...d, [sessionId]: false })); }
  }

  async function handleDeleteAll() {
    setDeleting(d => ({ ...d, all: true }));
    try {
      await deleteAllStudentHistory(student.student_id);
      await loadHistory();
      if (onDeleteSession) onDeleteSession();
      setConfirmAll(false);
    } catch (e) { setError(e.message); }
    finally { setDeleting(d => ({ ...d, all: false })); }
  }

  const toggleExpand = (sid) => setExpanded(e => ({ ...e, [sid]: !e[sid] }));

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(10,15,30,0.55)",
      backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"white",borderRadius:16,width:"100%",maxWidth:680,
        maxHeight:"85vh",display:"flex",flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.18)",overflow:"hidden",
      }}>
        {/* Modal header */}
        <div style={{
          padding:"20px 24px",borderBottom:"1px solid var(--border-light)",
          display:"flex",alignItems:"center",gap:14,flexShrink:0,
        }}>
          <div style={{
            width:44,height:44,borderRadius:"50%",
            background:"rgba(61,122,95,0.1)",border:"2px solid rgba(61,122,95,0.25)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1rem",
            color:"var(--sage)",
          }}>
            {student.student_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:"1.1rem",color:"var(--navy)" }}>
              {student.student_name}
            </div>
            <div style={{ fontSize:"0.78rem",color:"var(--text-muted)" }}>
              Engagement History
            </div>
          </div>
          {history && history.sessions.length > 0 && !confirmAll && (
            <button
              onClick={() => setConfirmAll(true)}
              style={{
                display:"flex",alignItems:"center",gap:6,
                padding:"7px 13px",borderRadius:8,
                background:"rgba(192,57,43,0.07)",
                color:"var(--danger)",border:"1px solid rgba(192,57,43,0.15)",
                fontSize:"0.8rem",fontWeight:600,cursor:"pointer",
              }}>
              <Trash2 size={13}/> Clear All History
            </button>
          )}
          {confirmAll && (
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:"0.8rem",color:"var(--danger)",fontWeight:600 }}>Are you sure?</span>
              <button onClick={handleDeleteAll} disabled={deleting.all}
                style={{
                  padding:"6px 12px",borderRadius:7,
                  background:"var(--danger)",color:"white",
                  border:"none",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",
                }}>
                {deleting.all ? "Deleting..." : "Yes, Delete All"}
              </button>
              <button onClick={() => setConfirmAll(false)}
                style={{
                  padding:"6px 12px",borderRadius:7,background:"var(--bg)",
                  border:"1px solid var(--border)",fontSize:"0.8rem",cursor:"pointer",
                }}>
                Cancel
              </button>
            </div>
          )}
          <button onClick={onClose} style={{
            width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",
            justifyContent:"center",background:"var(--bg)",border:"1px solid var(--border)",
            cursor:"pointer",color:"var(--text-muted)",
          }}>
            <X size={15}/>
          </button>
        </div>

        {/* Modal body */}
        <div style={{ overflowY:"auto",flex:1,padding:"18px 24px" }}>
          {error && (
            <div style={{
              background:"rgba(192,57,43,0.07)",borderRadius:8,
              padding:"10px 14px",color:"var(--danger)",fontSize:"0.84rem",marginBottom:14,
            }}>
              {error}
            </div>
          )}
          {loading ? (
            <div style={{ textAlign:"center",padding:"40px",color:"var(--text-muted)" }}>
              Loading history...
            </div>
          ) : !history || history.sessions.length === 0 ? (
            <div style={{ textAlign:"center",padding:"40px" }}>
              <History size={32} style={{ margin:"0 auto 12px",opacity:0.2 }}/>
              <div style={{ fontSize:"0.95rem",color:"var(--text-muted)" }}>No history found</div>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {/* Summary row */}
              <div style={{
                display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:8,
              }}>
                {[
                  { label:"Total Sessions", value: history.total_sessions },
                  { label:"Total Cycles",   value: history.total_records },
                  { label:"Avg Score",      value: history.sessions.length
                      ? `${(history.sessions.reduce((s,x)=>s+x.avg_score,0)/history.sessions.length).toFixed(1)}%`
                      : "—"
                  },
                ].map((s,i) => (
                  <div key={i} style={{
                    background:"var(--bg)",borderRadius:10,padding:"12px 14px",textAlign:"center",
                  }}>
                    <div style={{ fontSize:"0.68rem",fontWeight:700,textTransform:"uppercase",
                      letterSpacing:"0.06em",color:"var(--text-muted)",marginBottom:4 }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.3rem",color:"var(--navy)" }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Session list */}
              {history.sessions.map(sess => {
                const isExp = expanded[sess.session_id];
                const isDel = deleting[sess.session_id];
                const chartData = sess.timeline.map((t,i) => ({ cycle:`C${i+1}`, score: t.score }));
                return (
                  <div key={sess.session_id} style={{
                    border:"1.5px solid var(--border-light)",borderRadius:12,overflow:"hidden",
                  }}>
                    {/* Session header */}
                    <div style={{
                      display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                      background:isExp?"rgba(61,122,95,0.03)":"white",cursor:"pointer",
                    }} onClick={() => toggleExpand(sess.session_id)}>
                      <ResultBadge label={sess.overall_label}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:"0.88rem",fontWeight:700,color:"var(--navy)" }}>
                          {sess.class_name}
                        </div>
                        <div style={{ fontSize:"0.75rem",color:"var(--text-muted)" }}>
                          {new Date(sess.start_time).toLocaleString()} · {sess.total_cycles} cycles
                        </div>
                      </div>
                      <div style={{
                        fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.1rem",
                        color:scoreColor(sess.avg_score),marginRight:4,
                      }}>
                        {sess.avg_score}%
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteSession(sess.session_id); }}
                        disabled={isDel}
                        style={{
                          display:"flex",alignItems:"center",gap:5,
                          padding:"6px 10px",borderRadius:7,
                          background:"rgba(192,57,43,0.07)",
                          color:"var(--danger)",border:"1px solid rgba(192,57,43,0.12)",
                          fontSize:"0.78rem",fontWeight:600,cursor:isDel?"not-allowed":"pointer",
                          opacity:isDel?0.5:1,
                        }}>
                        <Trash2 size={12}/>
                        {isDel ? "..." : "Clear"}
                      </button>
                      {isExp ? <ChevronUp size={15} color="var(--text-muted)"/> : <ChevronDown size={15} color="var(--text-muted)"/>}
                    </div>

                    {/* Expanded timeline */}
                    {isExp && (
                      <div style={{
                        borderTop:"1px solid var(--border-light)",
                        padding:"14px 16px",background:"var(--bg)",
                      }}>
                        {chartData.length > 1 && (
                          <ResponsiveContainer width="100%" height={130}>
                            <AreaChart data={chartData} margin={{ top:5,right:10,left:-30,bottom:0 }}>
                              <defs>
                                <linearGradient id={`grad-${sess.session_id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--sage)" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="var(--sage)" stopOpacity={0.02}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                              <XAxis dataKey="cycle" tick={{ fontSize:10,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                              <YAxis domain={[0,100]} tick={{ fontSize:10,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                              <Tooltip
                                contentStyle={{ background:"white",border:"1px solid var(--border)",borderRadius:8,fontSize:12 }}
                                formatter={v => [`${v?.toFixed(1)}%`,"Score"]}
                              />
                              <Area type="monotone" dataKey="score" stroke="var(--sage)" strokeWidth={2}
                                fill={`url(#grad-${sess.session_id})`} dot={{ r:3 }} activeDot={{ r:5 }}/>
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                        <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:10 }}>
                          {sess.timeline.map(t => (
                            <div key={t.record_id} style={{
                              padding:"5px 10px",borderRadius:8,fontSize:"0.78rem",fontWeight:600,
                              background:"white",border:`1.5px solid ${scoreColor(t.score)}33`,
                              color:scoreColor(t.score),
                            }}>
                              C{t.cycle}: {t.score}%
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ───────────────────────────────────────
export default function TeacherDashboard() {
  const user = getUser();

  const [classes,         setClasses]        = useState([]);
  const [selectedClass,   setSelectedClass]  = useState(null);
  const [newClassName,    setNewClassName]    = useState("");
  const [creating,        setCreating]        = useState(false);
  const [showCreate,      setShowCreate]      = useState(false);
  const [sessionActive,   setSessionActive]   = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [sessionStarting, setSessionStarting] = useState(false);
  const [sessionError,    setSessionError]    = useState("");
  const [sessionInfo,     setSessionInfo]     = useState(null);
  const [engagement,      setEngagement]      = useState(null);
  const [historyStudent,  setHistoryStudent]  = useState(null); // student to show history for
  const [lastUpdate,      setLastUpdate]      = useState(null);

  const sessionPollRef = useRef(null);
  const engagePollRef  = useRef(null);
  const selectedClsRef = useRef(null);
  const sessionInfoRef = useRef(null);

  useEffect(() => { selectedClsRef.current = selectedClass; }, [selectedClass]);
  useEffect(() => { sessionInfoRef.current = sessionInfo;   }, [sessionInfo]);

  const loadClasses = useCallback(async () => {
    try {
      const data = await getMyClasses();
      setClasses(data.classes || []);
      if (data.classes?.length && !selectedClsRef.current)
        setSelectedClass(data.classes[0]);
    } catch (e) { console.error(e.message); }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    clearInterval(sessionPollRef.current);
    clearInterval(engagePollRef.current);
    if (!selectedClass) return;

    async function pollSession() {
      try {
        const data = await getClassSessionStatus(selectedClass.class_id);
        setSessionActive(data.active);
        setSessionInfo(data.active ? data : null);
      } catch {}
    }

    async function pollEngagement() {
      try {
        const sid = sessionInfoRef.current?.session_id;
        const data = await getClassEngagement(selectedClass.class_id, sid);
        setEngagement(data);
        setLastUpdate(new Date());
      } catch {}
    }

    pollSession();
    pollEngagement();
    sessionPollRef.current = setInterval(pollSession,    3000);
    engagePollRef.current  = setInterval(pollEngagement, 5000);

    return () => {
      clearInterval(sessionPollRef.current);
      clearInterval(engagePollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    getClassEngagement(selectedClass.class_id, sessionInfo?.session_id)
      .then(d => { setEngagement(d); setLastUpdate(new Date()); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive]);

  async function handleCreateClass(e) {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setCreating(true);
    try {
      const data = await createClass(newClassName);
      setNewClassName(""); setShowCreate(false);
      await loadClasses();
      setSelectedClass({ class_id:data.class_id, class_name:data.class_name });
    } catch (err) { setSessionError(err.message); }
    finally       { setCreating(false); }
  }

  async function handleStartSession() {
    if (!selectedClass) return;
    setSessionStarting(true); setSessionError(""); setEngagement(null);
    try {
      await startClassSession(selectedClass.class_id, intervalMinutes);
      setSessionActive(true);
    } catch (err) { setSessionError(err.message); }
    finally       { setSessionStarting(false); }
  }

  async function handleStopSession() {
    if (!selectedClass) return;
    try {
      await stopClassSession(selectedClass.class_id);
      setSessionActive(false); setSessionInfo(null);
    } catch (err) { setSessionError(err.message); }
  }

  const summary  = engagement?.summary || [];
  const { data: chartData, students } = buildChartData(summary);
  const avgScore = summary.length
    ? (summary.reduce((s,x) => s + x.avg_score, 0) / summary.length).toFixed(1) : "—";
  const engagedN = summary.filter(s => s.avg_score >= 70).length;

  return (
    <div className="main-content">
      <Navbar/>
      <div className="page-body">

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28 }}>
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-desc">Manage classes and view real-time student engagement</p>
          </div>
          <span className="badge badge-primary">👨‍🏫 {user?.name}</span>
        </div>

        {sessionError && (
          <div style={{
            background:"rgba(192,57,43,0.07)",border:"1px solid rgba(192,57,43,0.2)",
            borderRadius:"var(--radius-sm)",padding:"11px 15px",
            color:"var(--danger)",fontSize:"0.85rem",marginBottom:20,
            display:"flex",alignItems:"center",gap:8,
          }}>
            <AlertCircle size={15}/> {sessionError}
          </div>
        )}

        <div style={{ display:"grid",gridTemplateColumns:"280px 1fr",gap:20,alignItems:"start" }}>

          {/* ── Class list ── */}
          <div className="card fade-up">
            <div className="card-header" style={{ marginBottom:14 }}>
              <div className="card-title" style={{ display:"flex",alignItems:"center",gap:8 }}>
                <BookOpen size={16} style={{ color:"var(--sage)" }}/> My Classes
              </div>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setShowCreate(v=>!v)} style={{ padding:"4px 8px" }}>
                <Plus size={14}/>
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreateClass} style={{ marginBottom:14 }}>
                <input className="form-input" placeholder="Class name"
                  value={newClassName} onChange={e => setNewClassName(e.target.value)}
                  style={{ marginBottom:8 }} autoFocus/>
                <button type="submit" className="btn btn-primary btn-full"
                  disabled={creating || !newClassName.trim()} style={{ fontSize:"0.84rem" }}>
                  {creating ? "Creating..." : "Create Class"}
                </button>
              </form>
            )}

            {classes.length === 0 ? (
              <div style={{ textAlign:"center",padding:"28px 12px",color:"var(--text-muted)",fontSize:"0.85rem" }}>
                <BookOpen size={28} style={{ margin:"0 auto 10px",opacity:0.2 }}/>
                No classes yet.<br/>Click + to create one.
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {classes.map(cls => (
                  <button key={cls.class_id}
                    onClick={() => { setSelectedClass(cls); setSessionError(""); }}
                    style={{
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"11px 14px",borderRadius:"var(--radius-sm)",
                      border:`1.5px solid ${selectedClass?.class_id===cls.class_id?"var(--navy)":"var(--border-light)"}`,
                      background:selectedClass?.class_id===cls.class_id?"rgba(15,31,61,0.04)":"transparent",
                      cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.15s",
                    }}>
                    <span style={{
                      fontSize:"0.88rem",fontWeight:600,
                      color:selectedClass?.class_id===cls.class_id?"var(--navy)":"var(--text-secondary)",
                    }}>
                      {cls.class_name}
                    </span>
                    <span style={{ fontSize:"0.72rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)" }}>
                      #{cls.class_id}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {!selectedClass ? (
              <div className="card fade-up" style={{
                textAlign:"center",padding:"64px 24px",
                background:"linear-gradient(160deg,#F8FAFF,#EEF2FF)",
              }}>
                <BookOpen size={36} style={{ margin:"0 auto 16px",opacity:0.2 }}/>
                <div style={{ fontFamily:"var(--font-display)",fontSize:"1.1rem",fontWeight:600,marginBottom:8 }}>
                  Select or create a class
                </div>
                <div style={{ fontSize:"0.88rem",color:"var(--text-muted)" }}>
                  Choose a class from the left to begin
                </div>
              </div>
            ) : (
              <>
                {/* Session control */}
                <div className="card fade-up">
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
                    <div>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:"1.2rem",color:"var(--navy)",marginBottom:3 }}>
                        {selectedClass.class_name}
                      </div>
                      <div style={{ fontSize:"0.78rem",color:"var(--text-muted)" }}>
                        ID: <span style={{ fontFamily:"var(--font-mono)" }}>#{selectedClass.class_id}</span>
                        {sessionInfo && <> · Session <span style={{ fontFamily:"var(--font-mono)" }}>#{sessionInfo.session_id}</span></>}
                      </div>
                    </div>
                    <StatusPill active={sessionActive}/>
                  </div>

                  {sessionActive && sessionInfo && (
                    <div style={{
                      background:"rgba(61,122,95,0.06)",border:"1px solid rgba(61,122,95,0.15)",
                      borderRadius:"var(--radius-sm)",padding:"12px 16px",marginBottom:18,
                      display:"flex",alignItems:"center",gap:12,
                    }}>
                      <Activity size={15} style={{ color:"var(--sage)",flexShrink:0 }}/>
                      <div style={{ fontSize:"0.84rem",fontWeight:600,color:"var(--sage)" }}>
                        Session live · started {new Date(sessionInfo.start_time).toLocaleTimeString()}
                        · {sessionInfo.interval_minutes} min interval
                      </div>
                      {lastUpdate && (
                        <span style={{ marginLeft:"auto",fontSize:"0.75rem",color:"var(--text-muted)" }}>
                          Updated {lastUpdate.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
                    <div style={{
                      display:"flex",alignItems:"center",gap:10,
                      background:"var(--bg)",borderRadius:"var(--radius-sm)",
                      padding:"9px 14px",opacity:sessionActive?0.5:1,
                    }}>
                      <Timer size={14} style={{ color:"var(--text-muted)" }}/>
                      <span style={{ fontSize:"0.84rem",color:"var(--text-secondary)",fontWeight:500 }}>Interval:</span>
                      <input type="number" min={1} max={60}
                        value={intervalMinutes}
                        onChange={e => setIntervalMinutes(Math.max(1,parseInt(e.target.value)||1))}
                        disabled={sessionActive}
                        style={{
                          width:50,padding:"5px 8px",
                          border:"1.5px solid var(--border)",borderRadius:"var(--radius-sm)",
                          fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.95rem",
                          color:"var(--navy)",textAlign:"center",outline:"none",
                          background:sessionActive?"var(--bg)":"white",
                        }}/>
                      <span style={{ fontSize:"0.84rem",color:"var(--text-muted)" }}>min</span>
                    </div>
                    <button className="btn btn-sage" onClick={handleStartSession}
                      disabled={sessionActive || sessionStarting} style={{ minWidth:144 }}>
                      {sessionStarting ? "Starting..." : <><Play size={14}/> Start Session</>}
                    </button>
                    <button className="btn btn-danger" onClick={handleStopSession} disabled={!sessionActive}>
                      <Square size={14}/> Stop Session
                    </button>
                  </div>
                </div>

                {/* Summary stat cards */}
                {summary.length > 0 && (
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
                    {[
                      { label:"Students Monitored", value:summary.length,                 icon:<Users size={15}/>,     color:"var(--navy)" },
                      { label:"Class Avg Score",    value:`${avgScore}%`,                 icon:<TrendingUp size={15}/>, color:scoreColor(parseFloat(avgScore)||0) },
                      { label:"Engaged Students",   value:`${engagedN}/${summary.length}`,icon:<Award size={15}/>,     color:"var(--sage)" },
                    ].map((s,i) => (
                      <div key={i} className="card" style={{ borderTop:`3px solid ${s.color}`,padding:"14px 16px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                          <span style={{ color:s.color }}>{s.icon}</span>
                          <span style={{ fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text-muted)" }}>
                            {s.label}
                          </span>
                        </div>
                        <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.5rem",color:s.color }}>
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline chart */}
                {chartData.length > 1 && students.length > 0 && (
                  <div className="card fade-up-2">
                    <div className="card-header" style={{ marginBottom:16 }}>
                      <div>
                        <div className="card-title">Engagement Timeline</div>
                        <div className="card-subtitle">Per-student scores across cycles</div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData} margin={{ top:5,right:20,left:-20,bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                        <XAxis dataKey="cycle" tick={{ fontSize:11,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                        <YAxis domain={[0,100]} tick={{ fontSize:11,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                        <Tooltip
                          contentStyle={{ background:"white",border:"1px solid var(--border)",borderRadius:8,fontSize:12 }}
                          formatter={(v,n) => [`${v?.toFixed(1)}%`, n]}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:"0.82rem" }}/>
                        {students.map((name,i) => (
                          <Line key={name} type="monotone" dataKey={name}
                            stroke={LINE_COLORS[i%LINE_COLORS.length]}
                            strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} connectNulls/>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Student table — ENHANCED with real-time ring + history button ── */}
                {summary.length > 0 ? (
                  <div className="card fade-up-3">
                    <div className="card-header" style={{ marginBottom:16 }}>
                      <div>
                        <div className="card-title">
                          <Users size={14} style={{ display:"inline",marginRight:7,color:"var(--sage)" }}/>
                          Student Engagement
                        </div>
                        <div className="card-subtitle">
                          {engagement?.total_records||0} records total · refreshes every 5s
                        </div>
                      </div>
                      {sessionActive && (
                        <div style={{
                          display:"flex",alignItems:"center",gap:6,
                          padding:"5px 12px",borderRadius:20,
                          background:"rgba(61,122,95,0.08)",fontSize:"0.78rem",fontWeight:700,
                          color:"var(--sage)",
                        }}>
                          <Zap size={12}/>LIVE
                        </div>
                      )}
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th style={{ textAlign:"center" }}>Attention</th>
                            <th>Avg Score</th>
                            <th style={{ textAlign:"center" }}>Cycles</th>
                            <th style={{ textAlign:"center" }}>Engaged</th>
                            <th>Result</th>
                            <th style={{ textAlign:"center" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.map((s,i) => {
                            const col = scoreColor(s.avg_score);
                            // latest attention = last timeline entry
                            const latestScore = s.timeline?.length
                              ? s.timeline[s.timeline.length - 1].score
                              : null;
                            return (
                              <tr key={s.student_id}>
                                <td>
                                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                    <div style={{
                                      width:32,height:32,borderRadius:"50%",flexShrink:0,
                                      background:`${LINE_COLORS[i%LINE_COLORS.length]}22`,
                                      border:`2px solid ${LINE_COLORS[i%LINE_COLORS.length]}55`,
                                      display:"flex",alignItems:"center",justifyContent:"center",
                                      fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.78rem",
                                      color:LINE_COLORS[i%LINE_COLORS.length],
                                    }}>
                                      {s.student_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight:600,fontSize:"0.88rem" }}>{s.student_name}</span>
                                  </div>
                                </td>

                                {/* ── Real-time attention ring ── */}
                                <td style={{ textAlign:"center" }}>
                                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                                    <AttentionRing score={latestScore} size={52}/>
                                    {s.timeline?.length > 0 && (
                                      <span style={{ fontSize:"0.68rem",color:"var(--text-muted)" }}>
                                        cycle {s.timeline[s.timeline.length-1].cycle}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td>
                                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                    <div style={{
                                      width:56,height:6,borderRadius:3,
                                      background:"var(--border)",flexShrink:0,overflow:"hidden",
                                    }}>
                                      <div style={{
                                        width:`${Math.min(s.avg_score,100)}%`,height:"100%",
                                        background:col,borderRadius:3,transition:"width 0.4s ease",
                                      }}/>
                                    </div>
                                    <strong style={{ color:col,fontFamily:"var(--font-display)",fontSize:"0.92rem" }}>
                                      {s.avg_score}%
                                    </strong>
                                  </div>
                                </td>

                                <td style={{ textAlign:"center",fontFamily:"var(--font-display)",fontWeight:700 }}>
                                  {s.total_cycles}
                                </td>

                                <td style={{ textAlign:"center" }}>
                                  <span style={{
                                    background:"rgba(61,122,95,0.1)",color:"var(--sage)",
                                    padding:"3px 10px",borderRadius:20,fontWeight:700,fontSize:"0.78rem",
                                  }}>
                                    {s.engaged_cycles}/{s.total_cycles}
                                  </span>
                                </td>

                                <td><ResultBadge label={s.overall_label}/></td>

                                {/* ── History & actions ── */}
                                <td style={{ textAlign:"center" }}>
                                  <button
                                    onClick={() => setHistoryStudent(s)}
                                    style={{
                                      display:"inline-flex",alignItems:"center",gap:5,
                                      padding:"6px 12px",borderRadius:8,
                                      background:"rgba(42,100,150,0.07)",
                                      color:"var(--navy)",border:"1px solid rgba(42,100,150,0.15)",
                                      fontSize:"0.78rem",fontWeight:600,cursor:"pointer",
                                    }}>
                                    <History size={12}/> History
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="card fade-up-2" style={{
                    textAlign:"center",padding:"40px 24px",
                    background:"linear-gradient(160deg,#F8FAFF,#EEF2FF)",
                  }}>
                    <Users size={32} style={{ margin:"0 auto 14px",opacity:0.18 }}/>
                    <div style={{ fontFamily:"var(--font-display)",fontWeight:600,fontSize:"1rem",marginBottom:8 }}>
                      {sessionActive ? "Waiting for students..." : "No data yet"}
                    </div>
                    <div style={{ fontSize:"0.85rem",color:"var(--text-muted)" }}>
                      {sessionActive
                        ? "Student scores will appear here as monitoring cycles complete"
                        : "Start a session to begin collecting engagement data"}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── History Modal ── */}
      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
          onDeleteSession={() => {
            // refresh engagement after delete
            if (selectedClass) {
              getClassEngagement(selectedClass.class_id, sessionInfo?.session_id)
                .then(setEngagement).catch(() => {});
            }
          }}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
