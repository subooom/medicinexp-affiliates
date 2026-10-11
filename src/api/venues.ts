// src/api/venues.ts
import { ApiResponse, CallLog, Dropoff, Paginated, Venue, VenueFormData, VenueStats, VenueType, Visit } from '@/types/models';
import apiClient from './client';

export interface VenueFilters {
  search?: string;
  venue_type_id?: number;
  city?: string;
  mine?: boolean;
  page?: number;
  per_page?: number;
}

export const venueApi = {
  getAll: (params?: VenueFilters) => apiClient.get<ApiResponse<Paginated<Venue>>>('/venues', { params }),
  getNearby: (params: { latitude: number; longitude: number; radius?: number }) =>
    apiClient.get<ApiResponse<Venue[]>>('/venues/nearby', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<{ venue: Venue; stats: VenueStats }>>(`/venues/${id}`),
  create: (data: VenueFormData) => apiClient.post<ApiResponse<Venue>>('/venues', data),
  update: (id: number, data: Partial<VenueFormData>) => apiClient.put<ApiResponse<Venue>>(`/venues/${id}`, data),
  delete: (id: number) => apiClient.delete(`/venues/${id}`),
  getVisits: (id: number, params?: { page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Visit>>>(`/venues/${id}/visits`, { params }),
  getCallLogs: (id: number, params?: { page?: number }) =>
    apiClient.get<ApiResponse<Paginated<CallLog>>>(`/venues/${id}/call-logs`, { params }),
  getDropoffs: (id: number, params?: { page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Dropoff>>>(`/venues/${id}/dropoffs`, { params }),
  getTypes: () => apiClient.get<ApiResponse<VenueType[]>>('/venue-types'),
};
