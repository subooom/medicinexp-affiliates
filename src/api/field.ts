// src/api/field.ts — field kit, codes, products, weekly activity, leaderboard, push token, map
import { ActivityState, ApiResponse, CodesResponse, FieldKit, Leaderboard, MapPin, Product } from '@/types/models';
import apiClient from './client';

// Another program's data without switching to it (e.g. its pitch kit during a check-in)
const forProgram = (programId?: number) => (programId ? { headers: { 'X-Program-Id': String(programId) } } : undefined);

export const fieldApi = {
  getKit: (programId?: number) => apiClient.get<ApiResponse<FieldKit>>('/field-kit', forProgram(programId)),
  getCoupons: () => apiClient.get<ApiResponse<CodesResponse>>('/coupons'),
  // Rename a code and/or set its discount (up to the rep's year-1 rate)
  updateCoupon: (id: number, data: { code?: string; discount_percentage?: number }) =>
    apiClient.patch<ApiResponse<CodesResponse>>(`/coupons/${id}`, data),
  getProducts: (programId?: number) => apiClient.get<ApiResponse<Product[]>>('/products', forProgram(programId)),
  getActivity: () => apiClient.get<ApiResponse<ActivityState>>('/activity'),
  getLeaderboard: () => apiClient.get<ApiResponse<Leaderboard>>('/leaderboard'),
  registerDevice: (data: { device_token: string | null; device_type?: 'ios' | 'android'; app_version?: string }) =>
    apiClient.post<ApiResponse<{ registered: boolean }>>('/device', data),
  getMap: (params: { latitude: number; longitude: number; radius?: number }) =>
    apiClient.get<ApiResponse<MapPin[]>>('/venues/map', { params }),
};
