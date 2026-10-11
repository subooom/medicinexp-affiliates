// src/api/auth.ts
import { ApiResponse, Membership, User } from '@/types/models';
import apiClient from './client';

export interface RegisterInput {
  name: string;
  email: string;
  contact: string;
  password: string;
  password_confirmation: string;
}

export const authApi = {
  register: (data: RegisterInput) => apiClient.post<ApiResponse<{ mr_id: number; status: string }>>('/register', data),
  login: (data: { email: string; password: string; device_type?: string; app_version?: string }) =>
    apiClient.post<ApiResponse<{ token: string; user: User }>>('/login', data),
  logout: () => apiClient.post('/logout'),
  me: () => apiClient.get<ApiResponse<User>>('/me'),
  refreshToken: () => apiClient.post<ApiResponse<{ token: string }>>('/refresh-token'),
};

export const programApi = {
  list: () => apiClient.get<ApiResponse<{ active_program_id: number | null; memberships: Membership[] }>>('/programs'),
  switchTo: (programId: number) => apiClient.post<ApiResponse<Membership>>(`/programs/${programId}/switch`),
};
