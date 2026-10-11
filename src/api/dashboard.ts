// src/api/dashboard.ts
import { ApiResponse, DashboardData } from '@/types/models';
import apiClient from './client';

export const dashboardApi = {
  get: () => apiClient.get<ApiResponse<DashboardData>>('/dashboard'),
};
