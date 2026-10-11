// src/api/client.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = 'https://medicinexp-staging.com/api/affiliates';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

interface RequestOptions extends AxiosRequestConfig {
  cache?: CacheConfig | boolean;
  retry?: number;
  priority?: 'high' | 'normal' | 'low';
}

class ApiClient {
  private client = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30000,
  });

  private cache = new Map<string, { data: any; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private syncQueue: any[] = [];
  private isOnline = true;

  constructor() {
    this.setupInterceptors();
    this.setupNetworkListener();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add offline queue id for tracking
        if (!this.isOnline) {
          config.headers['X-Offline'] = 'true';
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Cache successful GET requests
        if (response.config.method?.toLowerCase() === 'get') {
          this.cacheResponse(response);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle offline requests
        if (!this.isOnline && originalRequest) {
          return this.queueOfflineRequest(originalRequest);
        }

        // Handle 401
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          // Navigate to login (you'd handle this with a navigation ref)
          return Promise.reject({
            message: 'Session expired',
            status: 401,
          });
        }

        return Promise.reject({
          message: error.response?.data?.message || error.message || 'An error occurred',
          status: error.response?.status,
          data: error.response?.data,
        });
      }
    );
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state: any) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Sync when coming back online
      if (!wasOnline && this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    });
  }

  private cacheResponse(response: AxiosResponse) {
    const key = this.getCacheKey(response.config);
    this.cache.set(key, {
      data: response.data,
      timestamp: Date.now()
    });
  }

  private getCacheKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;
  }

  private isCacheValid(cacheEntry: { timestamp: number }, ttl: number): boolean {
    return Date.now() - cacheEntry.timestamp < ttl;
  }

  private async queueOfflineRequest(config: AxiosRequestConfig) {
    const operation = {
      config,
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(7),
    };
    
    this.syncQueue.push(operation);
    await this.persistSyncQueue();
    
    // Check if we have cached data for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const cached = this.cache.get(this.getCacheKey(config));
      if (cached) {
        return { data: cached.data, fromCache: true };
      }
    }
    
    // Return a pending promise for optimistic updates
    return Promise.reject({
      message: 'You are offline. This request will sync when you reconnect.',
      queued: true,
      operationId: operation.id,
    });
  }

  private async processSyncQueue() {
    const queue = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const operation of queue) {
      try {
        await this.client.request(operation.config);
        // Optionally trigger a refresh of the data
      } catch (error) {
        // Retry failed operations
        this.syncQueue.push(operation);
        await this.persistSyncQueue();
      }
    }
  }

  private async persistSyncQueue() {
    await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
  }

  async request<T = any>(config: RequestOptions): Promise<T> {
    const cacheKey = this.getCacheKey(config);
    const isGetRequest = config.method?.toLowerCase() === 'get';

    // Check cache for GET requests
    if (isGetRequest && config.cache) {
      const cached = this.cache.get(cacheKey);
      const cacheConfig = typeof config.cache === 'boolean' 
        ? { ttl: 5 * 60 * 1000 } 
        : config.cache;

      if (cached && this.isCacheValid(cached, cacheConfig.ttl)) {
        // If staleWhileRevalidate, refresh in background
        if (cacheConfig.staleWhileRevalidate) {
          this.client.request(config).then(response => {
            this.cacheResponse(response);
          }).catch(console.error);
        }
        return cached.data;
      }
    }

    // Deduplicate pending requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>;
    }

    // Make request
    const promise = this.client.request<T>(config).then(response => response.data);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Public methods
  get<T = any>(url: string, config?: RequestOptions): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  post<T = any>(url: string, data?: any, config?: RequestOptions): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  put<T = any>(url: string, data?: any, config?: RequestOptions): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  patch<T = any>(url: string, data?: any, config?: RequestOptions): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  delete<T = any>(url: string, config?: RequestOptions): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Special methods
  async fetchAndCache<T = any>(url: string, params?: any, ttl = 5 * 60 * 1000): Promise<T> {
    return this.get<T>(url, {
      params,
      cache: { ttl, staleWhileRevalidate: true }
    });
  }

  getSyncQueue() {
    return this.syncQueue;
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new ApiClient();