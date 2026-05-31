export type Role = 'super_admin' | 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchCode?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}