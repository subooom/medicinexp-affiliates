// src/api/leads.ts
import { ApiResponse, Lead, LeadInput, LeadStatus, LeadType, Paginated } from '@/types/models';
import apiClient from './client';

export interface LeadFilters {
  status?: LeadStatus;
  lead_type?: LeadType;
  open?: boolean;
  follow_up_due?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface LeadStats {
  total: number;
  open: number;
  converted: number;
  lost: number;
  conversion_rate: number;
  follow_ups_due: number;
  by_status: Record<string, number>;
}

export const leadApi = {
  getAll: (params?: LeadFilters) => apiClient.get<ApiResponse<Paginated<Lead>>>('/leads', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<Lead>>(`/leads/${id}`),
  create: (data: LeadInput) => apiClient.post<ApiResponse<Lead>>('/leads', data),
  update: (id: number, data: LeadInput) => apiClient.put<ApiResponse<Lead>>(`/leads/${id}`, data),
  delete: (id: number) => apiClient.delete(`/leads/${id}`),
  // "converted" isn't set by hand: it happens when the pharmacy signs up and pays
  updateStatus: (id: number, status: 'new' | 'contacted' | 'qualified' | 'lost', lostReason?: string) =>
    apiClient.patch<ApiResponse<Lead>>(`/leads/${id}/status`, { status, lost_reason: lostReason }),
  getStats: () => apiClient.get<ApiResponse<LeadStats>>('/leads/stats'),
  // A personal link that opens the pharmacy's sign-up already filled in from this lead
  signupLink: (id: number, couponId?: number) =>
    apiClient.post<ApiResponse<{ url: string; code: string | null }>>(`/leads/${id}/signup-link`, couponId ? { coupon_id: couponId } : {}),
};
