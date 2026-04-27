export const AUTH_TOKEN_KEY = "research-data-platform-token";
export const AUTH_USER_KEY = "research-data-platform-user";

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.localStorage.getItem(AUTH_USER_KEY), null);
}

export function setStoredAuth(token, user) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? null));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.__API_BASE__) {
    return String(window.__API_BASE__).replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://api.cjznjcsys.xin";
  }

  return "http://127.0.0.1:8787";
}

export const API_BASE = resolveApiBase();
export const API_PREFIX = "/api/v1";

export function withApiPrefix(path) {
  return path.startsWith("/api/") ? path : `${API_PREFIX}${path}`;
}

async function parseErrorResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    return payload?.error || JSON.stringify(payload);
  }

  return response.text();
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${withApiPrefix(path)}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    const error = new Error(message || `${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}
