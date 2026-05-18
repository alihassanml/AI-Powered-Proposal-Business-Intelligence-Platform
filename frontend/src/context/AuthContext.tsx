import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
const COOKIE_NAME  = 'halify_token';
const COOKIE_DAYS  = 30;

// ── cookie helpers ──
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

interface User {
  id: number;
  name: string;
  email: string;
  openai_api_key: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  updateApiKey: (key: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getCookie(COOKIE_NAME));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUser(r.data))
      .catch(() => { deleteCookie(COOKIE_NAME); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { email, password });
      setCookie(COOKIE_NAME, res.data.token, COOKIE_DAYS);
      setToken(res.data.token);
      setUser(res.data.user);
      return null;
    } catch (e: any) {
      return e?.response?.data?.detail || 'Login failed';
    }
  };

  const register = async (name: string, email: string, password: string): Promise<string | null> => {
    try {
      const res = await axios.post(`${API_BASE_URL}/register`, { name, email, password });
      setCookie(COOKIE_NAME, res.data.token, COOKIE_DAYS);
      setToken(res.data.token);
      setUser(res.data.user);
      return null;
    } catch (e: any) {
      return e?.response?.data?.detail || 'Registration failed';
    }
  };

  const logout = () => {
    if (token) {
      axios.post(`${API_BASE_URL}/logout`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    deleteCookie(COOKIE_NAME);
    setToken(null);
    setUser(null);
  };

  const updateApiKey = async (key: string) => {
    await axios.post(
      `${API_BASE_URL}/update-api-key`,
      { api_key: key },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setUser(u => u ? { ...u, openai_api_key: key } : u);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateApiKey }}>
      {children}
    </AuthContext.Provider>
  );
}
