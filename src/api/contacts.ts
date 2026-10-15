// src/api/contacts.ts — numbers the phone's contacts should have (server ContactController)
import { LeadStatus } from '@/types/models';
import apiClient from './client';

export interface SyncContact {
  kind: 'lead' | 'shop';
  phone: string;
  contact_name: string | null;
  venue_name: string | null;
  status: LeadStatus | null;
  product_name: string | null;
  follow_up_at: string | null;
  notes: string | null;
  // The lead's own address, else its shop's (older servers don't send it)
  address?: string | null;
  is_customer: boolean;
  venue_type: string | null;
  last_visited_at: string | null;
}

export const contactApi = {
  // Own + team-up leads (not lost) and visited shops, across all the rep's programs; one per number
  getAll: async () => (await apiClient.get<{ data: { contacts: SyncContact[]; count: number } }>('/contacts')).data.data.contacts,
};
