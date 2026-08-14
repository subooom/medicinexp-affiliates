// src/api/auth.ts
import apiClient from './client';

export const authApi = {
  register: (data: any) => apiClient.post('/register', data),
  login: (data: any) => apiClient.post('/login', data),
  logout: () => apiClient.post('/logout'),
  me: () => apiClient.get('/me'),
  refreshToken: () => apiClient.post('/refresh-token'),
};