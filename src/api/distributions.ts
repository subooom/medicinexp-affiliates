// src/api/distributions.ts
import apiClient from './client';

export const distributionApi = {
  /**
   * Get all distributions with optional filters
   */
  getAll: (params?: {
    start_date?: string;
    end_date?: string;
    organization_id?: number;
    per_page?: number;
    page?: number;
  }) => apiClient.get('/distributions', { params }),

  /**
   * Get a specific distribution by ID
   */
  getById: (id: number) => apiClient.get(`/distributions/${id}`),

  /**
   * Create a new distribution record
   */
  create: (data: {
    organization_id: number;
    marketing_material_id: number;
    quantity: number;
    distribution_date: string;
    notes?: string;
    received_by?: string;
    signature?: string;
  }) => apiClient.post('/distributions', data),

  /**
   * Update an existing distribution
   */
  update: (id: number, data: {
    quantity?: number;
    distribution_date?: string;
    notes?: string;
    received_by?: string;
  }) => apiClient.put(`/distributions/${id}`, data),

  /**
   * Delete a distribution
   */
  delete: (id: number) => apiClient.delete(`/distributions/${id}`),

  /**
   * Get distribution statistics
   */
  getStats: () => apiClient.get('/distributions/stats'),

  /**
   * Get monthly distribution data
   */
  getMonthly: (params?: {
    year?: number;
    month?: number;
  }) => apiClient.get('/distributions/monthly', { params }),
};