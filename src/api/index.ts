// src/api/index.ts
import { authApi, programApi } from './auth';
import { callLogApi } from './call-logs';
import { dashboardApi } from './dashboard';
import { earningsApi } from './earnings';
import { fieldApi } from './field';
import { leadApi } from './leads';
import { materialApi } from './materials';
import { meetupApi } from './meetups';
import { pickupApi } from './pickups';
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
  field: fieldApi,
  pickups: pickupApi,
  meetups: meetupApi,
};

export {
  authApi,
  callLogApi,
  dashboardApi,
  earningsApi,
  fieldApi,
  leadApi,
  materialApi,
  meetupApi,
  pickupApi,
  programApi,
  tierApi,
  venueApi,
  visitApi,
};
