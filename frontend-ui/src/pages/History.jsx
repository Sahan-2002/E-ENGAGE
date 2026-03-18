import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import { getUser, isTeacher } from "../services/auth";
import {
  getMyClasses,
  getClassEngagement,
  getStudentEngagement,
} from "../services/api";
import { Download, RefreshCw, TrendingUp, Award, Clock, Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

function scoreColor(score) {
  const n = parseFloat(score);
  return n >= 70 ? "var(--success)" : n >= 50 ? "var(--warning)" : "var(--danger)";
}

function ResultBadge({ label }) {
  const cfg = {
    "Highly Engaged":     { bg: "rgba(16,185,129,0.12)", color: "var(--success)" },
    "Moderately Engaged": { bg: "rgba(245,158,11,0.12)",  color: "var(--warning)" },
    "Disengaged":         { bg: "rgba(239,68,68,0.12)",   color: "var(--danger)"  },
  }[label] || { bg: "rgba(148,163,184,0.12)", color: "var(--text-muted)" };

  return (
    <span style={{
      display: "inline-block",
      background: cfg.bg, color: cfg.color,
      padding: "4px 10px", borderRadius: 20,
      fontSize: "0.76rem", fontWeight: 700,
    }}>
      {label}
    </span>
  );
}

// ─── TEACHER VIEW ──────────────────────────────────────────────────────────────
function TeacherHistory() {
  const [classes,        setClasses]        = useState([]);
  const [selectedClass,  setSelectedClass]  = useState(null);
  const [summary,        setSummary]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  // Load teacher's classes once
  useEffect(() => {
    getMyClasses()
      .then(d => {
        const cls = d.classes || [];
        setClasses(cls);
        if (cls.length) setSelectedClass(cls[0]);
        else setLoading(false);
      })
      .catch(() => { setError("Could not load classes."); setLoading(false); });
  }, []);

  const loadEngagement = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getClassEngagement(selectedClass.class_id);
      setSummary(data.summary || []);
    } catch {
      setError("Could not load engagement data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => { loadEngagement(); }, [loadEngagement]);

  // Build "sessions" view: flatten all student timelines into per-student summary rows
  const totalStudents  = summary.length;
  const avgOverall     = totalStudents > 0
    ? (summary.reduce((s, r) => s + r.avg_score, 0) / totalStudents).toFixed(1)
    : "—";
  const bestStudent    = summary.length
    ? summary.reduce((b, r) => r.avg_score > b.avg_score ? r : b)
    : null;
  const activeStudents = summary.filter(r => r.overall_label === "Highly Engaged").length;

  const chartData = [...summary].reverse().map((r, i) => ({
    label: r.student_name.split(" ")[0],
    score: r.avg_score,
  }));

  function exportCSV() {
    if (!summary.length) return;
    const headers = ["Student","Avg Score","Total Cycles","Active","Passive","Disengaged","Overall"];
    const rows = summary.map(r =>
      [r.student_name, r.avg_score, r.total_cycles,
       r.active_cycles, r.passive_cycles, r.disengaged_cycles, r.overall_label]
        .map(v => `"${v}"`).join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `eengage-class-${selectedClass?.class_name}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 className="page-title">Session History</h1>
          <p className="page-desc">All recorded monitoring sessions</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {classes.length > 1 && (
            <select
              value={selectedClass?.class_id || ""}
              onChange={e => setSelectedClass(classes.find(c => c.class_id === parseInt(e.target.value)))}
              style={{ padding:"6px 12px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)",
                background:"var(--bg-card)", color:"var(--text-primary)", fontSize:"0.85rem", fontFamily:"var(--font-body)" }}
            >
              {classes.map(c => (
                <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
              ))}
            </select>
          )}
          <button className="btn btn-ghost btn-sm" onClick={loadEngagement} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={!summary.length}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:"var(--radius-sm)", padding:"12px 16px", color:"var(--danger)",
          fontSize:"0.85rem", marginBottom:20 }}>{error}</div>
      )}

      {!loading && summary.length > 0 && (
        <div className="grid-4" style={{ marginBottom:20 }}>
          {[
            { label:"Students Tracked", value:totalStudents,       icon:<Activity size={18}/>,  color:"var(--primary)" },
            { label:"Class Avg Score",  value:`${avgOverall}%`,    icon:<TrendingUp size={18}/>, color: parseFloat(avgOverall)>=70?"var(--success)":parseFloat(avgOverall)>=50?"var(--warning)":"var(--danger)" },
            { label:"Highly Engaged",   value:`${activeStudents} / ${totalStudents}`, icon:<Award size={18}/>, color:"var(--success)" },
            { label:"Top Student",      value:bestStudent?.student_name?.split(" ")[0] || "—", icon:<Clock size={18}/>, color:"var(--accent)" },
          ].map((s, i) => (
            <div key={i} className="card fade-up" style={{ borderTop:`3px solid ${s.color}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ color:s.color }}>{s.icon}</span>
                <span style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:"var(--text-muted)" }}>{s.label}</span>
              </div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.4rem", color:s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {chartData.length > 1 && (
        <div className="card fade-up" style={{ marginBottom:20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Engagement by Student</div>
              <div className="card-subtitle">Average score per student (highest → lowest)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top:5, right:20, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="lineGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--accent)"  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize:11, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:"white", border:"1px solid var(--border)", borderRadius:8, fontSize:12 }}
                formatter={(val) => [`${val.toFixed(1)}%`, "Avg Score"]}
              />
              <ReferenceLine y={70} stroke="var(--success)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={50} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Line type="monotone" dataKey="score" stroke="url(#lineGrad2)" strokeWidth={2.5}
                dot={{ r:4, fill:"var(--primary)", strokeWidth:0 }} activeDot={{ r:6 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:16, justifyContent:"flex-end", marginTop:8, fontSize:"0.75rem", color:"var(--text-muted)" }}>
            <span style={{ color:"var(--success)" }}>— Engaged threshold (70%)</span>
            <span style={{ color:"var(--warning)" }}>— Moderate threshold (50%)</span>
          </div>
        </div>
      )}

      <div className="card fade-up-2">
        <div className="card-header">
          <div className="card-title">
            {loading ? "Loading..." : `${summary.length} Student${summary.length !== 1 ? "s" : ""} Recorded`}
            {selectedClass && !loading && (
              <span style={{ marginLeft:10, fontSize:"0.8rem", fontWeight:400, color:"var(--text-muted)" }}>
                — {selectedClass.class_name}
              </span>
            )}
          </div>
        </div>

        {!loading && summary.length === 0 && (
          <div style={{ textAlign:"center", padding:"56px 24px", color:"var(--text-muted)" }}>
            <Activity size={36} style={{ margin:"0 auto 14px", opacity:0.25 }} />
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1rem", marginBottom:8 }}>No Sessions Yet</div>
            <div style={{ fontSize:"0.88rem" }}>Start a monitoring session from the Dashboard to record your first session.</div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign:"center", padding:"48px 24px", color:"var(--text-muted)", fontSize:"0.88rem" }}>
            <RefreshCw size={24} className="spin" style={{ margin:"0 auto 12px" }} />
            Loading sessions...
          </div>
        )}

        {!loading && summary.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Total Cycles</th>
                  <th>Avg Score</th>
                  <th>Active</th>
                  <th>Passive</th>
                  <th>Disengaged</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r, i) => {
                  const color = scoreColor(r.avg_score);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight:600, color:"var(--text-primary)" }}>{r.student_name}</td>
                      <td style={{ textAlign:"center" }}>
                        <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.95rem" }}>{r.total_cycles}</span>
                      </td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div className="progress-bar" style={{ width:72, flex:"none" }}>
                            <div className="progress-fill" style={{ width:`${Math.min(r.avg_score,100)}%`, background:color }} />
                          </div>
                          <strong style={{ color, fontFamily:"var(--font-display)", fontSize:"0.9rem" }}>{r.avg_score.toFixed(1)}%</strong>
                        </div>
                      </td>
                      <td style={{ textAlign:"center" }}><span style={{ background:"rgba(16,185,129,0.1)", color:"var(--success)", padding:"3px 10px", borderRadius:20, fontWeight:700, fontSize:"0.82rem" }}>{r.active_cycles}</span></td>
                      <td style={{ textAlign:"center" }}><span style={{ background:"rgba(245,158,11,0.1)",  color:"var(--warning)", padding:"3px 10px", borderRadius:20, fontWeight:700, fontSize:"0.82rem" }}>{r.passive_cycles}</span></td>
                      <td style={{ textAlign:"center" }}><span style={{ background:"rgba(239,68,68,0.1)",   color:"var(--danger)",  padding:"3px 10px", borderRadius:20, fontWeight:700, fontSize:"0.82rem" }}>{r.disengaged_cycles}</span></td>
                      <td><ResultBadge label={r.overall_label} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── STUDENT VIEW ──────────────────────────────────────────────────────────────
function StudentHistory() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentEngagement();
      setRecords(data.records || []);
    } catch {
      setError("Could not load history. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Group records by session_id
  const sessionMap = {};
  for (const r of records) {
    if (!sessionMap[r.session_id]) sessionMap[r.session_id] = [];
    sessionMap[r.session_id].push(r);
  }

  const sessions = Object.entries(sessionMap).map(([sid, recs]) => {
    const scores      = recs.map(r => r.engagement_score);
    const avg         = scores.reduce((a, b) => a + b, 0) / scores.length;
    const active      = recs.filter(r => r.label === "Active Engagement").length;
    const passive     = recs.filter(r => r.label === "Passive Engagement").length;
    const disengaged  = recs.filter(r => r.label === "Disengaged").length;
    const overall     = avg >= 70 ? "Highly Engaged" : avg >= 50 ? "Moderately Engaged" : "Disengaged";
    const firstTs     = recs[0]?.timestamp || "";
    const date        = firstTs ? new Date(firstTs).toLocaleDateString() : "—";
    const time        = firstTs ? new Date(firstTs).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—";
    return { session_id: parseInt(sid), avg_score: parseFloat(avg.toFixed(1)),
             total_cycles: recs.length, active_cycles: active, passive_cycles: passive,
             disengaged_cycles: disengaged, overall_label: overall, date, time };
  }).sort((a, b) => b.session_id - a.session_id);

  const totalSessions  = sessions.length;
  const avgOverall     = totalSessions > 0
    ? (sessions.reduce((s, r) => s + r.avg_score, 0) / totalSessions).toFixed(1)
    : "—";
  const bestSession    = sessions.length ? sessions.reduce((b, r) => r.avg_score > b.avg_score ? r : b) : null;
  const activeLed      = sessions.filter(s => s.active_cycles >= Math.max(s.passive_cycles, s.disengaged_cycles)).length;

  const chartData = [...sessions].reverse().map((s, i) => ({
    label: `#${i + 1}`, score: s.avg_score,
  }));

  function exportCSV() {
    if (!sessions.length) return;
    const headers = ["Session ID","Date","Time","Cycles","Avg Score","Active","Passive","Disengaged","Result"];
    const rows = sessions.map(s =>
      [s.session_id, s.date, s.time, s.total_cycles, s.avg_score,
       s.active_cycles, s.passive_cycles, s.disengaged_cycles, s.overall_label]
        .map(v => `"${v}"`).join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `eengage-history-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 className="page-title">Session History</h1>
          <p className="page-desc">Your personal attention history</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadHistory} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={!sessions.length}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
          borderRadius:"var(--radius-sm)", padding:"12px 16px", color:"var(--danger)",
          fontSize:"0.85rem", marginBottom:20 }}>{error}</div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="grid-4" style={{ marginBottom:20 }}>
          {[
            { label:"Total Sessions",  value:totalSessions,   icon:<Activity size={18}/>,   color:"var(--primary)" },
            { label:"Average Score",   value:`${avgOverall}%`, icon:<TrendingUp size={18}/>, color:parseFloat(avgOverall)>=70?"var(--success)":parseFloat(avgOverall)>=50?"var(--warning)":"var(--danger)" },
            { label:"Active Sessions", value:`${activeLed} / ${totalSessions}`, icon:<Award size={18}/>, color:"var(--success)" },
            { label:"Best Score",      value:bestSession ? `${bestSession.avg_score.toFixed(1)}%` : "—", icon:<Clock size={18}/>, color:"var(--accent)" },
          ].map((s, i) => (
            <div key={i} className="card fade-up" style={{ borderTop:`3px solid ${s.color}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ color:s.color }}>{s.icon}</span>
                <span style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:"var(--text-muted)" }}>{s.label}</span>
              </div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.4rem", color:s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {chartData.length > 1 && (
        <div className="card fade-up" style={{ marginBottom:20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Engagement Trend</div>
              <div className="card-subtitle">Average score across all sessions (oldest → newest)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top:5, right:20, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="lineGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--accent)"  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize:11, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:"var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background:"white", border:"1px solid var(--border)", borderRadius:8, fontSize:12 }}
                formatter={(val) => [`${val.toFixed(1)}%`, "Avg Score"]}
                labelFormatter={(label) => `Session ${label}`}
              />
              <ReferenceLine y={70} stroke="var(--success)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={50} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Line type="monotone" dataKey="score" stroke="url(#lineGrad2)" strokeWidth={2.5}
                dot={{ r:4, fill:"var(--primary)", strokeWidth:0 }} activeDot={{ r:6 }} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:16, justifyContent:"flex-end", marginTop:8, fontSize:"0.75rem", color:"var(--text-muted)" }}>
            <span style={{ color:"var(--success)" }}>— Engaged threshold (70%)</span>
            <span style={{ color:"var(--warning)" }}>— Moderate threshold (50%)</span>
          </div>
        </div>
      )}

      <div className="card fade-up-2">
        <div className="card-header">
          <div className="card-title">
            {loading ? "Loading..." : `${sessions.length} Session${sessions.length !== 1 ? "s" : ""} Recorded`}
          </div>
        </div>

        {!loading && sessions.length === 0 && (
          <div style={{ textAlign:"center", padding:"56px 24px", color:"var(--text-muted)" }}>
            <Activity size={36} style={{ margin:"0 auto 14px", opacity:0.25 }} />
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1rem", marginBottom:8 }}>No Sessions Yet</div>
            <div style={{ fontSize:"0.88rem" }}>Start a monitoring session from the Dashboard to record your first session.</div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign:"center", padding:"48px 24px", color:"var(--text-muted)", fontSize:"0.88rem" }}>
            <RefreshCw size={24} className="spin" style={{ margin:"0 auto 12px" }} />
            Loading sessions...
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Cycles</th>
                  <th>Avg Score</th>
                  <th>Active</th>
                  <th>Passive</th>
                  <th>Disengaged</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const color = scoreColor(s.avg_score);
                  return (
                    <tr key={i}>
                      <td><span style={{ fontFamily:"monospace", fontSize:"0.8rem", color:"var(--primary)", fontWeight:600 }}>{s.session_id}</span></td>
                      <td style={{ fontSize:"0.85rem" }}>{s.date}</td>
                      <td style={{ fontSize:"0.85rem", color:"var(--text-muted)" }}>{s.time}</td>
                      <td style={{ textAlign:"center" }}>
                        <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"0.95rem" }}>{s.total_cycles}</span>
                      </td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div className="progress-bar" style={{ width:72, flex:"none" }}>
                            <div className="progress-fill" style={{ width:`${Math.min(s.avg_score,100)}%`, background:color }} />
                          </div>
                          <strong style={{ color, fontFamily:"var(--font-display)", fontSize:"0.9rem" }}>{s.avg_score.toFixed(1)}%</strong>
                        </div>
                      </td>
                      <td style={{ textAlign:"center" }}><span style={{ background:"rgba(16,185,129,0.1)", color:"var(--success)", padding:"3px 10px", borderRadius:20, fontWeight:700, fontSize:"0.82rem" }}>{s.active_cycles}</span></td>
                      <td style={{ textAlign:"center" }}><span style={{ background:"rgba(245,158,11,0.1)",  color:"var(--warning)", padding:"3px 10px", borderRadius:20, fontWeight:700, fontSize:"0.82rem" }}>{s.passive_cycles}</span></td>
                      <td style={{ textAlign:"center" }}><span style={{ background:"rgba(239,68,68,0.1)",   color:"var(--danger)",  padding:"3px 10px", borderRadius:20, fontWeight:700, fontSize:"0.82rem" }}>{s.disengaged_cycles}</span></td>
                      <td><ResultBadge label={s.overall_label} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function History() {
  const teacher = isTeacher();
  return (
    <div className="main-content">
      <Navbar />
      <div className="page-body">
        {teacher ? <TeacherHistory /> : <StudentHistory />}
      </div>
    </div>
  );
}
