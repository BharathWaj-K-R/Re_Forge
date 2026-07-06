import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

type User = { id: number; email: string; name: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<{ error: string | null; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<string | null>;
  resendOtp: (email: string) => Promise<string | null>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<string | null>;
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

  async function register(email: string, password: string, name: string): Promise<{ error: string | null; email?: string }> {
    if (!API_URL) return { error: "API URL not configured" };
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: err.detail || `Registration failed (${res.status})` };
      }
      const data = await res.json();
      return { error: null, email: data.email };
    } catch (e: any) {
      return { error: e.message || "Registration failed" };
    }
  }

  async function verifyOtp(email: string, otp: string): Promise<string | null> {
    if (!API_URL) return "API URL not configured";
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Verification failed (${res.status})`;
      }
      const data = await res.json();
      saveSession(data.user, data.access_token);
      return null;
    } catch (e: any) {
      return e.message || "Verification failed";
    }
  }

  async function resendOtp(email: string): Promise<string | null> {
    if (!API_URL) return "API URL not configured";
    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Failed to resend OTP (${res.status})`;
      }
      return null;
    } catch (e: any) {
      return e.message || "Failed to resend OTP";
    }
  }

  async function forgotPassword(email: string): Promise<string | null> {
    if (!API_URL) return "API URL not configured";
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Failed to send reset code (${res.status})`;
      }
      return null;
    } catch (e: any) {
      return e.message || "Failed to send reset code";
    }
  }

  async function resetPassword(email: string, otp: string, newPassword: string): Promise<string | null> {
    if (!API_URL) return "API URL not configured";
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.detail || `Failed to reset password (${res.status})`;
      }
      return null;
    } catch (e: any) {
      return e.message || "Failed to reset password";
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
    <AuthContext.Provider value={{ user, token, login, register, verifyOtp, resendOtp, forgotPassword, resetPassword, logout, deleteAccount, clearHistory, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
