// frontend-ui/src/components/Navbar.jsx  v3 — navbar-inner alignment fix
import { useNavigate, useLocation } from "react-router-dom";
import { getUser, logout } from "../services/auth";
import ThemeToggle from "./ThemeToggle";
import { LogOut, LayoutDashboard, History, Settings } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user     = getUser();

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={15}/> },
    { path: "/history",   label: "History",   icon: <History size={15}/> },
    { path: "/settings",  label: "Settings",  icon: <Settings size={15}/> },
  ];

  return (
    <nav className="navbar">
      {/* ── navbar-inner constrains content to max-width 1200px,
           matching .page-body, so brand + nav + user align with
           the page content below on wide screens. ── */}
      <div className="navbar-inner">

        {/* Brand */}
        <a href="/" className="navbar-brand">
          E<span>-</span>ENGAGE
        </a>

        {/* Nav links */}
        <ul className="navbar-nav">
          {navItems.map(item => (
            <li key={item.path}>
              <a
                href={item.path}
                className={`nav-link${location.pathname === item.path ? " active" : ""}`}
                onClick={e => { e.preventDefault(); navigate(item.path); }}
              >
                {item.icon}
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right side: theme toggle + user */}
        <div className="navbar-user">
          <ThemeToggle />
          <div className="user-avatar">{initials}</div>
          <span className="user-name">{user?.name}</span>
          <span style={{
            fontSize: "0.72rem",
            padding: "2px 8px",
            borderRadius: 10,
            background: user?.role === "teacher"
              ? "rgba(201,150,58,0.2)"
              : "rgba(61,122,95,0.2)",
            color: user?.role === "teacher"
              ? "var(--gold-light)"
              : "var(--sage-light)",
            fontWeight: 600,
            textTransform: "capitalize",
          }}>
            {user?.role}
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={13}/> Sign out
          </button>
        </div>

      </div>
    </nav>
  );
}
