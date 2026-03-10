import { useNavigate } from "react-router-dom";
import { Brain, Activity, Layers, BarChart3, Eye, ArrowRight, Github } from "lucide-react";

const features = [
  {
    icon: <Activity size={24} />,
    title: "Real-Time Engagement Monitoring",
    desc: "Continuously track student attention levels with sub-3-second latency using computer vision and interaction signals.",
    color: "var(--primary)",
    bg: "rgba(30,58,138,0.08)",
  },
  {
    icon: <Layers size={24} />,
    title: "Multimodal Feature Fusion",
    desc: "Combine visual cues (eye openness, head pose) with behavioral signals (typing, mouse activity) for accurate predictions.",
    color: "var(--purple)",
    bg: "rgba(99,102,241,0.08)",
  },
  {
    icon: <Brain size={24} />,
    title: "AI-Based Attention Prediction",
    desc: "Machine learning models trained on multimodal data deliver robust engagement classification with confidence scoring.",
    color: "var(--accent)",
    bg: "rgba(6,182,212,0.08)",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Data-Driven Classroom Insights",
    desc: "Session history, trend analysis, and exportable reports help educators continuously improve learning outcomes.",
    color: "var(--success)",
    bg: "rgba(16,185,129,0.08)",
  },
];

const steps = [
  { num: "01", title: "Capture Multimodal Input", desc: "Video feed captures facial cues while system interaction events log typing and mouse behavior." },
  { num: "02", title: "AI Feature Fusion", desc: "Visual and behavioral features are extracted, normalized, and fused through a trained ML pipeline." },
  { num: "03", title: "Dashboard Visualization", desc: "Real-time engagement scores, confidence levels, and trends are rendered on the educator dashboard." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "var(--font-body)", background: "var(--bg)" }}>

      {/* ── Public Nav ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 48px"
      }}>
        <div className="navbar-logo" style={{ fontSize: "1.4rem" }}>E‑ENGAGE<span>.</span></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/login")}>Login</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/login")}>Get Started</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
        padding: "120px 24px 80px",
        background: "linear-gradient(135deg, #0F1F5C 0%, #1E3A8A 45%, #312E81 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative blobs */}
        <div style={{ position:"absolute", top:"15%", left:"10%", width:320, height:320, borderRadius:"50%", background:"rgba(6,182,212,0.15)", filter:"blur(80px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"20%", right:"8%", width:280, height:280, borderRadius:"50%", background:"rgba(99,102,241,0.2)", filter:"blur(80px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"50%", left:"50%", width:400, height:400, borderRadius:"50%", background:"rgba(30,58,138,0.3)", filter:"blur(100px)", transform:"translate(-50%,-50%)", pointerEvents:"none" }} />

        <div style={{ position:"relative", maxWidth:720 }}>
          <span className="badge badge-info fade-up" style={{ marginBottom: 20, fontSize:"0.8rem" }}>
            <Eye size={12} /> AI-Powered Classroom Intelligence
          </span>

          <h1 className="fade-up-2" style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            marginBottom: 24,
          }}>
            E‑ENGAGE
          </h1>

          <p className="fade-up-3" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
            color: "rgba(255,255,255,0.75)",
            marginBottom: 12,
            fontWeight: 500,
          }}>
            AI-Powered Student Attention Detection System
          </p>

          <p className="fade-up-3" style={{
            fontSize: "1rem",
            color: "rgba(255,255,255,0.55)",
            marginBottom: 44,
            maxWidth: 520,
            margin: "0 auto 44px",
          }}>
            Enhancing classroom engagement through real-time multimodal AI analytics.
          </p>

          <div className="fade-up-4" style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button
              className="btn btn-accent btn-lg"
              onClick={() => navigate("/login")}
            >
              Get Started <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-lg"
              onClick={() => navigate("/login")}
              style={{ background:"rgba(255,255,255,0.1)", color:"white", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.2)" }}
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "96px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign:"center", marginBottom: 56 }}>
          <h2 style={{ fontSize:"2.2rem", fontFamily:"var(--font-display)", fontWeight:800, marginBottom:12 }}>
            Built for the Modern Classroom
          </h2>
          <p style={{ color:"var(--text-muted)", maxWidth:480, margin:"0 auto" }}>
            A complete multimodal AI platform designed to give educators real-time visibility into student engagement.
          </p>
        </div>

        <div className="grid-4">
          {features.map((f, i) => (
            <div key={i} className="card" style={{
              cursor:"default",
              transition:"var(--transition)",
              borderTop: `3px solid ${f.color}`,
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ width:44, height:44, borderRadius:10, background:f.bg, display:"flex", alignItems:"center", justifyContent:"center", color:f.color, marginBottom:16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1rem", fontWeight:700, marginBottom:8 }}>{f.title}</h3>
              <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding:"80px 48px", background:"var(--bg-card)", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:56 }}>
            <h2 style={{ fontSize:"2.2rem", fontFamily:"var(--font-display)", fontWeight:800, marginBottom:12 }}>
              How It Works
            </h2>
            <p style={{ color:"var(--text-muted)" }}>Three steps from raw data to actionable engagement insights.</p>
          </div>

          <div className="grid-3">
            {steps.map((s, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:"3rem", fontWeight:800, color:"var(--border)", lineHeight:1, marginBottom:16 }}>
                  {s.num}
                </div>
                <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.1rem", fontWeight:700, marginBottom:10 }}>{s.title}</h3>
                <p style={{ fontSize:"0.88rem", color:"var(--text-muted)", lineHeight:1.7 }}>{s.desc}</p>
                {i < steps.length - 1 && (
                  <div style={{ display:"none" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding:"40px 48px", textAlign:"center", color:"var(--text-muted)", fontSize:"0.85rem" }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem", marginBottom:8, color:"var(--text-primary)" }}>
          E‑ENGAGE
        </div>
        <p>AI Student Attention Detection System · University Final Year Project</p>
        <p style={{ marginTop:4 }}>© {new Date().getFullYear()} E-ENGAGE. All rights reserved.</p>
        <a href="https://github.com" target="_blank" rel="noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:12, color:"var(--primary)", fontWeight:600, fontSize:"0.82rem" }}>
          <Github size={14} /> View on GitHub
        </a>
      </footer>
    </div>
  );
}
