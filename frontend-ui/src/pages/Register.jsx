import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/auth";
import { Eye, EyeOff, BookOpen, BarChart2, ShieldCheck, UserPlus } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [role,     setRole]     = useState("student");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim())          { setError("Please enter your name.");           return; }
    if (!email.trim())         { setError("Please enter your email.");          return; }
    if (password.length < 6)   { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match.");           return; }

    setLoading(true);
    try {
      const data = await register(name, email, password, role);
      // Redirect based on role
      navigate(data.user.role === "teacher" ? "/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: <BarChart2 size={16}/>,  label: "Real-time Monitoring",  desc: "20-second attention cycles" },
    { icon: <BookOpen size={16}/>,   label: "Multimodal Detection",  desc: "CV + keyboard & mouse signals" },
    { icon: <ShieldCheck size={16}/>,label: "Private & Secure",      desc: "Data stays on your servers" },
  ];

  return (
    <div className="login-page">

      {/* ── Left brand panel ── */}
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-wordmark">
            E<span>-</span>ENGAGE<span style={{ color: "rgba(250,248,244,0.3)" }}>.</span>
          </div>
          <div className="login-brand-tagline">AI Driven Student Attention Detection</div>
          <div className="login-brand-headline">
            Create your account and start tracking attention today.
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

          <div className="login-form-title">Create account</div>
          <div className="login-form-sub">Join E-ENGAGE as a teacher or student</div>

          {/* Role selector */}
          <div className="role-selector" style={{ marginBottom: 24 }}>
            {["teacher", "student"].map(r => (
              <div
                key={r}
                className={`role-option${role === r ? " active" : ""}`}
                onClick={() => setRole(r)}
              >
                <span className="role-option-icon">{r === "teacher" ? "👨‍🏫" : "👨‍🎓"}</span>
                <span className="role-option-label">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.2)",
              borderRadius: "var(--radius-sm)", padding: "10px 14px",
              color: "var(--danger)", fontSize: "0.84rem", marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text"
                placeholder="Dr. Smith" value={name}
                onChange={e => setName(e.target.value)} autoComplete="name" />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email"
                placeholder="you@institution.edu" value={email}
                onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input className="form-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  autoComplete="new-password" />
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

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password"
                placeholder="Re-enter your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password" />
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
                  Creating account...
                </>
              ) : (
                <><UserPlus size={16}/> Create Account</>
              )}
            </button>
          </form>

          <div style={{
            marginTop: 22, textAlign: "center",
            fontSize: "0.85rem", color: "var(--text-muted)",
          }}>
            Already have an account?{" "}
            <Link to="/login" style={{
              color: "var(--navy)", fontWeight: 600, textDecoration: "none",
            }}>
              Sign in
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
