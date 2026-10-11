// src/api/client.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'https://medicinexp-staging.com/api/affiliates';

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
    // Everything after login is scoped to the program the MR is working in
    if (programId) {
      config.headers['X-Program-Id'] = programId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - EXTRACT DATA
apiClient.interceptors.response.use(
  (response) => {
    // Return response.data directly
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

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
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default apiClient;
