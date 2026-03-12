import { useState, useEffect } from "react";
import "../App.css";
import ThemeToggle from "../components/ThemeToggle";

// ── Loading Screen (exact match to App.jsx) ────────────────────────
function LoadingScreen({ onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 600);
    }, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`loading-screen${exiting ? " exit" : ""}`}>
      <div>
        <div className="loading-wordmark">
          <span className="loading-wordmark-text">
            E<span>-</span>ENGAGE<span style={{ color: "rgba(250,248,244,0.2)" }}>.</span>
          </span>
        </div>
        <div className="loading-tagline">AI Driven Student Attention Detection System</div>
        <div className="loading-line" />
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    </div>
  );
}

// ── Smooth scroll helper ───────────────────────────────────────────
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

// ── Navbar ─────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [activeSection, setActive] = useState("home");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const ids = ["home","features","how-it-works","about","contact"];
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el && window.scrollY >= el.offsetTop - 100) { setActive(ids[i]); break; }
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home",         id: "home" },
    { label: "Features",     id: "features" },
    { label: "How It Works", id: "how-it-works" },
    { label: "About",        id: "about" },
    { label: "Contact",      id: "contact" },
  ];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: scrolled ? "rgba(15,31,61,0.97)" : "transparent",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      transition: "all 0.35s ease",
      padding: "0 5%",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Brand */}
        <a href="/" style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.4rem",
          color: "var(--cream)", textDecoration: "none", letterSpacing: "-0.01em",
          flexShrink: 0,
        }}>
          E<span style={{ color: "var(--gold-light)" }}>-</span>ENGAGE
        </a>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} className="landing-desktop-nav">
          {navLinks.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)} style={{
              background: activeSection === l.id ? "rgba(255,255,255,0.09)" : "none",
              border: "none", cursor: "pointer",
              padding: "7px 14px", borderRadius: 8,
              fontFamily: "var(--font-body)", fontSize: "0.88rem", fontWeight: 500,
              color: activeSection === l.id ? "var(--cream)" : "rgba(250,248,244,0.55)",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => { if (activeSection !== l.id) { e.target.style.color = "var(--cream)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}}
            onMouseLeave={e => { if (activeSection !== l.id) { e.target.style.color = "rgba(250,248,244,0.55)"; e.target.style.background = "none"; }}}
            >{l.label}</button>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }} className="landing-desktop-nav">
          <a href="/login" style={{
            fontFamily: "var(--font-body)", fontSize: "0.86rem", fontWeight: 600,
            color: "rgba(250,248,244,0.7)", textDecoration: "none",
            padding: "8px 18px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            transition: "all 0.18s",
          }}
          onMouseEnter={e => { e.target.style.color = "var(--cream)"; e.target.style.borderColor = "rgba(255,255,255,0.35)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.target.style.color = "rgba(250,248,244,0.7)"; e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "transparent"; }}
          >Sign In</a>
          <a href="/register" style={{
            fontFamily: "var(--font-body)", fontSize: "0.86rem", fontWeight: 600,
            color: "var(--navy)", textDecoration: "none",
            padding: "8px 18px", borderRadius: 8,
            background: "var(--gold-light)",
            transition: "all 0.18s",
          }}
          onMouseEnter={e => { e.target.style.background = "var(--gold)"; e.target.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.target.style.background = "var(--gold-light)"; e.target.style.transform = "none"; }}
          >Sign Up</a>
          <ThemeToggle/>
        </div>

        {/* Hamburger */}
        <button onClick={() => setMenuOpen(v => !v)} className="landing-hamburger" style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--cream)", padding: 8,
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {menuOpen
              ? <><line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
              : <><line x1="3" y1="7"  x2="19" y2="7"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: "rgba(10,20,45,0.98)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "16px 5% 20px",
        }}>
          {navLinks.map(l => (
            <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: "0.95rem", fontWeight: 500,
              color: "rgba(250,248,244,0.7)", padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>{l.label}</button>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <a href="/login" className="btn btn-outline btn-sm" style={{ flex: 1, textAlign: "center", color: "rgba(250,248,244,0.7)", borderColor: "rgba(255,255,255,0.2)" }}>Sign In</a>
            <a href="/register" className="btn btn-sm" style={{ flex: 1, textAlign: "center", background: "var(--gold-light)", color: "var(--navy)" }}>Sign Up</a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="home" style={{
      minHeight: "100vh", position: "relative",
      background: "var(--navy)",
      display: "flex", alignItems: "center",
      overflow: "hidden",
    }}>
      {/* Background grid — matches loading screen / login panel aesthetic */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(250,248,244,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(250,248,244,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}/>
      {/* Radial accents */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 55% at 15% 85%, rgba(61,122,95,0.18) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 85% 15%, rgba(201,150,58,0.11) 0%, transparent 60%)",
      }}/>

      <div style={{
        maxWidth: 1200, width: "100%", margin: "0 auto",
        padding: "120px 5% 80px",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 60, alignItems: "center", position: "relative", zIndex: 1,
      }} className="landing-hero-grid">

        {/* Text side */}
        <div>
          {/* Tag */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 20,
            background: "rgba(61,122,95,0.15)",
            border: "1px solid rgba(61,122,95,0.3)",
            marginBottom: 24,
            animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: "var(--sage-light)",
              boxShadow: "0 0 6px var(--sage)",
              animation: "livePulse 2s ease-in-out infinite",
            }}/>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "0.78rem", fontWeight: 600,
              color: "var(--sage-light)", letterSpacing: "0.1em", textTransform: "uppercase",
            }}>AI-Powered Engagement Intelligence</span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(3rem,6vw,5rem)", lineHeight: 1,
            color: "var(--cream)", margin: "0 0 6px",
            letterSpacing: "-0.03em",
            animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both",
          }}>
            E<span style={{ color: "var(--gold-light)" }}>-</span>ENGAGE
          </h1>

          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 300,
            fontSize: "clamp(1rem,2vw,1.35rem)", lineHeight: 1.4,
            color: "rgba(250,248,244,0.55)", margin: "0 0 28px",
            letterSpacing: "0.04em",
            animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both",
          }}>
            AI Driven Student Attention Detection System
          </h2>

          <p style={{
            fontFamily: "var(--font-body)", fontSize: "clamp(0.95rem,1.4vw,1.05rem)",
            lineHeight: 1.8, color: "rgba(250,248,244,0.5)",
            maxWidth: 500, margin: "0 0 40px",
            animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s both",
          }}>
            Monitor student engagement in real time using computer vision and
            behavioral analytics and giving teachers precise, actionable insights
            into every student's attention level.
          </p>

          <div style={{
            display: "flex", gap: 14, flexWrap: "wrap",
            animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.5s both",
          }}>
            <a href="/register" style={{
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "0.95rem",
              textDecoration: "none", padding: "13px 30px", borderRadius: "var(--radius-sm)",
              background: "var(--sage)", color: "white",
              boxShadow: "0 4px 20px rgba(61,122,95,0.35)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.background = "var(--sage-light)"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 28px rgba(61,122,95,0.45)"; }}
            onMouseLeave={e => { e.target.style.background = "var(--sage)"; e.target.style.transform = "none"; e.target.style.boxShadow = "0 4px 20px rgba(61,122,95,0.35)"; }}
            >Get Started →</a>
            <a href="/login" style={{
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.95rem",
              textDecoration: "none", padding: "13px 30px", borderRadius: "var(--radius-sm)",
              background: "transparent", color: "rgba(250,248,244,0.7)",
              border: "1.5px solid rgba(255,255,255,0.18)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.color = "var(--cream)"; e.target.style.borderColor = "rgba(255,255,255,0.4)"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.target.style.color = "rgba(250,248,244,0.7)"; e.target.style.borderColor = "rgba(255,255,255,0.18)"; e.target.style.background = "transparent"; }}
            >Sign In</a>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: 0, marginTop: 52,
            paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)",
            animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.6s both",
          }}>
            {[
              { val: "Real-Time", label: "Vision Analysis"  },
              { val: "CV + HCI",  label: "Dual Signal Fusion" },
              { val: "XGBoost",   label: "ML Classification" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                paddingRight: 24, paddingLeft: i > 0 ? 24 : 0,
              }}>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 600,
                  fontSize: "1rem", color: "var(--gold-light)", marginBottom: 3,
                }}>{s.val}</div>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: "0.75rem",
                  color: "rgba(250,248,244,0.38)", lineHeight: 1.3,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual side — dashboard mockup panel */}
        <div style={{ position: "relative" }} className="landing-hero-visual">
          <HeroDashboardPreview />
        </div>
      </div>

      {/* Scroll cue */}
      <div style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        animation: "fadeUp 0.5s ease 1.2s both",
      }}>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: "0.72rem",
          color: "rgba(250,248,244,0.3)", letterSpacing: "0.15em", textTransform: "uppercase",
        }}>Scroll</span>
        <div style={{ animation: "scrollBounce 1.8s ease-in-out infinite" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="rgba(250,248,244,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </section>
  );
}

// ── Hero dashboard preview card ───────────────────────────────────
function HeroDashboardPreview() {

  const students = [
    { name: "Sarah K.",  score: 84, label: "Engaged",    color: "var(--sage)"  },
    { name: "James M.",  score: 61, label: "Moderate",   color: "var(--gold)"  },
    { name: "Aisha R.",  score: 91, label: "Engaged",    color: "var(--sage)"  },
    { name: "Leo T.",    score: 38, label: "Disengaged", color: "var(--danger)"},
  ];

  return (
    <div style={{
      borderRadius: "var(--radius-xl)", overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
      background: "#0A1628",
      transform: "perspective(900px) rotateY(-4deg) rotateX(2deg)",
      transition: "transform 0.5s ease",
    }}
    onMouseEnter={e => e.currentTarget.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)"}
    onMouseLeave={e => e.currentTarget.style.transform = "perspective(900px) rotateY(-4deg) rotateX(2deg)"}
    >
      {/* Fake browser chrome */}
      <div style={{
        padding: "11px 16px",
        background: "rgba(0,0,0,0.3)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 7,
      }}>
        {["#C0392B","#E8B45A","#3D7A5F"].map((c, i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.8 }}/>
        ))}
        <div style={{
          marginLeft: 10, padding: "3px 14px", borderRadius: 5,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "rgba(250,248,244,0.3)",
        }}>localhost:3000/dashboard</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--sage-light)",
            animation: "livePulse 2s infinite",
            boxShadow: "0 0 5px var(--sage)",
          }}/>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--sage-light)", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* Stat mini-cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Monitoring", value: "4", color: "var(--sage)"  },
            { label: "Class Avg",  value: "69%", color: "var(--gold)" },
            { label: "Engaged",    value: "3/4",  color: "var(--sage)" },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderTop: `2px solid ${s.color}`,
            }}>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.62rem", color: "rgba(250,248,244,0.35)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Student rows */}
        <div style={{
          borderRadius: 10, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", color: "rgba(250,248,244,0.5)", fontWeight: 600 }}>Student Engagement</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "rgba(250,248,244,0.25)" }}>updates every 20s</span>
          </div>
          {students.map((s, i) => (
            <div key={i} style={{
              padding: "9px 12px",
              borderBottom: i < students.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: `${s.color}20`, border: `1.5px solid ${s.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.62rem",
                color: s.color,
              }}>
                {s.name.split(" ").map(w => w[0]).join("")}
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "rgba(250,248,244,0.65)", flex: 1 }}>{s.name}</span>
              <div style={{ width: 50, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{ width: `${s.score}%`, height: "100%", background: s.color, borderRadius: 2, transition: "width 0.6s ease" }}/>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.75rem", color: s.color, width: 30 }}>{s.score}%</span>
              <span style={{
                padding: "2px 7px", borderRadius: 10, fontSize: "0.62rem", fontWeight: 700,
                background: `${s.color}18`, color: s.color,
              }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.72rem", color: "rgba(250,248,244,0.45)", marginBottom: 8, fontWeight: 600 }}>Engagement Timeline</div>
          <svg viewBox="0 0 280 60" style={{ width: "100%", height: 60 }}>
            <defs>
              <linearGradient id="lineG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3D7A5F"/>
                <stop offset="100%" stopColor="#E8B45A"/>
              </linearGradient>
              <linearGradient id="fillG" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3D7A5F" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#3D7A5F" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,45 L35,30 L70,18 L105,28 L140,12 L175,22 L210,10 L245,16 L280,14" fill="none" stroke="url(#lineG)" strokeWidth="1.8"/>
            <path d="M0,45 L35,30 L70,18 L105,28 L140,12 L175,22 L210,10 L245,16 L280,14 L280,60 L0,60 Z" fill="url(#fillG)"/>
            {[0,35,70,105,140,175,210,245,280].map((x, i) => {
              const ys = [45,30,18,28,12,22,10,16,14];
              return <circle key={i} cx={x} cy={ys[i]} r="2.5" fill="#E8B45A" opacity="0.8"/>;
            })}
            {["C1","C2","C3","C4","C5","C6","C7","C8","C9"].map((l,i) => (
              <text key={i} x={i*35} y="60" textAnchor="middle" fill="rgba(250,248,244,0.2)" fontSize="6" fontFamily="monospace">{l}</text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Divider between navy and cream sections ───────────────────────
function SectionDivider({ flip }) {
  return (
    <div style={{ lineHeight: 0, background: flip ? "var(--navy)" : "var(--bg)" }}>
      <svg viewBox="0 0 1200 40" style={{ display: "block", width: "100%" }} preserveAspectRatio="none">
        <path
          d={flip ? "M0,40 Q600,0 1200,40 L1200,0 L0,0 Z" : "M0,0 Q600,40 1200,0 L1200,40 L0,40 Z"}
          fill={flip ? "var(--bg)" : "var(--navy)"}
        />
      </svg>
    </div>
  );
}

// ── Section label (pill) ──────────────────────────────────────────
function SectionPill({ label, dark }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
    }}>
      <div style={{ width: 20, height: 1.5, background: dark ? "rgba(250,248,244,0.3)" : "var(--sage)", borderRadius: 2 }}/>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: "0.72rem", fontWeight: 700,
        letterSpacing: "0.2em", textTransform: "uppercase",
        color: dark ? "rgba(250,248,244,0.45)" : "var(--sage)",
      }}>{label}</span>
      <div style={{ width: 20, height: 1.5, background: dark ? "rgba(250,248,244,0.3)" : "var(--sage)", borderRadius: 2 }}/>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: "👁",
      title: "Real-Time Engagement Detection",
      desc: "OpenCV scans facial expressions, gaze direction, and head pose every 20 seconds — no cameras set up in advance needed.",
      accent: "var(--sage)",
    },
    {
      icon: "⌨️",
      title: "Behavioral Interaction Tracking",
      desc: "Keystroke dynamics and mouse activity patterns are captured and fused with visual data to produce a richer engagement signal.",
      accent: "var(--gold)",
    },
    {
      icon: "📊",
      title: "Teacher Monitoring Dashboard",
      desc: "A live per-student table and timeline chart gives teachers an immediate, class-wide view of engagement as it unfolds.",
      accent: "var(--sage)",
    },
    {
      icon: "🧠",
      title: "AI Engagement Analytics",
      desc: "XGBoost classifies each student as Engaged, Moderately Engaged, or Disengaged — with confidence scores updated each cycle.",
      accent: "var(--gold)",
    },
  ];

  return (
    <section id="features" style={{ background: "var(--bg)", padding: "80px 5% 100px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill label="Capabilities"/>
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "var(--text-primary)",
            letterSpacing: "-0.02em", margin: 0,
          }}>Four Modules.<br/> One Seamless System.</h2>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "1rem",
            color: "var(--text-muted)", maxWidth: 520, margin: "14px auto 0", lineHeight: 1.8,
          }}>
            E-ENGAGE combines computer vision, HCI behavioural data, and machine learning
            into one lightweight, privacy-respecting classroom tool.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
          {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 0.08}/>)}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, accent, delay }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
        padding: "28px 24px",
        border: `1px solid ${hover ? accent + "40" : "var(--border-light)"}`,
        boxShadow: hover ? `0 8px 32px rgba(15,31,61,0.10), 0 0 0 1px ${accent}30` : "var(--shadow-card)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: hover ? "translateY(-5px)" : "none",
        cursor: "default",
        animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, marginBottom: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: hover ? `${accent}15` : "var(--bg)",
        border: `1px solid ${hover ? accent + "35" : "var(--border)"}`,
        fontSize: "1.4rem", transition: "all 0.25s",
      }}>{icon}</div>
      <h3 style={{
        fontFamily: "var(--font-display)", fontWeight: 600,
        fontSize: "1.05rem", color: "var(--navy)", margin: "0 0 10px",
        letterSpacing: "-0.01em",
      }}>{title}</h3>
      <p style={{
        fontFamily: "var(--font-body)", fontSize: "0.88rem",
        color: "var(--text-muted)", lineHeight: 1.75, margin: 0,
      }}>{desc}</p>
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", icon: "▶", title: "Teacher Starts Session",       desc: "Select a class, set the monitoring interval, and click Start. Students are notified automatically within seconds." },
    { num: "02", icon: "🤖", title: "AI Analyses in the Background", desc: "Every 20 seconds, the system captures camera data and HCI signals, fuses them, and produces an engagement score via XGBoost." },
    { num: "03", icon: "📈", title: "Live Insights for Teachers",    desc: "The teacher dashboard updates in real time — per-student scores, timeline charts, and overall class engagement statistics." },
  ];

  return (
    <section id="how-it-works" style={{ background: "var(--navy)", padding: "100px 5%", position: "relative" }}>
      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(250,248,244,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(250,248,244,0.02) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}/>
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <SectionPill label="Process" dark/>
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "var(--cream)",
            letterSpacing: "-0.02em", margin: 0,
          }}>How E-ENGAGE Works</h2>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "1rem",
            color: "rgba(250,248,244,0.45)", maxWidth: 520, margin: "14px auto 0", lineHeight: 1.8,
          }}>
            Three automated steps from session start to actionable insights — no manual effort required.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} className="landing-steps-grid">
          {steps.map((s, i) => (
            <StepCard key={i} {...s} delay={i * 0.12} last={i === steps.length - 1}/>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ num, icon, title, desc, delay, last }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {/* Connector line */}
      {!last && (
        <div style={{
          position: "absolute", top: 36, right: -12, width: 24,
          display: "flex", justifyContent: "center", gap: 4,
          zIndex: 2,
        }}>
          {[0,1,2].map(j => (
            <div key={j} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "rgba(201,150,58,0.5)",
              animation: `livePulse 1.6s ease-in-out ${j * 0.3}s infinite`,
            }}/>
          ))}
        </div>
      )}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: "28px 24px", borderRadius: "var(--radius-lg)",
          background: hover ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${hover ? "rgba(201,150,58,0.3)" : "rgba(255,255,255,0.07)"}`,
          transition: "all 0.25s",
          animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
        }}
      >
        <div style={{
          fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: "0.72rem",
          color: "rgba(201,150,58,0.6)", letterSpacing: "0.15em", marginBottom: 16,
        }}>STEP {num}</div>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", marginBottom: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(61,122,95,0.15)", border: "1px solid rgba(61,122,95,0.25)",
          fontSize: "1.3rem",
          boxShadow: hover ? "0 0 20px rgba(61,122,95,0.2)" : "none",
          transition: "all 0.25s",
        }}>{icon}</div>
        <h3 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: "1.05rem", color: "var(--cream)",
          letterSpacing: "-0.01em", margin: "0 0 10px",
        }}>{title}</h3>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "0.87rem",
          color: "rgba(250,248,244,0.45)", lineHeight: 1.75, margin: 0,
        }}>{desc}</p>
      </div>
    </div>
  );
}

// ── Benefits ──────────────────────────────────────────────────────
function Benefits() {
  const items = [
    { icon: "⚡", title: "Improve Classroom Engagement",    desc: "Spot disengaged students the moment it happens, not after class ends." },
    { icon: "🔍", title: "Detect Student Distractions",     desc: "Behavioural signals pinpoint exactly when and why attention drops." },
    { icon: "💡", title: "AI-Powered Learning Insights",    desc: "Machine learning turns raw sensor data into clear, actionable guidance." },
    { icon: "📐", title: "Data-Driven Teaching Support",    desc: "Evidence-based cycle reports help teachers adapt delivery in real time." },
    { icon: "🔒", title: "Privacy-First Architecture",      desc: "All processing is local — no student footage is stored or transmitted." },
    { icon: "🎓", title: "Built for Higher Education",      desc: "Designed and tested in real university digital learning environments." },
  ];

  return (
    <section style={{ background: "var(--bg)", padding: "100px 5%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionPill label="Why E-ENGAGE"/>
          <h2 style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "var(--text-primary)",
            letterSpacing: "-0.02em", margin: 0,
          }}>Benefits That Matter</h2>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "1rem",
            color: "var(--text-muted)", maxWidth: 500, margin: "14px auto 0", lineHeight: 1.8,
          }}>Real advantages for teachers and institutions committed to improving learning outcomes.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {items.map((item, i) => (
            <div key={i}
              style={{
                display: "flex", gap: 14, padding: "20px 18px",
                borderRadius: "var(--radius)", background: "var(--bg-card)",
                border: "1px solid var(--border-light)", boxShadow: "var(--shadow-card)",
                transition: "all 0.22s",
                animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--sage)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(61,122,95,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg)", border: "1px solid var(--border)", fontSize: "1.2rem",
              }}>{item.icon}</div>
              <div>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 600,
                  fontSize: "0.95rem", color: "var(--navy)", marginBottom: 5,
                }}>{item.title}</div>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: "0.83rem",
                  color: "var(--text-muted)", lineHeight: 1.6,
                }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── About ─────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" style={{ background: "var(--navy)", padding: "100px 5%", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(250,248,244,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(250,248,244,0.02) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}/>
      <div style={{
        maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1,
      }}>
        <SectionPill label="About" dark/>
        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "var(--cream)",
          letterSpacing: "-0.02em", margin: "0 0 28px",
        }}>About E-ENGAGE</h2>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "1.05rem",
          color: "rgba(250,248,244,0.55)", lineHeight: 1.9, marginBottom: 18,
        }}>
          E-ENGAGE is an AI-powered platform designed to monitor and analyse student engagement
          during digital learning sessions. By combining{" "}
          <span style={{ color: "var(--sage-light)", fontWeight: 500 }}>computer vision</span> and{" "}
          <span style={{ color: "var(--sage-light)", fontWeight: 500 }}>behavioural analytics</span>,
          the system provides teachers with real-time insights into student attention levels —
          enabling faster interventions and measurable improvements in learning outcomes.
        </p>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "0.93rem",
          color: "rgba(250,248,244,0.35)", lineHeight: 1.8,
        }}>
          Built on <span style={{ color: "var(--gold-light)", fontWeight: 500 }}>XGBoost ML</span> with OpenCV face detection,
          E-ENGAGE fuses visual and HCI signals into a single engagement score — updated every
          20 seconds, automatically, without interrupting the learning session.
        </p>

        {/* Tech stack pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 32 }}>
          {["FastAPI","React","OpenCV","XGBoost","SQLite","Python"].map(tech => (
            <span key={tech} style={{
              fontFamily: "var(--font-mono)", fontSize: "0.78rem",
              color: "rgba(250,248,244,0.5)",
              padding: "5px 12px", borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>{tech}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────
function CTA() {
  return (
    <section id="contact" style={{ background: "var(--bg)", padding: "100px 5%" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <SectionPill label="Get Started"/>
        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "clamp(1.8rem,4vw,2.8rem)", color: "var(--text-primary)",
          letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 18px",
        }}>
          Start Monitoring Student<br/>
          <span style={{ color: "var(--sage)" }}>Engagement with AI Today</span>
        </h2>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "1rem",
          color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 36,
        }}>
          Join teachers already using E-ENGAGE to transform their classrooms with live AI-driven insights.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/register" className="btn btn-sage btn-lg">Create Account →</a>
          <a href="/login" className="btn btn-outline btn-lg">Sign In</a>
        </div>
        {/* Decorative line */}
        <div style={{
          margin: "56px auto 0", width: 64, height: 1,
          background: "linear-gradient(90deg, transparent, var(--sage), transparent)",
        }}/>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  const navLinks = ["Home","Features","How It Works","About","Contact"];
  const ids      = ["home","features","how-it-works","about","contact"];
  return (
    <footer style={{
      background: "var(--navy)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "48px 5% 28px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
          <div style={{ maxWidth: 260 }}>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem",
              color: "var(--cream)", marginBottom: 10, letterSpacing: "-0.01em",
            }}>
              E<span style={{ color: "var(--gold-light)" }}>-</span>ENGAGE
            </div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: "0.82rem",
              color: "rgba(250,248,244,0.35)", lineHeight: 1.7,
            }}>
              AI Driven Student Attention Detection System. Built for modern education.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {navLinks.map((l, i) => (
              <button key={l} onClick={() => scrollTo(ids[i])} style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: "0.85rem",
                color: "rgba(250,248,244,0.4)", padding: "4px 0",
                transition: "color 0.18s",
              }}
              onMouseEnter={e => e.target.style.color = "rgba(250,248,244,0.75)"}
              onMouseLeave={e => e.target.style.color = "rgba(250,248,244,0.4)"}
              >{l}</button>
            ))}
            <a href="https://github.com/Sahan-2002/E-ENGAGE" target="_blank" rel="noreferrer" style={{
              fontFamily: "var(--font-body)", fontSize: "0.85rem",
              color: "rgba(250,248,244,0.4)", textDecoration: "none",
              transition: "color 0.18s", display: "flex", alignItems: "center", gap: 5,
            }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(250,248,244,0.75)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(250,248,244,0.4)"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>

        <div style={{
          paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "rgba(250,248,244,0.22)" }}>
            © 2025 E-ENGAGE. All rights reserved.
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "rgba(250,248,244,0.18)" }}>
            FastAPI · React · OpenCV · XGBoost · SQLite
          </span>
        </div>
      </div>
    </footer>
  );
}

// ── Root ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1);   }
          50%      { opacity:0.4; transform:scale(1.3); }
        }
        @keyframes scrollBounce {
          0%,100% { transform:translateY(0);  }
          50%     { transform:translateY(5px); }
        }

        .landing-desktop-nav { display: flex !important; }
        .landing-hamburger   { display: none  !important; }

        @media (max-width: 900px) {
          .landing-desktop-nav { display: none  !important; }
          .landing-hamburger   { display: flex  !important; }
          .landing-hero-grid   { grid-template-columns: 1fr !important; }
          .landing-hero-visual { display: none !important; }
          .landing-steps-grid  { grid-template-columns: 1fr !important; }
        }

        /* Dark mode overrides for inline-styled sections */
        [data-theme="dark"] #features,
        [data-theme="dark"] #contact,
        [data-theme="dark"] section:not(#how-it-works):not(#about) {
          background-color: #0D1829 !important;
        }
        [data-theme="dark"] #how-it-works,
        [data-theme="dark"] #about {
          background-color: #060E1A !important;
        }
        [data-theme="dark"] footer {
          background-color: #060E1A !important;
        }
      `}</style>

      {!loaded && <LoadingScreen onDone={() => setLoaded(true)}/>}

      {loaded && (
        <div style={{ background: "var(--bg)" }}>
          <Navbar/>
          <Hero/>
          <SectionDivider flip={false}/>
          <Features/>
          <SectionDivider flip={true}/>
          <HowItWorks/>
          <SectionDivider flip={false}/>
          <Benefits/>
          <SectionDivider flip={true}/>
          <About/>
          <SectionDivider flip={false}/>
          <CTA/>
          <SectionDivider flip={true}/>
          <Footer/>
        </div>
      )}
    </>
  );
}
