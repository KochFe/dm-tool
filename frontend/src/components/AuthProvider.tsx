"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setTokens, clearTokens } from "@/lib/api";
import { AuthUser } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ["/", "/login"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await api.getMe();
        setUser(me);
      } catch {
        // Try refresh
        try {
          const tokens = await api.refreshToken();
          setTokens(tokens.access_token, tokens.refresh_token);
          const me = await api.getMe();
          setUser(me);
        } catch {
          clearTokens();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Redirect unauthenticated users away from protected pages
  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    const tokens = await api.login(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const me = await api.getMe();
    setUser(me);
    router.push("/campaigns");
  };

  // Block rendering of protected pages until auth is resolved
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const showChildren = isPublic || !loading;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {showChildren ? children : null}
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
