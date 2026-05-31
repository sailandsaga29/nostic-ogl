import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { User } from '../types';
import { loginApi } from '../services/authApi';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<User>;

  logout: () => void;

  getRedirectPath: (
    role?: User['role']
  ) => string;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    const storedUser =
      localStorage.getItem('user');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<User> => {
    const response = await loginApi({
      email,
      password,
    });

    const loggedInUser = response.user;

    localStorage.setItem(
      'accessToken',
      response.accessToken
    );

    if (response.refreshToken) {
      localStorage.setItem(
        'refreshToken',
        response.refreshToken
      );
    }

    localStorage.setItem(
      'user',
      JSON.stringify(loggedInUser)
    );

    setUser(loggedInUser);

    return loggedInUser;
  };

  const logout = () => {
    setUser(null);

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const getRedirectPath = (
    role?: User['role']
  ) => {
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
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}