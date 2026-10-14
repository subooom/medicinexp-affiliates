// src/api/team-ups.ts — working with another rep for the day and agreeing the commission split
import { ApiResponse } from '@/types/models';
import apiClient from './client';

export interface TeamUpPartner {
  membership_id: number;
  name: string;
}

export interface TeamUpSplit {
  // The split on the bar right now, from my side (money uses 50/50 until agreed)
  my_share_bp: number;
  partner_share_bp: number;
  // null = nobody has set one yet
  proposed_by_me: boolean | null;
  agreed: boolean;
  agreed_at: string | null;
  changes_left: number;
}

export interface TeamUp {
  id: number;
  status: 'pending' | 'active' | 'ended' | 'declined' | 'cancelled';
  method: 'code' | 'nearby' | 'suggested';
  started_by_me: boolean;
  partner: TeamUpPartner | null;
  join_code: string | null;
  join_code_expires_at: string | null;
  split: TeamUpSplit;
  started_at: string | null;
  ends_at: string | null;
  version: number;
}

export type TeamUpCurrent =
  | { changed: false; etag: string }
  | { changed: true; etag: string; running: TeamUp | null; incoming: TeamUp[]; outgoing: TeamUp | null };

export interface NearbyRep {
  membership_id: number;
  name: string;
  distance_m: number;
}

export const teamUpApi = {
  // Send back the last etag: { changed: false } when nothing moved (cheap to poll)
  current: (etag?: string) => apiClient.get<ApiResponse<TeamUpCurrent>>('/team-ups/current', { params: etag ? { etag } : undefined }),
  showCode: () => apiClient.post<ApiResponse<TeamUp>>('/team-ups/code'),
  join: (code: string) => apiClient.post<ApiResponse<TeamUp>>('/team-ups/join', { code }),
  ask: (membershipId: number, method: 'nearby' | 'suggested') =>
    apiClient.post<ApiResponse<TeamUp>>('/team-ups/ask', { membership_id: membershipId, method }),
  respond: (id: number, accept: boolean) => apiClient.post<ApiResponse<TeamUp>>(`/team-ups/${id}/respond`, { accept }),
  setSplit: (id: number, myShareBp: number) => apiClient.post<ApiResponse<TeamUp>>(`/team-ups/${id}/split`, { my_share_bp: myShareBp }),
  agree: (id: number) => apiClient.post<ApiResponse<TeamUp>>(`/team-ups/${id}/agree`),
  end: (id: number) => apiClient.post<ApiResponse<TeamUp>>(`/team-ups/${id}/end`),
  // Only while the "find teammate" screen is open; the server keeps it a minute, in memory
  nearby: (latitude: number, longitude: number) =>
    apiClient.post<ApiResponse<NearbyRep[]>>('/team-ups/nearby', { latitude, longitude }),
  leaveNearby: () => apiClient.delete('/team-ups/nearby'),
};

/** QR content: opens the app's join screen when scanned with the phone camera. */
export const teamUpLink = (code: string) => `medicinexp://team-up?code=${encodeURIComponent(code)}`;
