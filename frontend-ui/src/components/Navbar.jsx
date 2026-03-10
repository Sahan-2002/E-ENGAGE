import { useLocation, useNavigate, Link } from "react-router-dom";
import { logout, getUser, isTeacher } from "../services/auth";
import { LayoutDashboard, History, Settings, LogOut } from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user     = getUser();
  

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const links = [
    { path: "/dashboard", icon: <LayoutDashboard size={15}/>, label: "Dashboard" },
    { path: "/history",   icon: <History size={15}/>,         label: "History"   },
    { path: "/settings",  icon: <Settings size={15}/>,        label: "Settings"  },
  ];

  return (
    <nav className="navbar">
      {/* Brand */}
      <Link to="/dashboard" className="navbar-brand">
        E<span>-</span>ENGAGE<span style={{ color: "rgba(250,248,244,0.25)", marginLeft: 1 }}>.</span>
      </Link>

      {/* Nav links */}
      <ul className="navbar-nav">
        {links.map(l => (
          <li key={l.path}>
            <Link
              to={l.path}
              className={`nav-link${location.pathname === l.path ? " active" : ""}`}
            >
              {l.icon} {l.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* User */}
      <div className="navbar-user">
        <div className="user-avatar">{initials}</div>
        <div>
          <div className="user-name">{user?.name || "User"}</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(250,248,244,0.38)", textTransform: "capitalize" }}>
            {user?.role || "—"}
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={13}/> Logout
        </button>
      </div>
    </nav>
  );
}
