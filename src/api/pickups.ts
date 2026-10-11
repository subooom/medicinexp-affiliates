// src/api/pickups.ts — asking the program for materials and collecting them at a hub
import { ApiResponse, Hub, Paginated, Pickup } from '@/types/models';
import apiClient from './client';

export interface PickupInput {
  items: { material_id: number; quantity: number }[];
  notes?: string;
  hub_id?: number | null;
  client_uuid: string;
}

export const pickupApi = {
  getHubs: () => apiClient.get<ApiResponse<Hub[]>>('/hubs'),
  getAll: (params?: { status?: string; page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Pickup>>>('/pickups', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<Pickup>>(`/pickups/${id}`),
  arrived: (id: number) => apiClient.post<ApiResponse<Pickup>>(`/pickups/${id}/arrived`),
  cancel: (id: number) => apiClient.post<ApiResponse<Pickup>>(`/pickups/${id}/cancel`),
};
