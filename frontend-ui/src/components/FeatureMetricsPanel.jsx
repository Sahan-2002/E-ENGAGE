import { Eye, Monitor, Keyboard, Mouse, Clock } from "lucide-react";

// ── Normalization ranges — must match what CaptureEngine sends ────
const MAX_EYE_OPENNESS   = 0.035;   // max eye_openness value from MediaPipe
const MAX_TYPING_SPEED   = 450;     // max keypresses per minute
const MAX_MOUSE_ACTIVITY = 400;     // max mouse movements per minute
const MAX_IDLE_TIME      = 60;      // max idle seconds

function normalize(value, max) {
  if (!value || !max) return 0;
  return Math.max(0, Math.min(1, value / max));
}

function MetricRow({ icon, label, rawValue, normalizedValue, unit, color }) {
  const pct     = Math.round(Math.max(0, Math.min(100, normalizedValue * 100)));
  const display = rawValue !== undefined
    ? `${Math.round(rawValue)}${unit || ""}`
    : `${pct}%`;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:"0.85rem", color:"var(--text-secondary)" }}>
          <span style={{ color }}>{icon}</span>
          {label}
        </div>
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--text-primary)" }}>
          {display}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width:`${pct}%`, background:color }}
        />
      </div>
    </div>
  );
}

export default function FeatureMetricsPanel({ features = {} }) {
  const {
    eye_openness   = 0,
    head_pose      = 0,
    typing_speed   = 0,
    mouse_activity = 0,
    idle_time      = 0,
  } = features;

  // head_pose is already 0–1 (binary or float from MediaPipe)
  // idle_time is inverted: high idle = low engagement
  const idleNorm    = normalize(idle_time, MAX_IDLE_TIME);
  const idleInverted = Math.max(0, 1 - idleNorm);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Feature Breakdown</div>
          <div className="card-subtitle">Visual & behavioral signals</div>
        </div>
      </div>

      <div style={{ fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)", fontWeight:700, marginBottom:12 }}>
        Visual Features
      </div>

      <MetricRow
        icon={<Eye size={14} />}
        label="Eye Openness"
        normalizedValue={normalize(eye_openness, MAX_EYE_OPENNESS)}
        color="var(--primary)"
      />
      <MetricRow
        icon={<Monitor size={14} />}
        label="Head Pose Stability"
        normalizedValue={Math.max(0, Math.min(1, head_pose))}
        color="var(--sage)"
      />

      <div className="divider" style={{ margin:"16px 0" }} />
      <div style={{ fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)", fontWeight:700, marginBottom:12 }}>
        Behavioral Features
      </div>

      <MetricRow
        icon={<Keyboard size={14} />}
        label="Typing Speed"
        rawValue={typing_speed}
        normalizedValue={normalize(typing_speed, MAX_TYPING_SPEED)}
        unit=" kpm"
        color="var(--accent)"
      />
      <MetricRow
        icon={<Mouse size={14} />}
        label="Mouse Activity"
        rawValue={mouse_activity}
        normalizedValue={normalize(mouse_activity, MAX_MOUSE_ACTIVITY)}
        unit=" mpm"
        color="var(--success)"
      />
      <MetricRow
        icon={<Clock size={14} />}
        label="Idle Time"
        rawValue={idle_time}
        normalizedValue={idleInverted}
        unit="s idle"
        color={idleInverted > 0.5 ? "var(--success)" : idleInverted > 0.25 ? "var(--warning)" : "var(--danger)"}
      />
    </div>
  );
}
