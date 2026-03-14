import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import EngagementCard from "../components/EngagementCard";
import ChartComponent from "../components/ChartComponent";
import FeatureMetricsPanel from "../components/FeatureMetricsPanel";
import { getUser, isTeacher } from "../services/auth";
import { startSession, stopSession, getSessionStatus } from "../services/api";
import {
  Play, Square, Clock, CheckCircle, AlertCircle,
  Trophy, Timer, Wifi, WifiOff, Activity
} from "lucide-react";

const POLL_MS      = 1000;
const CYCLE_SECS   = 20;

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function scoreColor(score) {
  return score >= 70 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
}

// ── Phase Badge ────────────────────────────────────────────────────────────
function PhaseBadge({ phase }) {
  const cfg = {
    idle:     { label: "IDLE",     bg: "#F1F5F9", color: "#64748B", pulse: false },
    tracking: { label: "TRACKING", bg: "#ECFDF5", color: "#059669", pulse: true  },
    waiting:  { label: "WAITING",  bg: "#FFF7ED", color: "#D97706", pulse: false },
  }[phase] || { label: "IDLE", bg: "#F1F5F9", color: "#64748B", pulse: false };

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: cfg.bg, color: cfg.color,
      padding: "7px 14px", borderRadius: 40,
      fontFamily: "var(--font-display)", fontWeight: 700,
      fontSize: "0.75rem", letterSpacing: "0.1em",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: cfg.color,
        animation: cfg.pulse ? "pulse 1.4s infinite" : "none",
        boxShadow: cfg.pulse ? `0 0 0 3px ${cfg.color}33` : "none",
      }} />
      {cfg.label}
    </div>
  );
}

// ── Main Countdown Card ────────────────────────────────────────────────────
function MonitoringStatus({ phase, secsLeft, intervalMinutes, currentCycle }) {
  const isTracking = phase === "tracking";
  const isWaiting  = phase === "waiting";

  const total = isTracking ? CYCLE_SECS : intervalMinutes * 60;
  const pct   = total > 0 ? Math.max(0, Math.min(1, (total - secsLeft) / total)) : 0;
  const R     = 54;
  const circ  = 2 * Math.PI * R;
  const ringColor = isTracking ? "var(--success)" : isWaiting ? "var(--warning)" : "var(--border)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
      {/* Ring */}
      <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
        <svg width={128} height={128} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={64} cy={64} r={R} fill="none" stroke="var(--bg)" strokeWidth={9} />
          <circle cx={64} cy={64} r={R} fill="none"
            stroke={ringColor} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 2,
        }}>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 800,
            fontSize: "1.55rem", color: ringColor, lineHeight: 1,
          }}>
            {fmt(secsLeft)}
          </span>
          <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em" }}>
            {isTracking ? "TRACKING" : isWaiting ? "NEXT IN" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Text info */}
      <div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: "1.1rem", color: "var(--text-primary)", marginBottom: 6,
        }}>
          {phase === "idle"     && "Ready to Monitor"}
          {phase === "tracking" && `Measuring — Cycle ${currentCycle}`}
          {phase === "waiting"  && `Next Cycle in ${fmt(secsLeft)}`}
        </div>

        <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
          {phase === "idle" && (
            <>Tracking interval: <strong style={{ color: "var(--primary)" }}>{intervalMinutes} min</strong></>
          )}
          {phase === "tracking" && "Camera + keyboard/mouse signals being collected"}
          {phase === "waiting"  && (
            <>Tracking paused · interval: <strong style={{ color: "var(--primary)" }}>{intervalMinutes} min</strong></>
          )}
        </div>

        {/* Status label row */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Monitoring Status:
          </span>
          <PhaseBadge phase={phase} />
        </div>
      </div>
    </div>
  );
}

// ── Session Summary ────────────────────────────────────────────────────────
function SessionSummary({ summary, onNewSession }) {
  const score = parseFloat(summary.avg_score);
  const color = scoreColor(score);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Session Complete!</h1>
          <p className="page-desc">ID: {summary.session_id} · {summary.date} at {summary.time}</p>
        </div>
        <button className="btn btn-primary" onClick={onNewSession}>
          <Play size={15} /> New Session
        </button>
      </div>

      {/* Hero score */}
      <div className="card" style={{
        textAlign: "center", padding: "44px 24px", marginBottom: 20,
        borderTop: `4px solid ${color}`,
        background: `linear-gradient(160deg, white 60%, ${color}0A)`,
      }}>
        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", fontWeight: 700, marginBottom: 10 }}>
          Overall Attention Score
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "5rem", fontWeight: 800, color, lineHeight: 1 }}>
          {score.toFixed(1)}%
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700, color, marginTop: 10 }}>
          {summary.overall_label}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 8 }}>
          {summary.total_cycles} measurement cycles completed
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[ 
          { label: "Active",      value: `${summary.active_count} / ${summary.total_cycles}`,       icon: <CheckCircle size={16}/>, color: "var(--success)" },
          { label: "Passive",     value: `${summary.passive_count} / ${summary.total_cycles}`,      icon: <Clock size={16}/>,       color: "var(--warning)" },
          { label: "Disengaged",  value: `${summary.disengaged_count} / ${summary.total_cycles}`,   icon: <AlertCircle size={16}/>, color: "var(--danger)"  },
          { label: "Best Cycle",  value: `#${summary.best_cycle}  ${summary.best_score}%`,         icon: <Trophy size={16}/>,      color: "var(--primary)" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
                {s.label}
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <ChartComponent data={(summary.chart_data || []).map(d => ({
        time: `C${d.cycle}`, score: d.score
      }))} />
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const user    = getUser();
  const teacher = isTeacher();

  const [status,          setStatus]         = useState(null);
  const [starting,        setStarting]        = useState(false);
  const [error,           setError]           = useState(null);
  const [intervalMinutes, setIntervalMinutes] = useState(5);

  // Local countdown for smoothness between 1s polls
  const [localSecs,  setLocalSecs]  = useState(0);
  const [localPhase, setLocalPhase] = useState("idle");
  const countdownRef = useRef(null);
  const pollRef      = useRef(null);

  // Poll backend every second
  const pollStatus = useCallback(async () => {
    try {
      const data = await getSessionStatus();
      setStatus(data);
      setLocalPhase(data.phase || "idle");
      setLocalSecs(data.secs_left || 0);
      setError(null);
    } catch {
      setError("Cannot reach backend. Start FastAPI on port 8000.");
    }
  }, []);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [pollStatus]);

  // Smooth local countdown between polls
  useEffect(() => {
    clearInterval(countdownRef.current);
    if (localPhase === "idle") return;
    countdownRef.current = setInterval(() => {
      setLocalSecs(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [localPhase, status?.current_cycle]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      await startSession(user?.email || "unknown", user?.role || "student", intervalMinutes);
    } catch (e) {
      setError(e.message);
    }
    setStarting(false);
  }

  async function handleStop() {
    await stopSession();
    setLocalPhase("idle");
    setLocalSecs(0);
  }

  function handleNewSession() {
    // Fully reset — backend already cleared by reset_session_state() on next /start-session
    // Just clear frontend state completely
    setStatus({
      running: false, phase: "idle", tracking_active: false,
      current_cycle: 0, secs_left: 0, interval_minutes: intervalMinutes,
      progress_pct: 0, latest_sample: null, all_samples: [],
      summary: null, session_id: null, user: null, role: null, error: null,
    });
    setLocalPhase("idle");
    setLocalSecs(0);
  }

  const running      = status?.running      ?? false;
  const summary      = status?.summary      ?? null;
  const latest       = status?.latest_sample ?? null;
  const allSamples   = status?.all_samples  ?? [];
  const currentCycle = status?.current_cycle ?? 0;

  const chartData = allSamples.map(s => ({
    time:  `C${s.cycle}`,
    score: s.engagement_score,
  }));

  // Summary screen
  if (summary && !running) {
    return (
      <div className="main-content">
        <Navbar />
        <div className="page-body">
          <SessionSummary summary={summary} onNewSession={handleNewSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-body">

        {/* ── Page header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 24 }}>
          <div>
            <h1 className="page-title">
              {teacher ? "Class Monitoring" : "My Attention Monitor"}
            </h1>
            <p className="page-desc" style={{ marginTop: 4 }}>
              {teacher
                ? "Start tracking to measure student engagement at regular intervals"
                : "Track your attention during study sessions"}
            </p>
          </div>
          <span className={`badge ${teacher ? "badge-primary" : "badge-info"}`}>
            {teacher ? "👨‍🏫 Teacher" : "👨‍🎓 Student"}
          </span>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "var(--radius-sm)", padding: "12px 16px",
            color: "var(--danger)", fontSize: "0.85rem", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <WifiOff size={15}/> {error}
          </div>
        )}

        {/* ── Control Panel ── */}
        <div className="card fade-up" style={{ marginBottom: 20 }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap", gap: 20,
          }}>
            {/* Countdown display */}
            <MonitoringStatus
              phase={running ? localPhase : "idle"}
              secsLeft={localSecs}
              intervalMinutes={intervalMinutes}
              currentCycle={currentCycle}
            />

            {/* Right controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end" }}>

              {/* Interval config */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--bg)", borderRadius: "var(--radius-sm)",
                padding: "10px 16px",
                opacity: running ? 0.5 : 1,
              }}>
                <Timer size={15} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Tracking Interval:
                </span>
                <input
                  type="number" min={1} max={60} value={intervalMinutes}
                  onChange={e => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={running}
                  style={{
                    width: 56, padding: "6px 8px",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-display)", fontWeight: 800,
                    fontSize: "0.95rem", color: "var(--primary)",
                    textAlign: "center", outline: "none",
                    background: running ? "var(--bg)" : "white",
                  }}
                />
                <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  min
                </span>
              </div>

              {/* Cycle counter while running */}
              {running && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: "0.82rem", color: "var(--text-muted)",
                }}>
                  <Activity size={14} style={{ color: "var(--accent)" }} />
                  <span>
                    <strong style={{ color: "var(--text-primary)" }}>{currentCycle}</strong> cycle{currentCycle !== 1 ? "s" : ""} recorded
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-accent"
                  onClick={handleStart}
                  disabled={running || starting}
                  style={{ minWidth: 160 }}
                >
                  {starting
                    ? <><span className="loader" /> Starting...</>
                    : <><Play size={15} /> Start Tracking</>}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleStop}
                  disabled={!running}
                >
                  <Square size={15} /> Stop
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Idle / waiting info card ── */}
        {!running && !latest && (
          <div className="card" style={{
            textAlign: "center", padding: "64px 24px",
            background: "linear-gradient(160deg, #F8FAFF, #EEF2FF)",
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: "50%",
              background: "rgba(30,58,138,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Wifi size={30} style={{ color: "var(--primary)", opacity: 0.45 }} />
            </div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "1.2rem",
              fontWeight: 800, marginBottom: 12, color: "var(--text-primary)",
            }}>
              Ready to Track
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 460, margin: "0 auto", lineHeight: 1.9 }}>
              Click <strong>Start Tracking</strong> to begin monitoring.<br />
              The system will measure attention for <strong>20 seconds</strong>, then wait{" "}
              <strong>{intervalMinutes} minute{intervalMinutes !== 1 ? "s" : ""}</strong>, then measure again —
              repeating until you click <strong>Stop</strong>.
            </div>
          </div>
        )}

        {/* ── Live data (shown during tracking or waiting after first cycle) ── */}
        {(running || latest) && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
              <EngagementCard
                score={latest?.engagement_score ?? 0}
                confidence={latest?.confidence    ?? 0}
                label={latest?.label              ?? "—"}
              />
              <ChartComponent data={chartData} />
            </div>

            <FeatureMetricsPanel features={latest?.features ?? {}} />

            {/* Waiting phase notice */}
            {localPhase === "waiting" && (
              <div style={{
                marginTop: 16, padding: "14px 18px",
                background: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.22)",
                borderRadius: "var(--radius-sm)",
                display: "flex", alignItems: "center", gap: 10,
                color: "var(--warning)", fontSize: "0.88rem", fontWeight: 500,
              }}>
                <Clock size={16} />
                Tracking paused. Next 20-second cycle starts in{" "}
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>
                  {fmt(localSecs)}
                </strong>
              </div>
            )}

            {/* No face warning */}
            {latest?.face_detected === 0 && localPhase === "tracking" && (
              <div style={{
                marginTop: 12, padding: "12px 16px",
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-sm)",
                display: "flex", alignItems: "center", gap: 8,
                color: "var(--danger)", fontSize: "0.85rem",
              }}>
                <AlertCircle size={15} />
                Face not detected — ensure your face is clearly visible to the camera
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
