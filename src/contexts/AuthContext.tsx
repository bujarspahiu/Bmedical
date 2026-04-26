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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName?: string;
  password: string;
  plan: PlanType;
  billingCycle?: 'monthly' | 'yearly';
  seatCount?: number;
  agreedTerms: boolean;
}

export interface RegisterResult {
  success: boolean;
  message?: string;
  verificationUrl?: string;
  verificationExpiresAt?: string;
  email?: string;
  tenantName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEMO_USER_KEY = 'bmedical_demo_user';
const ENABLE_DEMO_ADMIN = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ADMIN === 'true';

const demoUsers: Record<string, AuthUser> = {
  'clinic@bmedical.com': {
    id: 'demo-clinic-owner',
    name: 'BMedical Clinic Demo',
    email: 'clinic@bmedical.com',
    role: 'owner',
    tenantId: 'tenant-clinic-demo',
    tenantName: 'BMedical Clinic',
    plan: 'professional',
  },
  'hospital@bmedical.com': {
    id: 'demo-hospital-owner',
    name: 'BMedical Hospital Demo',
    email: 'hospital@bmedical.com',
    role: 'owner',
    tenantId: 'tenant-hospital-demo',
    tenantName: 'BMedical Hospital',
    plan: 'enterprise',
  },
  'ordinance@bmedical.com': {
    id: 'demo-ordinance-owner',
    name: 'BMedical Ordinance Demo',
    email: 'ordinance@bmedical.com',
    role: 'owner',
    tenantId: 'tenant-ordinance-demo',
    tenantName: 'BMedical Ordinance',
    plan: 'professional',
  },
};

if (ENABLE_DEMO_ADMIN) {
  demoUsers['admin@bmedical.com'] = {
    id: 'demo-platform-admin',
    name: 'BMedical Super Admin',
    email: 'admin@bmedical.com',
    role: 'owner',
    tenantId: 'platform-admin',
    tenantName: 'BMedical Platform',
    plan: 'enterprise',
    isAdmin: true,
  };
}

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
  } catch {
    // Ignore localStorage failures in restricted browsing modes.
  }
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
      } catch {
        // Session restore failures should fall back to logged-out state.
      }
      setLoading(false);
    })();
  }, []);

  const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unexpected error';

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
    } catch (error: unknown) { return { success: false, message: getErrorMessage(error) }; }
  };

  const adminLogin = async (email: string, password: string) => {
    if (ENABLE_DEMO_ADMIN) {
      const demoUser = getDemoUser(email, password, true);
      if (demoUser) {
        storeDemoUser(demoUser);
        setUser(demoUser);
        return { success: true };
      }
    }
    try {
      const r = await api<{ user: AuthUser }>('admin_login', { email, password });
      storeDemoUser(null);
      setUser(r.user);
      return { success: true };
    } catch (error: unknown) { return { success: false, message: getErrorMessage(error) }; }
  };

  const register = async (data: RegisterData) => {
    try {
      const r = await api<{
        verificationRequired: boolean;
        verificationUrl?: string;
        verificationExpiresAt?: string;
        email?: string;
        tenantName?: string;
      }>('register', data as unknown as Record<string, unknown>);
      return {
        success: true,
        verificationUrl: r.verificationUrl,
        verificationExpiresAt: r.verificationExpiresAt,
        email: r.email,
        tenantName: r.tenantName,
      };
    } catch (error: unknown) { return { success: false, message: getErrorMessage(error) }; }
  };

  const logout = async () => {
    try { await api('logout'); } catch {
      // Best-effort logout; local auth state is cleared below regardless.
    }
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
