// src/api/organizations.ts
import apiClient from './client';

export const organizationApi = {
  create: (data: any) => apiClient.post('/organizations', data),
  update:(id:number, data: any) => apiClient.put(`/organizations/${id}`, data),
  getAll: (params?: any) => apiClient.get('/organizations', { params }),
  getNearby: (params: any) => apiClient.get('/organizations/nearby', { params }),
  getById: (id: number) => apiClient.get(`/organizations/${id}`),
  getVisits: (id: number, params?: any) => apiClient.get(`/organizations/${id}/visits`, { params }),
  getDistributions: (id: number, params?: any) => apiClient.get(`/organizations/${id}/distributions`, { params }),
  search: (q: string) => apiClient.get('/organizations/search', { params: { q } }),
  getTypes: () => apiClient.get('/organization-types')
};