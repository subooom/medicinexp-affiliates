// src/api/leads.ts
import apiClient from './client';

export const leadApi = {
  getAll: (params?: any) => apiClient.get('/leads', { params }),
  getById: (id: number) => apiClient.get(`/leads/${id}`),
  create: (data: any) => apiClient.post('/leads', data),
  update: (id: number, data: any) => apiClient.put(`/leads/${id}`, data),
  delete: (id: number) => apiClient.delete(`/leads/${id}`),
  updateStatus: (id: number, status: string) => 
    apiClient.patch(`/leads/${id}/status`, { status }),
  convert: (id: number, data: any) => 
    apiClient.post(`/leads/${id}/convert`, data),
  getStats: () => apiClient.get('/leads/stats'),
  getMonthly: (params?: any) => apiClient.get('/leads/monthly', { params }),
};