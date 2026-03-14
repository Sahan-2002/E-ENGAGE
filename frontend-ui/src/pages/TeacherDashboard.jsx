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
  Zap, Menu, ChevronLeft,
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

// ── Responsive hook ────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ── Real-time attention ring ───────────────────────────────────────
function AttentionRing({ score, size = 52 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - (score || 0) / 100);
  const col = scoreColor(score || 0);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
      />
      <text x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{
          fontSize: size < 50 ? "0.62rem" : "0.7rem",
          fontWeight: 800, fill: col,
          transform: "rotate(90deg)",
          transformOrigin: `${size/2}px ${size/2}px`,
          fontFamily: "var(--font-display)",
        }}>
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
      flexShrink:0,
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
      padding:"3px 9px",borderRadius:20,fontSize:"0.73rem",fontWeight:700,whiteSpace:"nowrap",
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
    summary.forEach(s => { if (s.timeline?.[i]) point[s.student_name] = s.timeline[i].score; });
    return point;
  });
  return { data, students: summary.map(s => s.student_name) };
}

// ── Student History Modal ──────────────────────────────────────────
function StudentHistoryModal({ student, onClose, onDeleteSession }) {
  const [history, setHistory]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [expanded, setExpanded]     = useState({});
  const [deleting, setDeleting]     = useState({});
  const [confirmAll, setConfirmAll] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true); setError("");
    try { setHistory(await getStudentHistory(student.student_id)); }
    catch (e) { setError(e.message); }
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

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(10,15,30,0.55)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:12,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"white",borderRadius:16,width:"100%",maxWidth:660,
        maxHeight:"92vh",display:"flex",flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.18)",overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"14px 18px",borderBottom:"1px solid var(--border-light)",
          display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap",
        }}>
          <div style={{
            width:38,height:38,borderRadius:"50%",flexShrink:0,
            background:"rgba(61,122,95,0.1)",border:"2px solid rgba(61,122,95,0.25)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:"var(--sage)",
          }}>
            {student.student_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:"1rem",color:"var(--navy)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {student.student_name}
            </div>
            <div style={{ fontSize:"0.74rem",color:"var(--text-muted)" }}>Engagement History</div>
          </div>
          {history?.sessions.length > 0 && !confirmAll && (
            <button onClick={() => setConfirmAll(true)} style={{
              display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:7,
              background:"rgba(192,57,43,0.07)",color:"var(--danger)",
              border:"1px solid rgba(192,57,43,0.15)",fontSize:"0.77rem",fontWeight:600,cursor:"pointer",flexShrink:0,
            }}>
              <Trash2 size={11}/> Clear All
            </button>
          )}
          {confirmAll && (
            <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.77rem",color:"var(--danger)",fontWeight:600 }}>Sure?</span>
              <button onClick={handleDeleteAll} disabled={deleting.all} style={{
                padding:"5px 10px",borderRadius:6,background:"var(--danger)",color:"white",
                border:"none",fontSize:"0.77rem",fontWeight:700,cursor:"pointer",
              }}>{deleting.all ? "..." : "Delete All"}</button>
              <button onClick={() => setConfirmAll(false)} style={{
                padding:"5px 10px",borderRadius:6,background:"var(--bg)",
                border:"1px solid var(--border)",fontSize:"0.77rem",cursor:"pointer",
              }}>Cancel</button>
            </div>
          )}
          <button onClick={onClose} style={{
            width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",
            justifyContent:"center",background:"var(--bg)",border:"1px solid var(--border)",
            cursor:"pointer",color:"var(--text-muted)",flexShrink:0,
          }}>
            <X size={13}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto",flex:1,padding:"14px 18px" }}>
          {error && <div style={{ background:"rgba(192,57,43,0.07)",borderRadius:8,padding:"9px 13px",color:"var(--danger)",fontSize:"0.83rem",marginBottom:12 }}>{error}</div>}
          {loading ? (
            <div style={{ textAlign:"center",padding:"36px",color:"var(--text-muted)" }}>Loading history...</div>
          ) : !history?.sessions.length ? (
            <div style={{ textAlign:"center",padding:"36px" }}>
              <History size={28} style={{ margin:"0 auto 10px",opacity:0.2 }}/>
              <div style={{ fontSize:"0.9rem",color:"var(--text-muted)" }}>No history found</div>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:6 }}>
                {[
                  { label:"Sessions", value: history.total_sessions },
                  { label:"Cycles",   value: history.total_records },
                  { label:"Avg Score",value: `${(history.sessions.reduce((s,x)=>s+x.avg_score,0)/history.sessions.length).toFixed(1)}%` },
                ].map((s,i) => (
                  <div key={i} style={{ background:"var(--bg)",borderRadius:10,padding:"10px 12px",textAlign:"center" }}>
                    <div style={{ fontSize:"0.64rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text-muted)",marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.15rem",color:"var(--navy)" }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {history.sessions.map(sess => {
                const isExp = expanded[sess.session_id];
                const isDel = deleting[sess.session_id];
                const cd = sess.timeline.map((t,i) => ({ cycle:`C${i+1}`, score:t.score }));
                return (
                  <div key={sess.session_id} style={{ border:"1.5px solid var(--border-light)",borderRadius:12,overflow:"hidden" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 14px",background:isExp?"rgba(61,122,95,0.03)":"white",cursor:"pointer",flexWrap:"wrap" }}
                      onClick={() => setExpanded(e => ({ ...e, [sess.session_id]: !e[sess.session_id] }))}>
                      <ResultBadge label={sess.overall_label}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:"0.85rem",fontWeight:700,color:"var(--navy)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sess.class_name}</div>
                        <div style={{ fontSize:"0.72rem",color:"var(--text-muted)" }}>{new Date(sess.start_time).toLocaleString()} · {sess.total_cycles} cycles</div>
                      </div>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1rem",color:scoreColor(sess.avg_score),flexShrink:0 }}>{sess.avg_score}%</div>
                      <button onClick={e => { e.stopPropagation(); handleDeleteSession(sess.session_id); }} disabled={isDel}
                        style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 9px",borderRadius:6,
                          background:"rgba(192,57,43,0.07)",color:"var(--danger)",border:"1px solid rgba(192,57,43,0.12)",
                          fontSize:"0.74rem",fontWeight:600,cursor:isDel?"not-allowed":"pointer",opacity:isDel?0.5:1,flexShrink:0 }}>
                        <Trash2 size={11}/>{isDel ? "..." : "Clear"}
                      </button>
                      {isExp ? <ChevronUp size={13} color="var(--text-muted)"/> : <ChevronDown size={13} color="var(--text-muted)"/>}
                    </div>
                    {isExp && (
                      <div style={{ borderTop:"1px solid var(--border-light)",padding:"12px 14px",background:"var(--bg)" }}>
                        {cd.length > 1 && (
                          <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={cd} margin={{ top:5,right:10,left:-30,bottom:0 }}>
                              <defs>
                                <linearGradient id={`g-${sess.session_id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--sage)" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="var(--sage)" stopOpacity={0.02}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                              <XAxis dataKey="cycle" tick={{ fontSize:10,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                              <YAxis domain={[0,100]} tick={{ fontSize:10,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                              <Tooltip contentStyle={{ background:"white",border:"1px solid var(--border)",borderRadius:8,fontSize:11 }} formatter={v=>[`${v?.toFixed(1)}%`,"Score"]}/>
                              <Area type="monotone" dataKey="score" stroke="var(--sage)" strokeWidth={2} fill={`url(#g-${sess.session_id})`} dot={{ r:2 }} activeDot={{ r:4 }}/>
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                        <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginTop:8 }}>
                          {sess.timeline.map(t => (
                            <div key={t.record_id} style={{
                              padding:"3px 8px",borderRadius:6,fontSize:"0.74rem",fontWeight:600,
                              background:"white",border:`1.5px solid ${scoreColor(t.score)}33`,color:scoreColor(t.score),
                            }}>C{t.cycle}: {t.score}%</div>
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

// ══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════
export default function TeacherDashboard() {
  const user = getUser();
  const windowWidth = useWindowWidth();

  // Breakpoints
  const isMobile  = windowWidth < 640;
  const isTablet  = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

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
  const [historyStudent,  setHistoryStudent]  = useState(null);
  const [lastUpdate,      setLastUpdate]      = useState(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);

  const sessionPollRef = useRef(null);
  const engagePollRef  = useRef(null);
  const selectedClsRef = useRef(null);
  const sessionInfoRef = useRef(null);

  useEffect(() => { selectedClsRef.current = selectedClass; }, [selectedClass]);
  useEffect(() => { sessionInfoRef.current = sessionInfo;   }, [sessionInfo]);
  useEffect(() => { if (isDesktop) setSidebarOpen(false);   }, [isDesktop]);

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

    pollSession(); pollEngagement();
    sessionPollRef.current = setInterval(pollSession,    3000);
    engagePollRef.current  = setInterval(pollEngagement, 5000);
    return () => { clearInterval(sessionPollRef.current); clearInterval(engagePollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    getClassEngagement(selectedClass.class_id, sessionInfo?.session_id)
      .then(d => { setEngagement(d); setLastUpdate(new Date()); }).catch(() => {});
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
      setSidebarOpen(false);
    } catch (err) { setSessionError(err.message); }
    finally       { setCreating(false); }
  }

  async function handleStartSession() {
    if (!selectedClass) return;
    setSessionStarting(true); setSessionError(""); setEngagement(null);
    try { await startClassSession(selectedClass.class_id, intervalMinutes); setSessionActive(true); }
    catch (err) { setSessionError(err.message); }
    finally     { setSessionStarting(false); }
  }

  async function handleStopSession() {
    if (!selectedClass) return;
    try { await stopClassSession(selectedClass.class_id); setSessionActive(false); setSessionInfo(null); }
    catch (err) { setSessionError(err.message); }
  }

  const summary  = engagement?.summary || [];
  const { data: chartData, students } = buildChartData(summary);
  const avgScore = summary.length
    ? (summary.reduce((s,x) => s + x.avg_score, 0) / summary.length).toFixed(1) : "—";
  const activeDominantN = summary.filter(
    s => (s.active_cycles||0) >= Math.max(s.passive_cycles||0, s.disengaged_cycles||0)
  ).length;

  // ── Reusable class list ────────────────────────────────────────
  const ClassListContent = () => (
    <>
      <div className="card-header" style={{ marginBottom:12 }}>
        <div className="card-title" style={{ display:"flex",alignItems:"center",gap:7 }}>
          <BookOpen size={14} style={{ color:"var(--sage)" }}/> My Classes
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(v=>!v)} style={{ padding:"3px 7px" }}>
          <Plus size={13}/>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateClass} style={{ marginBottom:12 }}>
          <input className="form-input" placeholder="Class name"
            value={newClassName} onChange={e => setNewClassName(e.target.value)}
            style={{ marginBottom:7 }} autoFocus/>
          <button type="submit" className="btn btn-primary btn-full"
            disabled={creating || !newClassName.trim()} style={{ fontSize:"0.83rem" }}>
            {creating ? "Creating..." : "Create Class"}
          </button>
        </form>
      )}

      {classes.length === 0 ? (
        <div style={{ textAlign:"center",padding:"22px 10px",color:"var(--text-muted)",fontSize:"0.84rem" }}>
          <BookOpen size={22} style={{ margin:"0 auto 8px",opacity:0.2 }}/>
          No classes yet.<br/>Click + to create one.
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
          {classes.map(cls => (
            <button key={cls.class_id}
              onClick={() => { setSelectedClass(cls); setSessionError(""); setSidebarOpen(false); }}
              style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"10px 13px",borderRadius:"var(--radius-sm)",
                border:`1.5px solid ${selectedClass?.class_id===cls.class_id?"var(--navy)":"var(--border-light)"}`,
                background:selectedClass?.class_id===cls.class_id?"rgba(15,31,61,0.04)":"transparent",
                cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.15s",
              }}>
              <span style={{ fontSize:"0.87rem",fontWeight:600,color:selectedClass?.class_id===cls.class_id?"var(--navy)":"var(--text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0 }}>
                {cls.class_name}
              </span>
              <span style={{ fontSize:"0.7rem",color:"var(--text-muted)",fontFamily:"var(--font-mono)",flexShrink:0,marginLeft:8 }}>
                #{cls.class_id}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  // ── Student row (table) or card (mobile) ───────────────────────
  const StudentItem = ({ s, i }) => {
    const col = scoreColor(s.avg_score);
    const latestScore = s.timeline?.length ? s.timeline[s.timeline.length-1].score : null;

    if (isMobile) {
      return (
        <div style={{ padding:"14px 16px",borderBottom:"1px solid var(--border-light)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
            <div style={{
              width:36,height:36,borderRadius:"50%",flexShrink:0,
              background:`${LINE_COLORS[i%LINE_COLORS.length]}22`,
              border:`2px solid ${LINE_COLORS[i%LINE_COLORS.length]}55`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.77rem",
              color:LINE_COLORS[i%LINE_COLORS.length],
            }}>
              {s.student_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,fontSize:"0.88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.student_name}</div>
              <ResultBadge label={s.overall_label}/>
            </div>
            <AttentionRing score={latestScore} size={44}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:9 }}>
            {[
              { label:"Avg",   value:`${s.avg_score}%`,    color:col },
              { label:"Active",value:s.active_cycles,      color:"var(--sage)" },
              { label:"Pass",  value:s.passive_cycles,     color:"var(--gold)" },
              { label:"Diseng",value:s.disengaged_cycles,  color:"var(--danger)" },
            ].map((stat,j) => (
              <div key={j} style={{ textAlign:"center",background:"var(--bg)",borderRadius:7,padding:"5px 3px" }}>
                <div style={{ fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",color:"var(--text-muted)",marginBottom:1 }}>{stat.label}</div>
                <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.87rem",color:stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setHistoryStudent(s)} style={{
            display:"flex",alignItems:"center",gap:5,width:"100%",justifyContent:"center",
            padding:"7px",borderRadius:8,background:"rgba(42,100,150,0.07)",
            color:"var(--navy)",border:"1px solid rgba(42,100,150,0.15)",
            fontSize:"0.8rem",fontWeight:600,cursor:"pointer",
          }}>
            <History size={12}/> View History
          </button>
        </div>
      );
    }

    // Tablet & Desktop table row
    return (
      <tr>
        <td>
          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
            <div style={{
              width:30,height:30,borderRadius:"50%",flexShrink:0,
              background:`${LINE_COLORS[i%LINE_COLORS.length]}22`,
              border:`2px solid ${LINE_COLORS[i%LINE_COLORS.length]}55`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.74rem",
              color:LINE_COLORS[i%LINE_COLORS.length],
            }}>
              {s.student_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <span style={{ fontWeight:600,fontSize:"0.86rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:isTablet?100:180 }}>
              {s.student_name}
            </span>
          </div>
        </td>
        <td style={{ textAlign:"center" }}>
          <AttentionRing score={latestScore} size={isTablet?40:48}/>
        </td>
        <td>
          <div style={{ display:"flex",alignItems:"center",gap:7 }}>
            <div style={{ width:isTablet?36:52,height:5,borderRadius:3,background:"var(--border)",flexShrink:0,overflow:"hidden" }}>
              <div style={{ width:`${Math.min(s.avg_score,100)}%`,height:"100%",background:col,borderRadius:3 }}/>
            </div>
            <strong style={{ color:col,fontFamily:"var(--font-display)",fontSize:"0.88rem" }}>{s.avg_score}%</strong>
          </div>
        </td>
        <td style={{ textAlign:"center",fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.88rem" }}>{s.total_cycles}</td>
        <td style={{ textAlign:"center" }}>
          <span style={{ background:"rgba(61,122,95,0.1)",color:"var(--sage)",padding:"2px 7px",borderRadius:16,fontWeight:700,fontSize:"0.74rem" }}>
            {s.active_cycles}/{s.total_cycles}
          </span>
        </td>
        {!isTablet && (
          <td style={{ textAlign:"center" }}>
            <span style={{ background:"rgba(201,150,58,0.1)",color:"var(--gold)",padding:"2px 7px",borderRadius:16,fontWeight:700,fontSize:"0.74rem" }}>
              {s.passive_cycles}/{s.total_cycles}
            </span>
          </td>
        )}
        <td style={{ textAlign:"center" }}>
          <span style={{ background:"rgba(192,57,43,0.08)",color:"var(--danger)",padding:"2px 7px",borderRadius:16,fontWeight:700,fontSize:"0.74rem" }}>
            {s.disengaged_cycles}/{s.total_cycles}
          </span>
        </td>
        <td><ResultBadge label={s.overall_label}/></td>
        <td style={{ textAlign:"center" }}>
          <button onClick={() => setHistoryStudent(s)} style={{
            display:"inline-flex",alignItems:"center",gap:4,
            padding:"5px 9px",borderRadius:7,
            background:"rgba(42,100,150,0.07)",color:"var(--navy)",
            border:"1px solid rgba(42,100,150,0.15)",
            fontSize:"0.74rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",
          }}>
            <History size={11}/> History
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="main-content">
      <Navbar/>
      <div className="page-body">

        {/* ── Page header ── */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,gap:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}>
            {!isDesktop && (
              <button onClick={() => setSidebarOpen(v=>!v)} style={{
                width:34,height:34,borderRadius:8,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:"var(--bg)",border:"1px solid var(--border)",
                cursor:"pointer",color:"var(--text-secondary)",
              }}>
                {sidebarOpen ? <ChevronLeft size={17}/> : <Menu size={17}/>}
              </button>
            )}
            <div style={{ minWidth:0 }}>
              <h1 className="page-title" style={{ fontSize:isMobile?"1.45rem":isTablet?"1.7rem":"2rem" }}>
                Teacher Dashboard
              </h1>
              {!isMobile && <p className="page-desc">Manage classes and view real-time student engagement</p>}
            </div>
          </div>
          <span className="badge badge-primary" style={{ flexShrink:0,fontSize:"0.72rem" }}>
            👨‍🏫 {isMobile ? (user?.name?.split(" ")[0] || "") : user?.name}
          </span>
        </div>

        {sessionError && (
          <div style={{
            background:"rgba(192,57,43,0.07)",border:"1px solid rgba(192,57,43,0.2)",
            borderRadius:"var(--radius-sm)",padding:"10px 14px",
            color:"var(--danger)",fontSize:"0.84rem",marginBottom:16,
            display:"flex",alignItems:"center",gap:7,
          }}>
            <AlertCircle size={14}/> {sessionError}
          </div>
        )}

        {/* ── Mobile / Tablet sidebar drawer ── */}
        {!isDesktop && sidebarOpen && (
          <div style={{
            position:"fixed",inset:0,zIndex:200,
            background:"rgba(10,15,30,0.4)",backdropFilter:"blur(2px)",
          }} onClick={() => setSidebarOpen(false)}>
            <div style={{
              position:"absolute",left:0,top:0,bottom:0,
              width:Math.min(290, windowWidth * 0.8),
              background:"white",padding:18,overflowY:"auto",
              boxShadow:"4px 0 28px rgba(0,0,0,0.14)",
            }} onClick={e => e.stopPropagation()}>
              <ClassListContent/>
            </div>
          </div>
        )}

        {/* ── Main layout: desktop = sidebar + content, others = stacked ── */}
        <div style={{
          display: isDesktop ? "grid" : "flex",
          gridTemplateColumns: isDesktop ? "240px 1fr" : undefined,
          flexDirection: "column",
          gap: 16,
          alignItems: "start",
          minWidth: 0,
        }}>

          {/* Desktop sidebar */}
          {isDesktop && (
            <div className="card fade-up" style={{ position:"sticky",top:76 }}>
              <ClassListContent/>
            </div>
          )}

          {/* Right content */}
          <div style={{ display:"flex",flexDirection:"column",gap:14,minWidth:0,width:"100%" }}>
            {!selectedClass ? (
              <div className="card fade-up" style={{
                textAlign:"center",padding:"52px 24px",
                background:"linear-gradient(160deg,#F8FAFF,#EEF2FF)",
              }}>
                <BookOpen size={30} style={{ margin:"0 auto 14px",opacity:0.2 }}/>
                <div style={{ fontFamily:"var(--font-display)",fontSize:"1rem",fontWeight:600,marginBottom:6 }}>
                  {isDesktop ? "Select or create a class" : "Tap ☰ to select a class"}
                </div>
                <div style={{ fontSize:"0.86rem",color:"var(--text-muted)" }}>
                  {isDesktop ? "Choose a class from the left to begin" : "Use the menu button to choose a class"}
                </div>
              </div>
            ) : (
              <>
                {/* Session control */}
                <div className="card fade-up">
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,gap:8 }}>
                    <div style={{ minWidth:0,flex:1 }}>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:isMobile?"0.98rem":"1.12rem",color:"var(--navy)",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {selectedClass.class_name}
                      </div>
                      <div style={{ fontSize:"0.73rem",color:"var(--text-muted)" }}>
                        ID: <span style={{ fontFamily:"var(--font-mono)" }}>#{selectedClass.class_id}</span>
                        {sessionInfo && !isMobile && <> · Session <span style={{ fontFamily:"var(--font-mono)" }}>#{sessionInfo.session_id}</span></>}
                      </div>
                    </div>
                    <StatusPill active={sessionActive}/>
                  </div>

                  {sessionActive && sessionInfo && (
                    <div style={{
                      background:"rgba(61,122,95,0.06)",border:"1px solid rgba(61,122,95,0.15)",
                      borderRadius:"var(--radius-sm)",padding:"9px 13px",marginBottom:13,
                      display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                    }}>
                      <Activity size={13} style={{ color:"var(--sage)",flexShrink:0 }}/>
                      <div style={{ fontSize:"0.81rem",fontWeight:600,color:"var(--sage)",flex:1,minWidth:0 }}>
                        Session live · {new Date(sessionInfo.start_time).toLocaleTimeString()}
                        {!isMobile && ` · ${sessionInfo.interval_minutes}m interval`}
                      </div>
                      {lastUpdate && (
                        <span style={{ fontSize:"0.7rem",color:"var(--text-muted)",flexShrink:0 }}>
                          {lastUpdate.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                    <div style={{
                      display:"flex",alignItems:"center",gap:7,
                      background:"var(--bg)",borderRadius:"var(--radius-sm)",
                      padding:"7px 11px",opacity:sessionActive?0.5:1,flexShrink:0,
                    }}>
                      <Timer size={13} style={{ color:"var(--text-muted)" }}/>
                      <span style={{ fontSize:"0.81rem",color:"var(--text-secondary)",fontWeight:500 }}>Interval:</span>
                      <input type="number" min={1} max={60} value={intervalMinutes}
                        onChange={e => setIntervalMinutes(Math.max(1,parseInt(e.target.value)||1))}
                        disabled={sessionActive}
                        style={{
                          width:44,padding:"4px 5px",border:"1.5px solid var(--border)",
                          borderRadius:"var(--radius-sm)",fontFamily:"var(--font-display)",
                          fontWeight:700,fontSize:"0.9rem",color:"var(--navy)",
                          textAlign:"center",outline:"none",
                          background:sessionActive?"var(--bg)":"white",
                        }}/>
                      <span style={{ fontSize:"0.81rem",color:"var(--text-muted)" }}>min</span>
                    </div>
                    <button className="btn btn-sage" onClick={handleStartSession}
                      disabled={sessionActive||sessionStarting}
                      style={{ flex:isMobile?"1":"none",minWidth:isMobile?0:120 }}>
                      {sessionStarting?"Starting...":<><Play size={13}/>Start</>}
                    </button>
                    <button className="btn btn-danger" onClick={handleStopSession}
                      disabled={!sessionActive}
                      style={{ flex:isMobile?"1":"none" }}>
                      <Square size={13}/> Stop
                    </button>
                  </div>
                </div>

                {/* Stat cards */}
                {summary.length > 0 && (
                  <div style={{
                    display:"grid",
                    gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)",
                    gap:10,
                  }}>
                    {[
                      { label:"Students",  value:summary.length,                        icon:<Users size={13}/>,      color:"var(--navy)" },
                      { label:"Class Avg", value:`${avgScore}%`,                        icon:<TrendingUp size={13}/>, color:scoreColor(parseFloat(avgScore)||0) },
                      { label:"Active",    value:`${activeDominantN}/${summary.length}`,icon:<Award size={13}/>,      color:"var(--sage)" },
                    ].map((s,i) => (
                      <div key={i} className="card" style={{
                        borderTop:`3px solid ${s.color}`,padding:"11px 13px",
                        gridColumn:isMobile&&i===2?"1 / -1":undefined,
                      }}>
                        <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:5 }}>
                          <span style={{ color:s.color }}>{s.icon}</span>
                          <span style={{ fontSize:"0.67rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--text-muted)" }}>{s.label}</span>
                        </div>
                        <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.35rem",color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline chart */}
                {chartData.length > 1 && students.length > 0 && (
                  <div className="card fade-up-2" style={{ minWidth:0,overflow:"hidden" }}>
                    <div className="card-header" style={{ marginBottom:12 }}>
                      <div>
                        <div className="card-title">Engagement Timeline</div>
                        <div className="card-subtitle">Per-student scores across cycles</div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={isMobile?150:210}>
                      <LineChart data={chartData} margin={{ top:4,right:8,left:-28,bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                        <XAxis dataKey="cycle" tick={{ fontSize:10,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                        <YAxis domain={[0,100]} tick={{ fontSize:10,fill:"var(--text-muted)" }} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{ background:"white",border:"1px solid var(--border)",borderRadius:8,fontSize:11 }} formatter={(v,n) => [`${v?.toFixed(1)}%`,n]}/>
                        {!isMobile && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:"0.76rem" }}/>}
                        {students.map((name,i) => (
                          <Line key={name} type="monotone" dataKey={name}
                            stroke={LINE_COLORS[i%LINE_COLORS.length]}
                            strokeWidth={2} dot={{ r:2 }} activeDot={{ r:4 }} connectNulls/>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Student engagement */}
                {summary.length > 0 ? (
                  <div className="card fade-up-3" style={{ minWidth:0,overflow:"hidden" }}>
                    <div className="card-header" style={{ marginBottom:12 }}>
                      <div>
                        <div className="card-title">
                          <Users size={13} style={{ display:"inline",marginRight:6,color:"var(--sage)" }}/>
                          Student Engagement
                        </div>
                        <div className="card-subtitle">{engagement?.total_records||0} records · refreshes every 5s</div>
                      </div>
                      {sessionActive && (
                        <div style={{
                          display:"flex",alignItems:"center",gap:5,padding:"4px 10px",
                          borderRadius:20,background:"rgba(61,122,95,0.08)",
                          fontSize:"0.73rem",fontWeight:700,color:"var(--sage)",flexShrink:0,
                        }}>
                          <Zap size={11}/>LIVE
                        </div>
                      )}
                    </div>

                    {isMobile ? (
                      <div style={{ margin:"0 -24px" }}>
                        {summary.map((s,i) => <StudentItem key={s.student_id} s={s} i={i}/>)}
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th style={{ textAlign:"center" }}>Attention</th>
                              <th>Avg Score</th>
                              <th style={{ textAlign:"center" }}>Cycles</th>
                              <th style={{ textAlign:"center" }}>Active</th>
                              {!isTablet && <th style={{ textAlign:"center" }}>Passive</th>}
                              <th style={{ textAlign:"center" }}>Disengaged</th>
                              <th>Result</th>
                              <th style={{ textAlign:"center" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.map((s,i) => <StudentItem key={s.student_id} s={s} i={i}/>)}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card fade-up-2" style={{
                    textAlign:"center",padding:"36px 20px",
                    background:"linear-gradient(160deg,#F8FAFF,#EEF2FF)",
                  }}>
                    <Users size={26} style={{ margin:"0 auto 10px",opacity:0.18 }}/>
                    <div style={{ fontFamily:"var(--font-display)",fontWeight:600,fontSize:"0.93rem",marginBottom:5 }}>
                      {sessionActive ? "Waiting for students..." : "No data yet"}
                    </div>
                    <div style={{ fontSize:"0.83rem",color:"var(--text-muted)" }}>
                      {sessionActive ? "Scores appear after each monitoring cycle" : "Start a session to begin collecting data"}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
          onDeleteSession={() => {
            if (selectedClass)
              getClassEngagement(selectedClass.class_id, sessionInfo?.session_id)
                .then(setEngagement).catch(() => {});
          }}
        />
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
