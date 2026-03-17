import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/auth";
import { Eye, EyeOff, BookOpen, BarChart2, ShieldCheck } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    setError("");
    try {
      await login(email, password);  // removed unused 'data' variable
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: <BarChart2 size={16}/>,   label: "Real-time Monitoring",  desc: "20-second attention cycles with live feedback" },
    { icon: <BookOpen size={16}/>,    label: "Multimodal Detection",  desc: "Computer vision + keyboard & mouse signals"    },
    { icon: <ShieldCheck size={16}/>, label: "Private & Secure",      desc: "Data stays on your institution's servers"      },
  ];

  return (
    <div className="login-page">

      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-wordmark">
            E<span>-</span>ENGAGE<span style={{ color: "rgba(250,248,244,0.3)" }}>.</span>
          </div>
          <div className="login-brand-tagline">AI Driven Student Attention Detection</div>
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

      <div className="login-form-panel">
        <div className="login-form-box fade-up">

          <div className="login-form-title">Welcome back</div>
          <div className="login-form-sub">Sign in to your E-ENGAGE account</div>

          {error && (
            <div style={{
              background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "var(--radius-sm)", padding: "10px 14px",
              color: "var(--danger)", fontSize: "0.84rem", marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email"
                placeholder="you@institution.edu"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input className="form-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 4,
                  }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16"
                    style={{ animation: "spin 0.8s linear infinite" }}>
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeDasharray="20" strokeDashoffset="10"/>
                  </svg>
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: 22, textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>
              Create one
            </Link>
          </div>

          <div style={{
            marginTop: 20, paddingTop: 20,
            borderTop: "1px solid var(--border-light)",
            textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)",
          }}>
            E-ENGAGE · Academic Edition
          </div>

        </div>
      </div>
    </div>
  );
}
