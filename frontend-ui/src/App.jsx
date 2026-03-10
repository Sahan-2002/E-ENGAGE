import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login    from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History  from "./pages/History";
import Settings from "./pages/Settings";
import { isAuthenticated } from "./services/auth";
import "./App.css";

// ── Loading Screen ─────────────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Show for 2.6s then exit
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
            E<span>-</span>ENGAGE<span>.</span>
          </span>
        </div>
        <div className="loading-tagline">
          AI Driven Student Attention Detection System
        </div>
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

// ── Page transition progress bar ───────────────────────────────────
function PageProgress() {
  const location = useLocation();
  const [width,   setWidth]   = useState(0);
  const [visible, setVisible] = useState(false);
  

  useEffect(() => {
    setVisible(true);
    setWidth(0);

    // Quick ramp to 80%
    const t1 = setTimeout(() => setWidth(80),  50);
    // Then jump to 100%
    const t2 = setTimeout(() => setWidth(100), 350);
    // Hide after complete
    const t3 = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 650);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [location.pathname]);

  if (!visible && width === 0) return null;

  return (
    <div
      className="page-progress-bar"
      style={{ width: `${width}%`, opacity: visible ? 1 : 0, transition: width === 0 ? "none" : "width 0.35s ease, opacity 0.25s ease" }}
    />
  );
}

// ── Route guard ────────────────────────────────────────────────────
function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

// ── App shell ──────────────────────────────────────────────────────
function AppShell() {
  return (
    <>
      <PageProgress />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/history"   element={<PrivateRoute><History   /></PrivateRoute>} />
        <Route path="/settings"  element={<PrivateRoute><Settings  /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <BrowserRouter>
      {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
      {loaded   && <AppShell />}
    </BrowserRouter>
  );
}
