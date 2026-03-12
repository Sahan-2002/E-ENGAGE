// frontend-ui/src/components/ThemeToggle.jsx
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0 : 6,
        padding: compact ? "7px 8px" : "6px 12px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.07)",
        color: "rgba(250,248,244,0.8)",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: "0.8rem",
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: "0.01em",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.13)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
      }}
    >
      <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>
        {isDark ? "☀️" : "🌙"}
      </span>
      {!compact && (
        <span>{isDark ? "Light" : "Dark"}</span>
      )}
    </button>
  );
}
