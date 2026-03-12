// frontend-ui/src/App.jsx  v4 — adds ThemeProvider
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login              from "./pages/Login";
import Register           from "./pages/Register";
import LandingPage        from "./pages/LandingPage";
import TeacherDashboard   from "./pages/TeacherDashboard";
import StudentDashboard   from "./pages/StudentDashboard";
import History            from "./pages/History";
import Settings           from "./pages/Settings";
import { ThemeProvider }  from "./context/ThemeContext";
import { isAuthenticated, isTeacher, isStudent } from "./services/auth";
import "./App.css";

// ── Loading Screen ─────────────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setExiting(true); setTimeout(onDone, 600); }, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`loading-screen${exiting ? " exit" : ""}`}>
      <div>
        <div className="loading-wordmark">
          <span className="loading-wordmark-text">E<span>-</span>ENGAGE<span>.</span></span>
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

// ── Page progress bar ──────────────────────────────────────────────
function PageProgress() {
  const location = useLocation();
  const [width,   setWidth]   = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true); setWidth(0);
    const t1 = setTimeout(() => setWidth(80),  50);
    const t2 = setTimeout(() => setWidth(100), 350);
    const t3 = setTimeout(() => { setVisible(false); setWidth(0); }, 650);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [location.pathname]);
  if (!visible && width === 0) return null;
  return (
    <div className="page-progress-bar" style={{
      width: `${width}%`, opacity: visible ? 1 : 0,
      transition: width === 0 ? "none" : "width 0.35s ease, opacity 0.25s ease",
    }}/>
  );
}

// ── Route guards ───────────────────────────────────────────────────
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}
function PublicRoute({ children }) {
  return !isAuthenticated() ? children : <Navigate to="/dashboard" replace />;
}
function DashboardRouter() {
  if (isTeacher()) return <TeacherDashboard />;
  if (isStudent()) return <StudentDashboard />;
  return <Navigate to="/login" replace />;
}

// ── App shell ──────────────────────────────────────────────────────
function AppShell() {
  return (
    <>
      <PageProgress />
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/login"     element={<PublicRoute><Login    /></PublicRoute>} />
        <Route path="/register"  element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardRouter /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History  /></PrivateRoute>} />
        <Route path="/settings"  element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  return (
    <ThemeProvider>
      <BrowserRouter>
        {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
        {loaded   && <AppShell />}
      </BrowserRouter>
    </ThemeProvider>
  );
}
