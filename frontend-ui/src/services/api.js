// frontend-ui/src/services/api.js  v2
// All API calls — auth token sent automatically

const BASE = "http://127.0.0.1:8000";

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
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed: ${path}`);
  return data;
}

// ── Classes ────────────────────────────────────────────────────────
export const createClass      = (className)           => req("POST", "/create-class",   { class_name: className });
export const getMyClasses     = ()                    => req("GET",  "/my-classes");
export const getAllClasses     = ()                    => req("GET",  "/all-classes");

// ── Classroom sessions ─────────────────────────────────────────────
export const startClassSession  = (classId, intervalMinutes) =>
  req("POST", "/start-class-session", { class_id: classId, interval_minutes: intervalMinutes });

export const stopClassSession   = (classId) =>
  req("POST", `/stop-class-session?class_id=${classId}`);

export const getClassSessionStatus = (classId) =>
  req("GET", `/class-session-status/${classId}`);

// ── CV/HCI monitoring ──────────────────────────────────────────────
export const startMonitoring    = (user, role, intervalMinutes) =>
  req("POST", "/start-monitoring",  { user, role, interval_minutes: intervalMinutes });

export const stopMonitoring     = ()   => req("POST", "/stop-monitoring");
export const getMonitoringStatus = ()  => req("GET",  "/monitoring-status");

// ── History ────────────────────────────────────────────────────────
export const getSessionHistory  = (user, role) => {
  const params = new URLSearchParams();
  if (user) params.append("user", user);
  if (role) params.append("role", role);
  return req("GET", `/session-history?${params}`);
};
