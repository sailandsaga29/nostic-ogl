import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'manager' | 'staff';
    branchCode?: string;
  };
}

export const loginApi = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', payload);
  return response.data;
};

export const logoutApi = async (refreshToken: string) => {
  await api.post('/auth/logout', { refreshToken });
};
