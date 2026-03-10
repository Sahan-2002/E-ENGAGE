import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { loginWithCredentials } from "../services/auth";

export default function Login() {
  const navigate  = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await loginWithCredentials(email, password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function fillDemo(role) {
    if (role === "teacher") {
      setEmail("teacher@eengage.com");
      setPassword("password123");
    } else {
      setEmail("student@eengage.com");
      setPassword("student123");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24,
      background: "linear-gradient(135deg, #0F1F5C 0%, #1E3A8A 50%, #312E81 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:"10%", left:"15%", width:300, height:300, borderRadius:"50%", background:"rgba(6,182,212,0.12)", filter:"blur(80px)" }} />
      <div style={{ position:"absolute", bottom:"15%", right:"10%", width:250, height:250, borderRadius:"50%", background:"rgba(99,102,241,0.15)", filter:"blur(70px)" }} />

      <div className="fade-up" style={{
        background: "rgba(255,255,255,0.97)", borderRadius: "var(--radius)",
        padding: "44px 40px", width: "100%", maxWidth: 420,
        boxShadow: "var(--shadow-lg)", position: "relative", zIndex: 1,
      }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div className="navbar-logo" style={{ fontSize:"1.8rem", display:"block", marginBottom:8 }}>
            E‑ENGAGE<span>.</span>
          </div>
          <p style={{ color:"var(--text-muted)", fontSize:"0.88rem" }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} />
              <input type="email" className="form-input input-with-icon"
                placeholder="your@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required style={{ width:"100%" }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input type="password" className="form-input input-with-icon"
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required style={{ width:"100%" }} />
            </div>
          </div>

          {error && (
            <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
              borderRadius:"var(--radius-sm)", padding:"10px 14px", color:"var(--danger)",
              fontSize:"0.85rem", marginBottom:16 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width:"100%", padding:"13px", fontSize:"0.95rem" }}>
            {loading ? <span className="loader" /> : <>Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", textAlign:"center", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Demo Accounts
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => fillDemo("teacher")} type="button"
              className="btn btn-outline btn-sm" style={{ flex:1, fontSize:"0.78rem" }}>
              👨‍🏫 Teacher Demo
            </button>
            <button onClick={() => fillDemo("student")} type="button"
              className="btn btn-outline btn-sm" style={{ flex:1, fontSize:"0.78rem" }}>
              👨‍🎓 Student Demo
            </button>
          </div>
          <div style={{ marginTop:10, fontSize:"0.75rem", color:"var(--text-muted)", textAlign:"center", lineHeight:1.8 }}>
            Teacher: teacher@eengage.com / password123<br />
            Student: student@eengage.com / student123
          </div>
        </div>
      </div>
    </div>
  );
}
