import { Eye, Monitor, Keyboard, Mouse, Clock } from "lucide-react";

function MetricRow({ icon, label, value, color }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          <span style={{ color }}>{icon}</span>
          {label}
        </div>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function FeatureMetricsPanel({ features = {} }) {
  const {
    eye_openness = 0,
    head_pose = 0,
    typing_speed = 0,
    mouse_activity = 0,
    idle_time = 0,
  } = features;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Feature Breakdown</div>
          <div className="card-subtitle">Visual & behavioral signals</div>
        </div>
      </div>

      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", fontWeight: 700, marginBottom: 12 }}>
        Visual Features
      </div>

      <MetricRow
        icon={<Eye size={14} />}
        label="Eye Openness"
        value={eye_openness}
        color="var(--primary)"
      />
      <MetricRow
        icon={<Monitor size={14} />}
        label="Head Pose Stability"
        value={head_pose}
        color="var(--sage)"
      />

      <div className="divider" style={{ margin: "16px 0" }} />
      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", fontWeight: 700, marginBottom: 12 }}>
        Behavioral Features
      </div>

      <MetricRow
        icon={<Keyboard size={14} />}
        label="Typing Speed"
        value={typing_speed}
        color="var(--accent)"
      />
      <MetricRow
        icon={<Mouse size={14} />}
        label="Mouse Activity"
        value={mouse_activity}
        color="var(--success)"
      />
      <MetricRow
        icon={<Clock size={14} />}
        label="Idle Time (inverted)"
        value={1 - idle_time}
        color="var(--warning)"
      />
    </div>
  );
}
