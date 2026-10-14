// src/api/materials.ts
import { ApiResponse, Dropoff, MaterialWithStock, Paginated } from '@/types/models';
import apiClient from './client';

export const materialApi = {
  // Program materials with what the MR carries; inBag limits to materials in their bag
  // allPrograms: every program the MR is active in (check-in hands out several programs' materials)
  getAll: (params?: { in_bag?: boolean; all_programs?: boolean }) =>
    apiClient.get<ApiResponse<MaterialWithStock[]>>('/materials', {
      params: params?.in_bag || params?.all_programs
        ? { in_bag: params?.in_bag ? 1 : undefined, all_programs: params?.all_programs ? 1 : undefined }
        : undefined,
    }),
  getById: (id: number) => apiClient.get<ApiResponse<MaterialWithStock>>(`/materials/${id}`),
  getDropoffs: (params?: { material_id?: number; venue_id?: number; page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Dropoff>>>('/materials/dropoffs', { params }),
};
