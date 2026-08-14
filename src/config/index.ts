// src/config/index.ts
export const Config = {
  API_URL: process.env.API_URL || 'http://localhost:8000/api',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  APP_NAME: 'Affiliate App',
  APP_VERSION: '1.0.0',
};