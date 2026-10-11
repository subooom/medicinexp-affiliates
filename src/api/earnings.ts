// src/api/earnings.ts
import { ApiResponse, Commission, CommissionStatus, EarningsSummary, Paginated, Payout } from '@/types/models';
import apiClient from './client';

export const earningsApi = {
  getSummary: () => apiClient.get<ApiResponse<EarningsSummary>>('/earnings'),
  getCommissions: (params?: { status?: CommissionStatus; page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Commission>>>('/earnings/commissions', { params }),
  getPayouts: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Payout>>>('/earnings/payouts', { params }),
};
