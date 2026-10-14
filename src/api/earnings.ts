// src/api/earnings.ts
import { ApiResponse, Commission, CommissionStatus, EarningsSummary, Paginated, Payout } from '@/types/models';
import { GuideLink } from './guide';
import { Localized } from '@/utils/language';
import apiClient from './client';

/** One way to earn, written by the server with the rep's own numbers (EN/ne). */
export interface EarnSection {
  id: string;
  icon: string;
  title: Localized;
  // The key number, e.g. "10% in year 1"
  highlight?: Localized | null;
  body: Localized;
  link?: GuideLink;
}

export interface HowYouEarn {
  tier: { name: string; color: string | null; rates: number[] } | null;
  sections: EarnSection[];
}

/** Set once the rep has opened How you earn (the Earnings tab stops suggesting it). */
export const EARN_SEEN_KEY = 'earn.intro.seen';

export const earningsApi = {
  getSummary: () => apiClient.get<ApiResponse<EarningsSummary>>('/earnings'),
  getCommissions: (params?: { status?: CommissionStatus; page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Commission>>>('/earnings/commissions', { params }),
  getPayouts: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<ApiResponse<Paginated<Payout>>>('/earnings/payouts', { params }),
  // Every way to earn in the current program, with the rep's numbers (cached for offline)
  howYouEarn: () => apiClient.get<ApiResponse<HowYouEarn>>('/how-you-earn'),
};
