import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api from "../services/api";
import { useRouter } from "next/router";

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      api
        .get("/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((res) => setUser(res.data))
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", res.data.access_token);
      setToken(res.data.access_token);

      const profile = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      });
      setUser(profile.data);
      router.push("/profile");
      return { success: true };
    } catch (err: any) {
      return { success: false, message: "Invalid credentials" };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const res = await api.post("/auth/register", { username, email, password });
      return { success: true, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.detail || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
