// src/api/progress.ts
import apiClient from './client';

export const progressApi = {
  get: () => apiClient.get('/progress'),
  getTierProgress: () => apiClient.get('/progress/tier'),
  getRequirements: () => apiClient.get('/progress/requirements'),
  getHistory: () => apiClient.get('/progress/history'),
  getLeaderboard: (params?: any) => apiClient.get('/progress/leaderboard', { params }),
};