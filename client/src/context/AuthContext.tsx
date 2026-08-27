'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface UserStats {
  matches_played: number;
  high_score: number;
  total_score: number;
  wins: number;
}

interface AuthContextValue {
  user: User | null;
  stats: UserStats | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${serverUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStats(data.stats);
      } else {
        localStorage.removeItem('sketchai_token');
        setUser(null);
        setToken(null);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl]);

  useEffect(() => {
    const savedToken = localStorage.getItem('sketchai_token');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (identifier: string, password: string) => {
    const res = await fetch(`${serverUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('sketchai_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setStats(data.stats);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch(`${serverUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('sketchai_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setStats(data.stats);
  };

  const logout = () => {
    localStorage.removeItem('sketchai_token');
    setToken(null);
    setUser(null);
    setStats(null);
  };

  const refreshStats = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
