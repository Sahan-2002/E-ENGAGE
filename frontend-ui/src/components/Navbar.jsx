import { useNavigate, NavLink } from "react-router-dom";
import { logout, getUser } from "../services/auth";
import { LayoutDashboard, History, Settings, LogOut } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase()
    : "U";

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        E‑ENGAGE<span>.</span>
      </div>

      <div className="navbar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            <LayoutDashboard size={15} /> Dashboard
          </span>
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            <History size={15} /> History
          </span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
        >
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Settings size={15} /> Settings
          </span>
        </NavLink>
      </div>

      <div className="navbar-right">
        <div className="navbar-user">
          <div className="user-avatar">{initials}</div>
          <span>{user?.name || "Teacher"}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          <LogOut size={15} /> Logout
        </button>
      </div>
    </nav>
  );
}
