// src/api/tiers.ts
import { ApiResponse, CurrentTier, Tier } from '@/types/models';
import apiClient from './client';

export const tierApi = {
  getAll: () => apiClient.get<ApiResponse<{ current_tier_id: number | null; tiers: Tier[] }>>('/tiers'),
  getById: (id: number) => apiClient.get<ApiResponse<Tier & { is_current: boolean }>>(`/tiers/${id}`),
  getCurrent: () => apiClient.get<ApiResponse<CurrentTier>>('/tiers/current'),
};
