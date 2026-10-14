// src/api/meetups.ts — meetups the MR is invited to, and asking for one
import { ApiResponse, Meetup, Paginated } from '@/types/models';
import apiClient from './client';

export const meetupApi = {
  getAll: (params?: { scope?: 'upcoming' | 'past'; page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Meetup>>>('/meetups', { params }),
  getById: (id: number) => apiClient.get<ApiResponse<Meetup>>(`/meetups/${id}`),
  respond: (id: number, response: 'accepted' | 'declined') =>
    apiClient.post<ApiResponse<Meetup>>(`/meetups/${id}/respond`, { response }),
  arrived: (id: number) => apiClient.post<ApiResponse<Meetup>>(`/meetups/${id}/arrived`),
};
