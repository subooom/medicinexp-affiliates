// src/api/call-logs.ts
import { CallLogFormData } from '@/types/models';
import apiClient from './client';

export const callLogApi = {
  /**
   * Get all call logs for the authenticated MR
   */
  getAll: (params?: {
    status?: string;
    lead_id?: number;
    organization_id?: number;
    start_date?: string;
    end_date?: string;
    per_page?: number;
    page?: number;
  }) => apiClient.get('/call-logs', { params }),

  /**
   * Get call logs for a specific lead
   */
  getByLead: (leadId: number) => 
    apiClient.get(`/call-logs?lead_id=${leadId}`),

  /**
   * Get call logs for a specific organization
   */
  getByOrganization: (organizationId: number) => 
    apiClient.get(`/call-logs?organization_id=${organizationId}`),

  /**
   * Get scheduled call logs
   */
  getScheduled: (params?: { per_page?: number; page?: number }) => 
    apiClient.get('/call-logs/scheduled', { params }),

  /**
   * Get a specific call log by ID
   */
  getById: (id: number) => apiClient.get(`/call-logs/${id}`),

  /**
   * Create a new call log
   */
  create: (data: CallLogFormData) => apiClient.post('/call-logs', data),

  /**
   * Update an existing call log
   */
  update: (id: number, data: Partial<CallLogFormData>) => 
    apiClient.put(`/call-logs/${id}`, data),

  /**
   * Delete a call log
   */
  delete: (id: number) => apiClient.delete(`/call-logs/${id}`),

  /**
   * Mark a call log as completed
   */
  complete: (id: number) => 
    apiClient.patch(`/call-logs/${id}/complete`),

  /**
   * Get call log statistics
   */
  getStats: () => apiClient.get('/call-logs/stats'),
};