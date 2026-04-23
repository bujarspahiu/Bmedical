import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, clearToken, getStoredToken } from '@/lib/api';

export type UserRole = 'owner' | 'physiotherapist' | 'doctor' | 'receptionist' | 'accountant' | 'assistant';
export type PlanType = 'professional' | 'enterprise';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  plan: PlanType;
  isAdmin?: boolean;
}

export interface RegisterData {
  businessName: string; ownerName: string; email: string; phone: string;
  password: string; address: string; city: string; country: string;
  taxNumber: string; plan: PlanType; agreed: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEMO_USER_KEY = 'bmedical_demo_user';

const demoUsers: Record<string, AuthUser> = {
  'clinic@bmedical.com': {
    id: 'demo-clinic-owner',
    name: 'Bmedical Clinic Demo',
    email: 'clinic@bmedical.com',
    role: 'owner',
    tenantId: 'tenant-clinic-demo',
    tenantName: 'Bmedical Clinic',
    plan: 'professional',
  },
  'hospital@bmedical.com': {
    id: 'demo-hospital-owner',
    name: 'Bmedical Hospital Demo',
    email: 'hospital@bmedical.com',
    role: 'owner',
    tenantId: 'tenant-hospital-demo',
    tenantName: 'Bmedical Hospital',
    plan: 'enterprise',
  },
  'ordinance@bmedical.com': {
    id: 'demo-ordinance-owner',
    name: 'Bmedical Ordinance Demo',
    email: 'ordinance@bmedical.com',
    role: 'owner',
    tenantId: 'tenant-ordinance-demo',
    tenantName: 'Bmedical Ordinance',
    plan: 'professional',
  },
};

function getDemoUser(email: string, password: string, adminOnly = false): AuthUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim().toLowerCase();
  const user = demoUsers[normalizedEmail];
  if (!user) return null;
  if (normalizedEmail !== normalizedPassword) return null;
  if (adminOnly && !user.isAdmin) return null;
  if (!adminOnly && user.isAdmin) return null;
  return user;
}

function storeDemoUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(DEMO_USER_KEY);
  } catch {}
}

function loadDemoUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const demoUser = loadDemoUser();
        if (demoUser) {
          setUser(demoUser);
          setLoading(false);
          return;
        }
        if (getStoredToken()) {
          const r = await api<{ user: AuthUser | null }>('me');
          setUser(r.user);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const demoUser = getDemoUser(email, password, false);
    if (demoUser) {
      storeDemoUser(demoUser);
      setUser(demoUser);
      return { success: true };
    }
    try {
      const r = await api<{ user: AuthUser }>('login', { email, password });
      storeDemoUser(null);
      setUser(r.user);
      return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      const r = await api<{ user: AuthUser }>('admin_login', { email, password });
      storeDemoUser(null);
      setUser(r.user);
      return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
  };

  const register = async (data: RegisterData) => {
    try {
      const r = await api<{ user: AuthUser }>('register', data as unknown as Record<string, unknown>);
      setUser(r.user);
      return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
  };

  const logout = async () => {
    try { await api('logout'); } catch {}
    clearToken();
    storeDemoUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, adminLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
