// services/auth.js

const TOKEN_KEY = "eengage_token";
const USER_KEY  = "eengage_user";

export function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isTeacher() {
  return getUser()?.role === "teacher";
}

export function isStudent() {
  return getUser()?.role === "student";
}

export function login(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginWithCredentials(email, password) {
  try {
    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.detail || "Login failed" };
    }

    const data = await res.json();
    login(data.token, data.user);
    return { success: true, user: data.user };

  } catch {
    // Fallback for when backend is not running
    const fallback = {
      "teacher@eengage.com": { password: "password123", name: "Dr. Smith",    role: "teacher" },
      "student@eengage.com": { password: "student123",  name: "Alex Johnson", role: "student" },
    };
    const u = fallback[email];
    if (u && u.password === password) {
      const user = { email, name: u.name, role: u.role };
      login("offline-token", user);
      return { success: true, user };
    }
    return { success: false, error: "Invalid email or password" };
  }
}
