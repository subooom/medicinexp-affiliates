// src/api/index.ts
import { authApi, programApi } from './auth';
import { callLogApi } from './call-logs';
import { dashboardApi } from './dashboard';
import { earningsApi } from './earnings';
import { leadApi } from './leads';
import { materialApi } from './materials';
import { tierApi } from './tiers';
import { venueApi } from './venues';
import { visitApi } from './visits';

export const api = {
  auth: authApi,
  programs: programApi,
  dashboard: dashboardApi,
  venues: venueApi,
  visits: visitApi,
  leads: leadApi,
  callLogs: callLogApi,
  materials: materialApi,
  tiers: tierApi,
  earnings: earningsApi,
};

export {
  authApi,
  callLogApi,
  dashboardApi,
  earningsApi,
  leadApi,
  materialApi,
  programApi,
  tierApi,
  venueApi,
  visitApi,
};
