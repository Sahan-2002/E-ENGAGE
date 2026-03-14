export default function EngagementCard({ score = 0, confidence = 0, label = "—" }) {
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    label === "Active Engagement" ? "var(--success)" :
    label === "Passive Engagement" ? "var(--warning)" :
    "var(--danger)";

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="card-header" style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div className="card-title">Live Engagement Score</div>
        <div className="card-subtitle">Updated every 3 seconds</div>
      </div>

      <svg width={radius * 2} height={radius * 2} style={{ overflow: "visible" }}>
        {/* Track */}
        <circle
          cx={radius} cy={radius} r={normalizedRadius}
          fill="none"
          stroke="var(--bg)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={radius} cy={radius} r={normalizedRadius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${radius} ${radius})`}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
        {/* Center text */}
        <text x={radius} y={radius - 8} textAnchor="middle" fill={color}
          style={{ fontSize: "2rem", fontFamily: "var(--font-display)", fontWeight: 800 }}>
          {score}%
        </text>
        <text x={radius} y={radius + 16} textAnchor="middle" fill="var(--text-muted)"
          style={{ fontSize: "0.75rem", fontFamily: "var(--font-body)" }}>
          {label}
        </text>
      </svg>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: "8px 18px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Confidence: <strong style={{ color: "var(--primary)" }}>{Math.round(confidence * 100)}%</strong>
        </div>
      </div>
    </div>
  );
}
