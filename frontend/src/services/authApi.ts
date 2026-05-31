import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;

  user: {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'manager' | 'staff';
  };
}

export const loginApi = async (
  payload: LoginPayload
): Promise<LoginResponse> => {
  const response = await API.post<LoginResponse>(
    '/auth/login',
    payload
  );

  return response.data;
};