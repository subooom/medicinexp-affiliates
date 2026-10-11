import apiClient from './client';

export const marketingMaterialApi = {
  getAll: (params?: any) => apiClient.get('/marketing-materials', { params }),
  getById: (id: number) => apiClient.get(`/marketing-materials/${id}`),
  getMyMaterials: () => apiClient.get('/mr/materials'),
  create: (data: any) => apiClient.post('/marketing-materials', data),
  update: (id: number, data: any) => apiClient.put(`/marketing-materials/${id}`, data),
  delete: (id: number) => apiClient.delete(`/marketing-materials/${id}`),
  getTypes: () => apiClient.get('/marketing-material-types'),
};