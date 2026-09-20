"use client";

import apiConfig from "@/shared/apiconfig";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  affiliation: string | null;
  country: string | null;
  phone: string | null;
  role: "ADMIN" | "ORGANIZER" | "SPEAKER" | "ATTENDEE";
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  loading: boolean;
  setIsLoggedIn: (value: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setIsLoggedIn(false);
      return;
    }

    const { data } = await apiConfig.get<AuthUser>("/api/auth/me");
    setUser(data);
    setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      loading,
      setIsLoggedIn,
      setUser,
      refreshUser,
      logout,
    }),
    [user, isLoggedIn, loading, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
