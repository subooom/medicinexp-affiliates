// src/api/field.ts — field kit (cheat sheet, demo video), coupons, push token, map
import { ApiResponse, Coupon, FieldKit, MapPin } from '@/types/models';
import apiClient from './client';

export const fieldApi = {
  getKit: () => apiClient.get<ApiResponse<FieldKit>>('/field-kit'),
  getCoupons: () => apiClient.get<ApiResponse<Coupon[]>>('/coupons'),
  registerDevice: (data: { device_token: string | null; device_type?: 'ios' | 'android'; app_version?: string }) =>
    apiClient.post<ApiResponse<{ registered: boolean }>>('/device', data),
  getMap: (params: { latitude: number; longitude: number; radius?: number }) =>
    apiClient.get<ApiResponse<MapPin[]>>('/venues/map', { params }),
};
