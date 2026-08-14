// src/api/coupons.ts
import apiClient from './client';

export const couponApi = {
  getAll: () => apiClient.get('/coupons'),
  getAvailable: () => apiClient.get('/coupons/available'),
  getUsed: (params?: any) => apiClient.get('/coupons/used', { params }),
  getById: (id: number) => apiClient.get(`/coupons/${id}`),
  assign: (data: any) => apiClient.post('/coupons/assign', data),
  revoke: (id: number) => apiClient.post(`/coupons/${id}/revoke`),
  getStats: () => apiClient.get('/coupons/stats'),
};