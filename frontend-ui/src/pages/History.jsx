import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { getUser, isTeacher } from "../services/auth";
import { getSessionHistory } from "../services/api";
import { Download, RefreshCw, TrendingUp, Award, Clock, Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

function scoreColor(score) {
  const n = parseFloat(score);
  return n >= 70 ? "var(--success)" : n >= 50 ? "var(--warning)" : "var(--danger)";
}

function ResultBadge({ label }) {
  const cfg = {
    "Highly Engaged":     { bg: "rgba(16,185,129,0.12)", color: "var(--success)" },
    "Moderately Engaged": { bg: "rgba(245,158,11,0.12)", color: "var(--warning)" },
    "Disengaged":         { bg: "rgba(239,68,68,0.12)",  color: "var(--danger)"  },
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

export default function History() {
  const user    = getUser();
  const teacher = isTeacher();

  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionHistory(user?.email, user?.role);
      setSessions(data.sessions || []);
    } catch (e) {
      setError("Could not load history. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  function exportCSV() {
    if (!sessions.length) return;
    const keys = Object.keys(sessions[0]);
    const rows = sessions.map(s => keys.map(k => `"${s[k] ?? ""}"`).join(","));
    const csv  = [keys.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `eengage-history-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Chart data — chronological order (oldest first)
  const chartData = [...sessions].reverse().map((s, i) => ({
    index: i + 1,
    label: `#${i + 1}`,
    score: parseFloat(s.avg_score) || 0,
    date:  s.date || "",
  }));

  // Summary stats
  const totalSessions  = sessions.length;
  const avgOverall     = totalSessions > 0
    ? (sessions.reduce((sum, s) => sum + (parseFloat(s.avg_score) || 0), 0) / totalSessions).toFixed(1)
    : "—";
  const bestSession    = sessions.reduce((best, s) =>
    (parseFloat(s.avg_score) > parseFloat(best?.avg_score || 0)) ? s : best, null);
  const activeLedSessions = sessions.filter(
    s => (parseInt(s.active_count, 10) || 0) >= Math.max(parseInt(s.passive_count, 10) || 0, parseInt(s.disengaged_count, 10) || 0)
  ).length;

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-body">

        {/* ── Header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Session History</h1>
            <p className="page-desc">
              {teacher ? "All recorded monitoring sessions" : "Your personal attention history"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadHistory} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={!sessions.length}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "var(--radius-sm)", padding: "12px 16px",
            color: "var(--danger)", fontSize: "0.85rem", marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* ── Summary stats ── */}
        {!loading && sessions.length > 0 && (
          <div className="grid-4" style={{ marginBottom: 20 }}>
            {[
              {
                label: "Total Sessions",
                value: totalSessions,
                icon: <Activity size={18}/>,
                color: "var(--primary)",
              },
              {
                label: "Average Score",
                value: `${avgOverall}%`,
                icon: <TrendingUp size={18}/>,
                color: parseFloat(avgOverall) >= 70 ? "var(--success)" : parseFloat(avgOverall) >= 50 ? "var(--warning)" : "var(--danger)",
              },
              {
                label: "Active Sessions",
                value: `${activeLedSessions} / ${totalSessions}`,
                icon: <Award size={18}/>,
                color: "var(--success)",
              },
              {
                label: "Best Score",
                value: bestSession ? `${parseFloat(bestSession.avg_score).toFixed(1)}%` : "—",
                icon: <Clock size={18}/>,
                color: "var(--accent)",
              },
            ].map((s, i) => (
              <div key={i} className="card fade-up" style={{ borderTop: `3px solid ${s.color}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span style={{ fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.07em", color:"var(--text-muted)" }}>{s.label}</span>
                </div>
                <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.4rem", color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Trend chart ── */}
        {chartData.length > 1 && (
          <div className="card fade-up" style={{ marginBottom: 20 }}>
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
                <Line
                  type="monotone" dataKey="score"
                  stroke="url(#lineGrad2)" strokeWidth={2.5}
                  dot={{ r:4, fill:"var(--primary)", strokeWidth:0 }}
                  activeDot={{ r:6 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:16, justifyContent:"flex-end", marginTop:8, fontSize:"0.75rem", color:"var(--text-muted)" }}>
              <span style={{ color:"var(--success)" }}>— Engaged threshold (70%)</span>
              <span style={{ color:"var(--warning)" }}>— Moderate threshold (50%)</span>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="card fade-up-2">
          <div className="card-header">
            <div className="card-title">
              {loading ? "Loading..." : `${sessions.length} Session${sessions.length !== 1 ? "s" : ""} Recorded`}
            </div>
          </div>

          {/* Empty state */}
          {!loading && sessions.length === 0 && (
            <div style={{ textAlign:"center", padding:"56px 24px", color:"var(--text-muted)" }}>
              <Activity size={36} style={{ margin:"0 auto 14px", opacity:0.25 }} />
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1rem", marginBottom:8 }}>
                No Sessions Yet
              </div>
              <div style={{ fontSize:"0.88rem" }}>
                Start a monitoring session from the Dashboard to record your first session.
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign:"center", padding:"48px 24px", color:"var(--text-muted)", fontSize:"0.88rem" }}>
              <RefreshCw size={24} className="spin" style={{ margin:"0 auto 12px" }} />
              Loading sessions...
            </div>
          )}

          {/* Table */}
          {!loading && sessions.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Session ID</th>
                    {teacher && <th>User</th>}
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
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
                    const score   = parseFloat(s.avg_score) || 0;
                    const color   = scoreColor(score);
                    const duration= parseFloat(s.duration_minutes) || 0;
                    const durLabel= duration < 1
                      ? `${Math.round(duration * 60)}s`
                      : `${duration.toFixed(1)} min`;

                    return (
                      <tr key={i}>
                        <td>
                          <span style={{
                            fontFamily: "monospace", fontSize: "0.8rem",
                            color: "var(--primary)", fontWeight: 600,
                          }}>
                            {s.session_id}
                          </span>
                        </td>
                        {teacher && (
                          <td style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                            {s.user}
                          </td>
                        )}
                        <td style={{ fontSize: "0.85rem" }}>{s.date}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{s.time}</td>
                        <td>
                          <span style={{
                            background: "var(--bg)", padding: "3px 8px",
                            borderRadius: 6, fontSize: "0.8rem", fontWeight: 600,
                            color: "var(--text-secondary)",
                          }}>
                            {durLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            fontFamily: "var(--font-display)", fontWeight: 800,
                            fontSize: "0.95rem", color: "var(--text-primary)",
                          }}>
                            {s.total_cycles}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div className="progress-bar" style={{ width: 72, flex: "none" }}>
                              <div className="progress-fill" style={{
                                width: `${Math.min(score, 100)}%`,
                                background: color,
                              }} />
                            </div>
                            <strong style={{
                              color, fontFamily: "var(--font-display)", fontSize: "0.9rem",
                            }}>
                              {score.toFixed(1)}%
                            </strong>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            background: "rgba(16,185,129,0.1)", color: "var(--success)",
                            padding: "3px 10px", borderRadius: 20,
                            fontWeight: 700, fontSize: "0.82rem",
                          }}>
                            {s.active_count ?? 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            background: "rgba(245,158,11,0.1)", color: "var(--warning)",
                            padding: "3px 10px", borderRadius: 20,
                            fontWeight: 700, fontSize: "0.82rem",
                          }}>
                            {s.passive_count ?? 0}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            background: "rgba(239,68,68,0.1)", color: "var(--danger)",
                            padding: "3px 10px", borderRadius: 20,
                            fontWeight: 700, fontSize: "0.82rem",
                          }}>
                            {s.disengaged_count}
                          </span>
                        </td>
                        <td>
                          <ResultBadge label={s.label_summary} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
