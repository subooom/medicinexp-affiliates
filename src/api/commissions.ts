// src/api/commissions.ts
import apiClient from './client';

export const commissionApi = {
  getAll: (params?: any) => apiClient.get('/commissions', { params }),
  getPending: () => apiClient.get('/commissions/pending'),
  getApproved: () => apiClient.get('/commissions/approved'),
  getPaid: () => apiClient.get('/commissions/paid'),
  getById: (id: number) => apiClient.get(`/commissions/${id}`),
  getStats: () => apiClient.get('/commissions/stats'),
  getMonthly: (params?: any) => apiClient.get('/commissions/monthly', { params }),
  getSummary: () => apiClient.get('/commissions/summary'),
};