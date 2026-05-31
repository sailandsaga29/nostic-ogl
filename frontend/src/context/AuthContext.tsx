import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import type { User } from '../types';
import { loginApi, logoutApi } from '../services/authApi';
import { INACTIVITY_TIMEOUT_MS } from '../config/env';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  getRedirectPath: (role?: User['role']) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Still clear local session if server unreachable
      }
    }
    clearSession();
  }, [clearSession]);

  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    if (!localStorage.getItem('accessToken')) return;

    timeoutRef.current = window.setTimeout(() => {
      void logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    const handler = () => resetInactivityTimer();

    events.forEach((event) => window.addEventListener(event, handler));
    resetInactivityTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handler));
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await loginApi({ email, password });
    const loggedInUser = response.user;

    localStorage.setItem('accessToken', response.accessToken);

    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    resetInactivityTimer();

    return loggedInUser;
  };

  const getRedirectPath = (role?: User['role']) => {
    const userRole = role || user?.role;

    switch (userRole) {
      case 'super_admin':
      case 'admin':
        return '/admin/dashboard';
      case 'manager':
        return '/manager/dashboard';
      case 'staff':
        return '/staff/pos';
      default:
        return '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
