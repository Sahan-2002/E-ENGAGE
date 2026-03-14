import { useState } from "react";
import Navbar from "../components/Navbar";
import ThemeToggle from "../components/ThemeToggle";
import { getUser, setUser } from "../services/auth";
import { updateProfile, changePassword, deleteAllMyData } from "../services/api";
import {
  User, Lock, Trash2, CheckCircle, AlertCircle,
  Eye, EyeOff, ChevronRight, Shield, Palette,
} from "lucide-react";

// ── Small helpers ──────────────────────────────────────────────────
function Section({ title, subtitle, icon, children, accent = "var(--navy)" }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20,
        paddingBottom: 16, borderBottom: "1px solid var(--border-light)",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${accent}18`, border: `1.5px solid ${accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent,
        }}>
          {icon}
        </div>
        <div>
          <div className="card-title">{title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toast({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "11px 15px", borderRadius: "var(--radius-sm)",
      marginBottom: 16,
      background: isError ? "rgba(192,57,43,0.07)" : "rgba(61,122,95,0.07)",
      border: `1px solid ${isError ? "rgba(192,57,43,0.2)" : "rgba(61,122,95,0.2)"}`,
      color: isError ? "var(--danger)" : "var(--sage)",
      fontSize: "0.85rem", fontWeight: 500,
    }}>
      {isError ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
      {message}
    </div>
  );
}

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          className="form-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 42 }}
        />
        <button type="button" onClick={() => setShow(v => !v)} style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", display: "flex", alignItems: "center",
          padding: 0,
        }}>
          {show ? <EyeOff size={15}/> : <Eye size={15}/>}
        </button>
      </div>
    </div>
  );
}

// ── Password strength indicator ────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "var(--danger)", "var(--warning)", "var(--gold)", "var(--sage)"];
  return (
    <div style={{ marginTop: -10, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : "var(--border)",
            transition: "background 0.3s",
          }}/>
        ))}
      </div>
      <div style={{ fontSize: "0.72rem", color: colors[score], fontWeight: 600 }}>
        {labels[score]}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function Settings() {
  const user = getUser();
  const isTeacher = user?.role === "teacher";

  // ── Profile state ──────────────────────────────────────────────
  const [name,         setName]         = useState(user?.name  || "");
  const [email,        setEmail]        = useState(user?.email || "");
  const [profileMsg,   setProfileMsg]   = useState({ type: "", text: "" });
  const [profileSaving,setProfileSaving]= useState(false);

  // ── Password state ─────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwMsg,      setPwMsg]      = useState({ type: "", text: "" });
  const [pwSaving,   setPwSaving]   = useState(false);

  // ── Danger zone (teacher only) ─────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteMsg,     setDeleteMsg]     = useState({ type: "", text: "" });

  // ── Handlers ───────────────────────────────────────────────────
  async function handleProfileSave(e) {
    e.preventDefault();
    if (!name.trim())  return setProfileMsg({ type:"error", text:"Name cannot be empty." });
    if (!email.trim()) return setProfileMsg({ type:"error", text:"Email cannot be empty." });
    if (!/\S+@\S+\.\S+/.test(email)) return setProfileMsg({ type:"error", text:"Enter a valid email address." });

    setProfileSaving(true); setProfileMsg({ type:"", text:"" });
    try {
      const data = await updateProfile({ name: name.trim(), email: email.trim() });
      // Update localStorage so Navbar reflects the new name immediately
      setUser({ ...user, name: data.name, email: data.email });
      setProfileMsg({ type:"success", text:"Profile updated successfully." });
    } catch (err) {
      setProfileMsg({ type:"error", text: err.message });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!currentPw)        return setPwMsg({ type:"error", text:"Enter your current password." });
    if (newPw.length < 6)  return setPwMsg({ type:"error", text:"New password must be at least 6 characters." });
    if (newPw !== confirmPw) return setPwMsg({ type:"error", text:"New passwords do not match." });

    setPwSaving(true); setPwMsg({ type:"", text:"" });
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      setPwMsg({ type:"success", text:"Password changed successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwMsg({ type:"error", text: err.message });
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAllData() {
    setDeleting(true); setDeleteMsg({ type:"", text:"" });
    try {
      await deleteAllMyData();
      setDeleteMsg({ type:"success", text:"All class and session data deleted." });
      setConfirmDelete(false);
    } catch (err) {
      setDeleteMsg({ type:"error", text: err.message });
    } finally {
      setDeleting(false);
    }
  }

  // ── Avatar initials ────────────────────────────────────────────
  const initials = name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "?";

  return (
    <div className="main-content">
      <Navbar/>
      <div className="page-body">

        {/* ── Page header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, gap:12 }}>
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-desc">
              {isTeacher ? "Manage your teacher account" : "Manage your student account"}
            </p>
          </div>
          <span className={`badge ${isTeacher ? "badge-gold" : "badge-sage"}`}>
            {isTeacher ? "👨‍🏫 Teacher" : "👨‍🎓 Student"}
          </span>
        </div>

        <div style={{ maxWidth: 720 }}>

          {/* ── Account overview card ── */}
          <div className="card fade-up" style={{
            marginBottom: 16,
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)",
            border: "none",
            padding: "24px 28px",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:18 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, var(--sage), var(--navy-light))",
                border: "3px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 800,
                fontSize: "1.2rem", color: "white",
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: "1.15rem", color: "var(--cream)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {name || "—"}
                </div>
                <div style={{ fontSize: "0.82rem", color: "rgba(250,248,244,0.55)", marginTop: 2 }}>
                  {email}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <ThemeToggle/>
              </div>
            </div>
          </div>

          {/* ── Profile section ── */}
          <Section
            title="Profile"
            subtitle="Update your name and email address"
            icon={<User size={17}/>}
            accent="var(--navy)"
          >
            <Toast type={profileMsg.type} message={profileMsg.text}/>
            <form onSubmit={handleProfileSave}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" className="form-input"
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email" className="form-input"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  className="form-input" value={user?.role || "—"} disabled
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                />
                <div style={{ fontSize:"0.74rem", color:"var(--text-muted)", marginTop:5 }}>
                  Role cannot be changed after registration.
                </div>
              </div>
              <button
                type="submit" className="btn btn-primary"
                disabled={profileSaving}
                style={{ minWidth: 140 }}
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </Section>

          {/* ── Password section ── */}
          <Section
            title="Change Password"
            subtitle="Use a strong password of at least 6 characters"
            icon={<Lock size={17}/>}
            accent="var(--sage)"
          >
            <Toast type={pwMsg.type} message={pwMsg.text}/>
            <form onSubmit={handlePasswordChange}>
              <PasswordInput
                label="Current Password"
                value={currentPw}
                onChange={setCurrentPw}
                placeholder="Enter current password"
              />
              <PasswordInput
                label="New Password"
                value={newPw}
                onChange={setNewPw}
                placeholder="Enter new password"
              />
              <PasswordStrength password={newPw}/>
              <PasswordInput
                label="Confirm New Password"
                value={confirmPw}
                onChange={setConfirmPw}
                placeholder="Re-enter new password"
              />
              <button
                type="submit" className="btn btn-sage"
                disabled={pwSaving}
                style={{ minWidth: 160 }}
              >
                {pwSaving ? "Updating..." : "Update Password"}
              </button>
            </form>
          </Section>

          {/* ── Appearance section ── */}
          <Section
            title="Appearance"
            subtitle="Switch between light and dark mode"
            icon={<Palette size={17}/>}
            accent="var(--gold)"
          >
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontSize:"0.88rem", fontWeight:600, color:"var(--text-primary)" }}>
                  Theme
                </div>
                <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop:2 }}>
                  Your theme preference is saved automatically.
                </div>
              </div>
              <ThemeToggle/>
            </div>
          </Section>

          {/* ── Teacher-only: Danger zone ── */}
          {isTeacher && (
            <Section
              title="Danger Zone"
              subtitle="Irreversible actions — proceed with caution"
              icon={<Shield size={17}/>}
              accent="var(--danger)"
            >
              <Toast type={deleteMsg.type} message={deleteMsg.text}/>

              <div style={{
                border: "1.5px solid rgba(192,57,43,0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 18px",
                background: "rgba(192,57,43,0.03)",
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:"0.88rem", fontWeight:700, color:"var(--text-primary)", marginBottom:3 }}>
                      Delete All Class Data
                    </div>
                    <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", maxWidth:380 }}>
                      Permanently deletes all sessions and engagement records across all your classes. Student accounts are not affected.
                    </div>
                  </div>
                  {!confirmDelete ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setConfirmDelete(true)}
                      style={{ flexShrink:0 }}
                    >
                      <Trash2 size={13}/> Delete All Data
                    </button>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:"0.8rem", fontWeight:700, color:"var(--danger)" }}>
                        Are you sure?
                      </span>
                      <button
                        className="btn btn-sm"
                        onClick={handleDeleteAllData}
                        disabled={deleting}
                        style={{
                          background:"var(--danger)", color:"white",
                          border:"none", fontWeight:700,
                        }}
                      >
                        {deleting ? "Deleting..." : "Yes, delete"}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* ── Student-only: account note ── */}
          {!isTeacher && (
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"14px 18px", borderRadius:"var(--radius-sm)",
              background:"rgba(61,122,95,0.05)",
              border:"1px solid rgba(61,122,95,0.15)",
              fontSize:"0.82rem", color:"var(--text-secondary)",
            }}>
              <ChevronRight size={14} style={{ color:"var(--sage)", flexShrink:0 }}/>
              Your engagement data is managed by your teacher. Contact them to remove any records.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
