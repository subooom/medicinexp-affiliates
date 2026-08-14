// src/api/organizations.ts
import apiClient from './client';

export const organizationApi = {
  getAll: (params?: any) => apiClient.get('/organizations', { params }),
  getNearby: (params: any) => apiClient.get('/organizations/nearby', { params }),
  getById: (id: number) => apiClient.get(`/organizations/${id}`),
  getVisits: (id: number, params?: any) => apiClient.get(`/organizations/${id}/visits`, { params }),
  getDistributions: (id: number, params?: any) => apiClient.get(`/organizations/${id}/distributions`, { params }),
  search: (q: string) => apiClient.get('/organizations/search', { params: { q } }),
};