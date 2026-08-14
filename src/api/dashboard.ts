// src/api/dashboard.ts
import apiClient from './client';

export const dashboardApi = {
  get: () => apiClient.get('/dashboard'),
  getSummary: () => apiClient.get('/dashboard/summary'),
  getRecentActivity: () => apiClient.get('/dashboard/recent-activity'),
};