import { useEffect, useState } from "react";
import { apiJson, clearStoredAuth, getStoredToken, getStoredUser, setStoredAuth } from "../upload/api";

export function useAuthController() {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        if (!cancelled) {
          setBootstrapping(false);
        }
        return;
      }

      try {
        const result = await apiJson("/auth/me");
        if (!cancelled) {
          setUser(result?.user ?? null);
          setStoredAuth(storedToken, result?.user ?? null);
        }
      } catch {
        clearStoredAuth();
        if (!cancelled) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const result = await apiJson("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const nextToken = result?.token || "";
    const nextUser = result?.user || null;
    setStoredAuth(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    return result;
  }

  async function logout() {
    try {
      if (getStoredToken()) {
        await apiJson("/auth/logout", { method: "POST" });
      }
    } catch {
      // Clear client state even if the server session is already invalid.
    }

    clearStoredAuth();
    setToken("");
    setUser(null);
  }

  return {
    token,
    user,
    bootstrapping,
    authed: Boolean(token),
    isAdmin: user?.role === "admin",
    login,
    logout,
  };
}
