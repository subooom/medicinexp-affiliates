// src/api/distributions.ts
import apiClient from './client';

export const distributionApi = {
  getAll: (params?: any) => apiClient.get('/distributions', { params }),
  getById: (id: number) => apiClient.get(`/distributions/${id}`),
  create: (data: {
    organization_id: number;
    marketing_material_id: number;
    quantity: number;
    distribution_date: string;
    notes?: string;
    received_by?: string;
    visit_id?: number;
  }) => apiClient.post('/distributions', data),
  update: (id: number, data: any) => apiClient.put(`/distributions/${id}`, data),
  delete: (id: number) => apiClient.delete(`/distributions/${id}`),
  getStats: () => apiClient.get('/distributions/stats'),
  getMonthly: (params?: any) => apiClient.get('/distributions/monthly', { params }),
};