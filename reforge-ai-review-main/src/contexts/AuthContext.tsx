import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

type User = { id: number; email: string; name: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  logout: () => void;
  deleteAccount: () => Promise<string | null>;
  clearHistory: () => Promise<string | null>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("reforge_session");
    if (saved) {
      try {
        const { user, token } = JSON.parse(saved);
        setUser(user);
        setToken(token);
      } catch {
        localStorage.removeItem("reforge_session");
      }
    }
  }, []);

  function saveSession(userData: User, tokenStr: string) {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem("reforge_session", JSON.stringify({ user: userData, token: tokenStr }));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("reforge_session");
  }

  async function login(email: string, password: string): Promise<string | null> {
    if (!API_URL) return "API URL not configured";
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Login failed (${res.status})`;
      }
      const data = await res.json();
      saveSession(data.user, data.access_token);
      return null;
    } catch (e: any) {
      return e.message || "Login failed";
    }
  }

  async function register(email: string, password: string, name: string): Promise<string | null> {
    if (!API_URL) return "API URL not configured";
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Registration failed (${res.status})`;
      }
      const data = await res.json();
      saveSession(data.user, data.access_token);
      return null;
    } catch (e: any) {
      return e.message || "Registration failed";
    }
  }

  async function deleteAccount(): Promise<string | null> {
    if (!token) return "Not authenticated";
    try {
      const res = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Failed to delete account (${res.status})`;
      }
      logout();
      return null;
    } catch (e: any) {
      return e.message || "Failed to delete account";
    }
  }

  async function clearHistory(): Promise<string | null> {
    if (!token) return "Not authenticated";
    try {
      const res = await fetch(`${API_URL}/history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Failed to clear history (${res.status})`;
      }
      return null;
    } catch (e: any) {
      return e.message || "Failed to clear history";
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, deleteAccount, clearHistory, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
