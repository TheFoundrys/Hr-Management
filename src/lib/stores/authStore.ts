import { create } from 'zustand';
import { TenantSettings, TenantType } from '../types/tenant';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName?: string;
  tenantType?: TenantType;
  tenantSettings?: TenantSettings;
  employeeId?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      set({ user: null, isAuthenticated: false });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      set({ user: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },
}));
