import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken, clearToken } from "../lib/api";

type User = { id: string; name: string | null; email: string };

type AuthContextData = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await api("/api/auth/me", { method: "GET" });
      setUser(data.user ?? null);
    } catch (error) {
      console.log("Erro ao carregar usuario", error);
      throw error;
    }
  }

  async function loadStorageData() {
    try {
      const token = await getToken();
      if (token) {
        await refreshUser();
      }
    } catch {
      await signOut();
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, pass: string) {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    });

    if (data?.token) {
      await setToken(data.token);
      await refreshUser();
    } else {
      throw new Error("Token nao veio no login.");
    }
  }

  async function signOut() {
    await clearToken();
    setUser(null);
  }

  useEffect(() => {
    loadStorageData();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
