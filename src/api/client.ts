// src/api/client.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { cacheKey, responseCache } from '@/offline/cache';
import { venueIndex } from '@/offline/venue-index';

// Set EXPO_PUBLIC_API_URL in .env.local to point the app at a local server, e.g.
// EXPO_PUBLIC_API_URL=http://192.168.1.10:8000/api/affiliates
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://medicinexp-staging.com/api/affiliates';

// AsyncStorage key for the program the MR is working in (set by the program switcher)
export const ACTIVE_PROGRAM_KEY = 'active_program_id';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

export const apiBaseUrl = API_URL;

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const [token, programId] = await Promise.all([
      AsyncStorage.getItem('auth_token'),
      AsyncStorage.getItem(ACTIVE_PROGRAM_KEY),
    ]);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Everything after login is scoped to the program the MR is working in. Queued
    // offline items bring the program they were made in.
    if (programId && !config.headers['X-Program-Id']) {
      config.headers['X-Program-Id'] = programId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const keyFor = (config: InternalAxiosRequestConfig) =>
  cacheKey((config.headers?.['X-Program-Id'] as string) ?? null, config.url ?? '', config.params);

/** A response built from data stored on the phone; screens can check `fromCache`. */
const cachedResponse = (config: InternalAxiosRequestConfig, data: unknown, at: number) =>
  ({ data, status: 200, statusText: 'OK (offline)', headers: {}, config, fromCache: true, cachedAt: at }) as AxiosResponse & {
    fromCache: true;
    cachedAt: number;
  };

/**
 * Offline answers for venue lookups the response cache can't cover: free-text search,
 * nearby, and venues created offline (negative ids).
 */
async function offlineVenueAnswer(config: InternalAxiosRequestConfig): Promise<unknown | null> {
  const url = config.url ?? '';
  const params = config.params ?? {};

  if (url === '/venues' && params.search) {
    const results = await venueIndex.search(String(params.search), Number(params.per_page) || 15);
    return { success: true, data: { data: results, current_page: 1, last_page: 1, per_page: results.length, total: results.length } };
  }
  if (url === '/venues/nearby' && params.latitude) {
    return { success: true, data: await venueIndex.nearby(Number(params.latitude), Number(params.longitude), Number(params.radius) || 2) };
  }
  const match = url.match(/^\/venues\/(-?\d+)$/);
  if (match) {
    const venue = await venueIndex.find(Number(match[1]));
    if (venue) {
      return { success: true, data: { venue, stats: { my_visits: 0, my_dropoffs: 0, my_call_logs: 0, my_open_leads: 0 } } };
    }
  }
  return null;
}

// Response interceptor: remember good GETs, and answer from them when offline
apiClient.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get' && response.status === 200 && !(response.config as any).skipCache) {
      responseCache.set(keyFor(response.config), response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // No response at all (offline, timeout): fall back to what the phone has
    if (!error.response && originalRequest?.method === 'get') {
      const venueAnswer = await offlineVenueAnswer(originalRequest);
      if (venueAnswer) {
        return cachedResponse(originalRequest, venueAnswer, Date.now());
      }
      const cached = await responseCache.get(keyFor(originalRequest));
      if (cached) {
        return cachedResponse(originalRequest, cached.data, cached.at);
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      const errorMessage = error.response?.data?.message || error.message || 'Unauthorized';
      return Promise.reject({
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Handle other errors
    const errorMessage = !error.response
      ? 'No internet connection.'
      : error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default apiClient;
