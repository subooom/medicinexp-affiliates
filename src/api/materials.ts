// src/api/materials.ts
import { ApiResponse, Dropoff, MaterialWithStock, Paginated } from '@/types/models';
import apiClient from './client';

export const materialApi = {
  // Program materials with what the MR carries; inBag limits to materials in their bag
  getAll: (params?: { in_bag?: boolean }) =>
    apiClient.get<ApiResponse<MaterialWithStock[]>>('/materials', { params: params?.in_bag ? { in_bag: 1 } : undefined }),
  getById: (id: number) => apiClient.get<ApiResponse<MaterialWithStock>>(`/materials/${id}`),
  getDropoffs: (params?: { material_id?: number; venue_id?: number; page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Dropoff>>>('/materials/dropoffs', { params }),
};
