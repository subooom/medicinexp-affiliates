// src/api/visits.ts
import { ApiResponse, Paginated, Visit, VisitFilters, VisitInput, VisitStats } from '@/types/models';
import apiClient from './client';

export const visitApi = {
  getAll: (params?: VisitFilters) => apiClient.get<ApiResponse<Paginated<Visit>>>('/visits', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<Visit>>(`/visits/${id}`),
  // Check in (status completed, optional drop-offs) or plan a visit (status planned)
  create: (data: VisitInput) => apiClient.post<ApiResponse<Visit>>('/visits', data),
  update: (id: number, data: Partial<Pick<Visit, 'notes' | 'status' | 'visited_at'>>) =>
    apiClient.put<ApiResponse<Visit>>(`/visits/${id}`, data),
  delete: (id: number) => apiClient.delete(`/visits/${id}`),
  checkout: (id: number) => apiClient.patch<ApiResponse<Visit>>(`/visits/${id}/checkout`),
  getStats: () => apiClient.get<ApiResponse<VisitStats>>('/visits/stats'),
};
