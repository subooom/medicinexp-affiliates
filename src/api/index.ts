// src/api/index.ts
import { authApi } from './auth';
import { visitApi } from './visits';
import { leadApi } from './leads';
import { dashboardApi } from './dashboard';
import { distributionApi } from './distributions';
import { commissionApi } from './commissions';
import { couponApi } from './coupons';
import { organizationApi } from './organizations';
import { progressApi } from './progress';

// Combine all APIs into a single object
export const api = {
  auth: authApi,
  visits: visitApi,
  leads: leadApi,
  dashboard: dashboardApi,
  distributions: distributionApi,
  commissions: commissionApi,
  coupons: couponApi,
  organizations: organizationApi,
  progress: progressApi,
};

// Also export individual APIs if needed
export {
  authApi,
  visitApi,
  leadApi,
  dashboardApi,
  distributionApi,
  commissionApi,
  couponApi,
  organizationApi,
  progressApi,
};