// src/utils/pickups.ts
import { PickupStatus } from '@/types/models';

export const pickupStatus: Record<PickupStatus, { label: string; tone: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }> = {
  requested: { label: 'Waiting for approval', tone: 'warning' },
  approved: { label: 'Ready to collect', tone: 'info' },
  collected: { label: 'Collected', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
