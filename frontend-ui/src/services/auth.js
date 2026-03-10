// frontend-ui/src/services/auth.js
// Real JWT auth — stores token + user in localStorage

const BASE = "http://127.0.0.1:8000";

// ── Storage helpers ────────────────────────────────────────────────
export function getToken()  { return localStorage.getItem("eengage_token"); }
export function getUser()   {
  try { return JSON.parse(localStorage.getItem("eengage_user")); }
  catch { return null; }
}
export function isAuthenticated() { return !!getToken(); }
export function isTeacher()       { return getUser()?.role === "teacher"; }
export function isStudent()       { return getUser()?.role === "student"; }

// ── Register ───────────────────────────────────────────────────────
export async function register(name, email, password, role) {
  const res = await fetch(`${BASE}/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");

  localStorage.setItem("eengage_token", data.token);
  localStorage.setItem("eengage_user",  JSON.stringify(data.user));
  return data;
}

// ── Login ──────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await fetch(`${BASE}/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Invalid credentials");

  localStorage.setItem("eengage_token", data.token);
  localStorage.setItem("eengage_user",  JSON.stringify(data.user));
  return data;
}

// ── Logout ─────────────────────────────────────────────────────────
export function logout() {
  localStorage.removeItem("eengage_token");
  localStorage.removeItem("eengage_user");
}

// ── Legacy alias (used in some components) ─────────────────────────
export const loginWithCredentials = login;
