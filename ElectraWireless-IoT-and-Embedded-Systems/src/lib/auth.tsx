import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Simple app login.
 * The user types the ElectraWireless username and their own name,
 * so the app can greet them ("Welcome, Kavya").
 *
 * NOTE: the username lives inside the app, so this is a simple lock screen,
 * not real security.
 */
const APP_USERNAME = "electrawireless";
const STORAGE_KEY = "elly_user";

export interface AppUser {
  name: string;
}

interface AuthContextValue {
  user: AppUser | null;
  /** Returns an error message, or null when login worked. */
  login: (username: string, name: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AppUser | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(loadUser);

  const login = (username: string, name: string) => {
    const cleanName = name.trim();
    if (username.trim().toLowerCase() !== APP_USERNAME) return "Wrong username";
    if (!cleanName) return "Enter your name";
    const u = { name: cleanName };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    return null;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}