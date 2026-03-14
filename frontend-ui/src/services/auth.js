// frontend-ui/src/services/auth.js
import { login as apiLogin, register as apiRegister } from "./api";

const TOKEN_KEY = "eengage_token";
const USER_KEY  = "eengage_user";

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY,  JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

// Update stored user — e.g. after profile save in Settings
export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

// Aliases expected by App.jsx, History.jsx
export const isAuthenticated = isLoggedIn;

export function isTeacher() {
  return getUser()?.role === "teacher";
}

export function isStudent() {
  return getUser()?.role === "student";
}

// login / register proxy to api.js and persist auth automatically
export async function login(email, password) {
  const data = await apiLogin(email, password);
  saveAuth(data.token, data.user);
  return data;
}

export async function register(name, email, password, role) {
  const data = await apiRegister(name, email, password, role);
  saveAuth(data.token, data.user);
  return data;
}
