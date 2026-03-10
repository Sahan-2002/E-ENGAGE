import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import { Eye, EyeOff, BookOpen, BarChart2, ShieldCheck } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [role,     setRole]     = useState("teacher");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Auto-fill credentials on role select
  function handleRoleSelect(r) {
    setRole(r);
    setError("");
    if (r === "teacher") {
      setEmail("teacher@eengage.com");
      setPassword("password123");
    } else {
      setEmail("student@eengage.com");
      setPassword("student123");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: <BarChart2 size={16} />,
      label: "Real-time Monitoring",
      desc:  "20-second attention cycles with live feedback",
    },
    {
      icon: <BookOpen size={16} />,
      label: "Multimodal Detection",
      desc:  "Computer vision + keyboard & mouse signals",
    },
    {
      icon: <ShieldCheck size={16} />,
      label: "Private & Secure",
      desc:  "Data stays on your institution's servers",
    },
  ];

  return (
    <div className="login-page">

      {/* ── Left brand panel ── */}
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-wordmark">
            E<span>-</span>ENGAGE<span style={{ color: "rgba(250,248,244,0.3)" }}>.</span>
          </div>
          <div className="login-brand-tagline">
            AI Driven Student Attention Detection
          </div>
          <div className="login-brand-headline">
            Understand how your students engage — in real time.
          </div>
        </div>

        <div className="login-features">
          {features.map((f, i) => (
            <div key={i} className="login-feature-item">
              <div className="login-feature-icon">{f.icon}</div>
              <div className="login-feature-text">
                <strong>{f.label}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-box fade-up">

          <div className="login-form-title">Welcome back</div>
          <div className="login-form-sub">Sign in to your E-ENGAGE account</div>

          {/* Role selector */}
          <div className="role-selector">
            {["teacher", "student"].map(r => (
              <div
                key={r}
                className={`role-option${role === r ? " active" : ""}`}
                onClick={() => handleRoleSelect(r)}
              >
                <span className="role-option-icon">
                  {r === "teacher" ? "👨‍🏫" : "👨‍🎓"}
                </span>
                <span className="role-option-label">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </span>
              </div>
            ))}
          </div>

          {/* Auto-fill hint */}
          <div className="login-hint">
            Demo credentials auto-filled — just click Sign In.
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(192,57,43,0.07)",
              border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              color: "var(--danger)",
              fontSize: "0.84rem",
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@institution.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    cursor: "pointer", color: "var(--text-muted)",
                    display: "flex", alignItems: "center",
                    padding: 4,
                  }}
                >
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20" strokeDashoffset="10" />
                  </svg>
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          <div style={{
            marginTop: 28, paddingTop: 20,
            borderTop: "1px solid var(--border-light)",
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}>
            E-ENGAGE · Academic Edition
          </div>

        </div>
      </div>
    </div>
  );
}
