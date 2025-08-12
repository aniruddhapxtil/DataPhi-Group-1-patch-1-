// ✅ FIXED: context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useRouter } from 'next/router';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api
        .get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUser(res.data))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      localStorage.setItem('token', res.data.access_token);

      const profile = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${res.data.access_token}`,
        },
      });

      setUser(profile.data);
      router.push('/profile');
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Invalid credentials' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const res = await api.post('/auth/register', { username, email, password });
      return { success: true, message: res.data.message };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    if (!window.location.pathname.includes('/change-password')) {
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
