// frontend-ui/src/services/api.js

const BASE = "http://127.0.0.1:8000";

export async function startSession(user, role, intervalMinutes = 5) {
  const res = await fetch(`${BASE}/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user,
      role,
      interval_minutes: intervalMinutes,   // ← sent to backend
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to start session");
  }
  return res.json();
}

export async function stopSession() {
  const res = await fetch(`${BASE}/stop-session`, { method: "POST" });
  return res.json();
}

export async function getSessionStatus() {
  const res = await fetch(`${BASE}/session-status`);
  if (!res.ok) throw new Error("Failed to get session status");
  return res.json();
}

export async function getSessionHistory(user, role) {
  const params = new URLSearchParams();
  if (user) params.append("user", user);
  if (role) params.append("role", role);
  const res = await fetch(`${BASE}/session-history?${params}`);
  if (!res.ok) throw new Error("Failed to get history");
  return res.json();
}
