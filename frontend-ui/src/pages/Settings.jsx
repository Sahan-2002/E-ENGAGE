import { useState } from "react";
import Navbar from "../components/Navbar";
import { getUser } from "../services/auth";
import { Save, User, Sliders, Eye, Mouse } from "lucide-react";

function Toggle({ on, onChange }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)} type="button">
      <div className="toggle-thumb" />
    </button>
  );
}

export default function Settings() {
  const user = getUser();
  const [threshold, setThreshold]   = useState(70);
  const [visualMod, setVisualMod]   = useState(true);
  const [behavMod, setBehavMod]     = useState(true);
  const [name, setName]             = useState(user?.name || "");
  const [email, setEmail]           = useState(user?.email || "");
  const [saved, setSaved]           = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-body">

        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Configure your monitoring preferences and profile</p>
        </div>

        <div className="grid-2" style={{ maxWidth:860 }}>

          {/* Detection Settings */}
          <div className="card fade-up">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Sliders size={16} /> Detection Config
                </div>
                <div className="card-subtitle">Thresholds and module toggles</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Engagement Threshold (%)</label>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <input
                  type="range" min={30} max={90} value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  style={{ flex:1, accentColor:"var(--primary)" }}
                />
                <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem", color:"var(--primary)", minWidth:38, textAlign:"right" }}>
                  {threshold}%
                </span>
              </div>
              <p style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>
                Students below this threshold are flagged as disengaged.
              </p>
            </div>

            <div className="divider" />

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Eye size={16} style={{ color:"var(--primary)" }} />
                  <div>
                    <div style={{ fontSize:"0.88rem", fontWeight:600 }}>Visual Module</div>
                    <div style={{ fontSize:"0.76rem", color:"var(--text-muted)" }}>Eye openness & head pose</div>
                  </div>
                </div>
                <Toggle on={visualMod} onChange={setVisualMod} />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Mouse size={16} style={{ color:"var(--purple)" }} />
                  <div>
                    <div style={{ fontSize:"0.88rem", fontWeight:600 }}>Behavioral Module</div>
                    <div style={{ fontSize:"0.76rem", color:"var(--text-muted)" }}>Typing speed & mouse activity</div>
                  </div>
                </div>
                <Toggle on={behavMod} onChange={setBehavMod} />
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className="card fade-up-2">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <User size={16} /> Profile
                </div>
                <div className="card-subtitle">Update your account information</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width:"100%" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width:"100%" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <input
                className="form-input"
                value={user?.role || "teacher"}
                disabled
                style={{ width:"100%", opacity:0.6 }}
              />
            </div>

            <button className="btn btn-primary" style={{ width:"100%", marginTop:8 }} onClick={handleSave}>
              {saved ? "✓ Saved!" : <><Save size={15} /> Save Changes</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
