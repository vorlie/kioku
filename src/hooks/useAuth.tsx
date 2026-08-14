import { invoke } from "@tauri-apps/api/core";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearAniListCache } from "./useAniList";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  startOAuth: () => Promise<string>;
  checkOAuthToken: () => Promise<string | null>;
  stopOAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const authenticated = await invoke<boolean>("is_authenticated");
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error("Failed to check authentication status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    await invoke("login", { accessToken: token });
    clearAniListCache();
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await invoke("logout");
    clearAniListCache();
    setIsAuthenticated(false);
  };

  const startOAuth = async () => {
    return await invoke<string>("start_auth_server");
  };

  const checkOAuthToken = async () => {
    return await invoke<string | null>("check_auth_token");
  };

  const stopOAuth = async () => {
    await invoke("stop_auth_server");
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, checkAuth, startOAuth, checkOAuthToken, stopOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
