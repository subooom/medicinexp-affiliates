// src/api/field.ts — field kit, codes, products, weekly activity, leaderboard, push token, map
import { ActivityState, ApiResponse, CodesResponse, FieldKit, Leaderboard, MapPin, Product } from '@/types/models';
import apiClient from './client';

export const fieldApi = {
  getKit: () => apiClient.get<ApiResponse<FieldKit>>('/field-kit'),
  getCoupons: () => apiClient.get<ApiResponse<CodesResponse>>('/coupons'),
  // Rename a code and/or set its discount (up to the rep's year-1 rate)
  updateCoupon: (id: number, data: { code?: string; discount_percentage?: number }) =>
    apiClient.patch<ApiResponse<CodesResponse>>(`/coupons/${id}`, data),
  getProducts: () => apiClient.get<ApiResponse<Product[]>>('/products'),
  getActivity: () => apiClient.get<ApiResponse<ActivityState>>('/activity'),
  getLeaderboard: () => apiClient.get<ApiResponse<Leaderboard>>('/leaderboard'),
  registerDevice: (data: { device_token: string | null; device_type?: 'ios' | 'android'; app_version?: string }) =>
    apiClient.post<ApiResponse<{ registered: boolean }>>('/device', data),
  getMap: (params: { latitude: number; longitude: number; radius?: number }) =>
    apiClient.get<ApiResponse<MapPin[]>>('/venues/map', { params }),
};
