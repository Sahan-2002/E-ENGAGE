// frontend-ui/src/services/api.js  v5 — env-based API URL for deployment
//
// Development:  uses http://127.0.0.1:8000  (default fallback)
// Production:   set REACT_APP_API_URL in Vercel dashboard or .env.production
//               e.g. REACT_APP_API_URL=https://abc123.ngrok-free.app

const BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("eengage_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed: ${path}`);
  return data;
}

export const register               = (name, email, password, role) =>
  req("POST", "/register", { name, email, password, role });
export const login                  = (email, password) =>
  req("POST", "/login", { email, password });

export const createClass            = (name)            => req("POST", "/create-class",           { class_name: name });
export const getMyClasses           = ()                => req("GET",  "/my-classes");
export const getAllClasses           = ()                => req("GET",  "/all-classes");
export const startClassSession      = (classId, mins)   => req("POST", "/start-class-session",    { class_id: classId, interval_minutes: mins });
export const stopClassSession       = (classId)         => req("POST", `/stop-class-session?class_id=${classId}`);
export const getClassSessionStatus  = (classId)         => req("GET",  `/class-session-status/${classId}`);
export const submitEngagement       = (sessionId, score, label, cycle) =>
  req("POST", "/submit-engagement", { session_id: sessionId, engagement_score: score, label, cycle_number: cycle });
export const getClassEngagement     = (classId, sid)    =>
  req("GET",  `/class-engagement/${classId}${sid ? `?session_id=${sid}` : ""}`);
export const getStudentEngagement   = (sid)             =>
  req("GET",  `/student-engagement${sid ? `?session_id=${sid}` : ""}`);
export const startMonitoring        = (user, role, mins)=> req("POST", "/start-monitoring",       { user, role, interval_minutes: mins });
export const stopMonitoring         = ()                => req("POST", "/stop-monitoring");
export const getMonitoringStatus    = ()                => req("GET",  "/monitoring-status");
export const getSessionHistory      = (user, role)      => {
  const p = new URLSearchParams();
  if (user) p.append("user", user);
  if (role) p.append("role", role);
  return req("GET", `/session-history?${p}`);
};

// ── Settings ───────────────────────────────────────────────────────
export const updateProfile    = (body)                    =>
  req("PUT",    "/update-profile",   body);
export const changePassword   = (body)                    =>
  req("PUT",    "/change-password",  body);
export const deleteAllMyData  = ()                        =>
  req("DELETE", "/delete-all-my-data");

// ── Student history & delete ───────────────────────────────────────
export const getStudentHistory           = (studentId)            =>
  req("GET",    `/student-history/${studentId}`);
export const deleteStudentSessionHistory = (studentId, sessionId) =>
  req("DELETE", `/student-history/${studentId}/session/${sessionId}`);
export const deleteAllStudentHistory     = (studentId)            =>
  req("DELETE", `/student-history/${studentId}/all`);
