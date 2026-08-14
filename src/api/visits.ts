// src/api/visits.ts
import apiClient from './client';

export const visitApi = {
  getAll: (params?: any) => apiClient.get('/visits', { params }),
  getById: (id: number) => apiClient.get(`/visits/${id}`),
  create: (data: any) => apiClient.post('/visits', data),
  update: (id: number, data: any) => apiClient.put(`/visits/${id}`, data),
  delete: (id: number) => apiClient.delete(`/visits/${id}`),
  checkout: (id: number) => apiClient.patch(`/visits/${id}/checkout`),
  getStats: () => apiClient.get('/visits/stats'),
  getMonthly: (params?: any) => apiClient.get('/visits/monthly', { params }),
};