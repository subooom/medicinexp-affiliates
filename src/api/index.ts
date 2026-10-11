// src/api/index.ts
import { authApi } from './auth';
import { callLogApi } from './call-logs';
import { commissionApi } from './commissions';
import { couponApi } from './coupons';
import { dashboardApi } from './dashboard';
import { distributionApi } from './distributions';
import { leadApi } from './leads';
import { marketingMaterialApi } from './marketing-materials';
import { organizationApi } from './organizations';
import { progressApi } from './progress';
import { visitApi } from './visits';

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
  marketingMaterial: marketingMaterialApi,
  callLog: callLogApi
};

// Also export individual APIs if needed
export {
  authApi, callLogApi, commissionApi,
  couponApi, dashboardApi,
  distributionApi, leadApi, marketingMaterialApi, organizationApi,
  progressApi, visitApi
};

