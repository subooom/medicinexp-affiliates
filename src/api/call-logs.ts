// src/api/call-logs.ts
import { ApiResponse, CallLog, CallLogFormData, CallStatus, Paginated } from '@/types/models';
import apiClient from './client';

export interface CallLogFilters {
  status?: CallStatus;
  lead_id?: number;
  venue_id?: number;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export interface CallLogStats {
  total: number;
  completed: number;
  scheduled: number;
  missed: number;
  this_month: number;
}

export const callLogApi = {
  getAll: (params?: CallLogFilters) => apiClient.get<ApiResponse<Paginated<CallLog>>>('/call-logs', { params }),
  getByLead: (leadId: number) => apiClient.get<ApiResponse<Paginated<CallLog>>>('/call-logs', { params: { lead_id: leadId } }),
  getByVenue: (venueId: number) => apiClient.get<ApiResponse<Paginated<CallLog>>>('/call-logs', { params: { venue_id: venueId } }),
  // Upcoming scheduled calls, soonest first
  getScheduled: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<CallLog>>>('/call-logs/scheduled', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<CallLog>>(`/call-logs/${id}`),
  create: (data: CallLogFormData) => apiClient.post<ApiResponse<CallLog>>('/call-logs', data),
  // Partial: only send what changed
  update: (id: number, data: Partial<CallLogFormData>) => apiClient.put<ApiResponse<CallLog>>(`/call-logs/${id}`, data),
  delete: (id: number) => apiClient.delete(`/call-logs/${id}`),
  complete: (id: number) => apiClient.patch<ApiResponse<CallLog>>(`/call-logs/${id}/complete`),
  getStats: () => apiClient.get<ApiResponse<CallLogStats>>('/call-logs/stats'),
};
