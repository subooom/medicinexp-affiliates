// src/api/visits.ts
import { Visit, VisitFilters, VisitStats } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './client.advanced';

class VisitRepository {
  // Cache TTLs
  private static readonly CACHE_TTL = {
    LIST: 2 * 60 * 1000, // 2 minutes
    DETAIL: 5 * 60 * 1000, // 5 minutes
    STATS: 10 * 60 * 1000, // 10 minutes
  };

  async getAll(filters?: VisitFilters): Promise<Visit[]> {
    const response = await apiClient.get<Visit[]>('/visits', {
      params: filters,
      cache: { 
        ttl: VisitRepository.CACHE_TTL.LIST,
        staleWhileRevalidate: true 
      }
    });
    return response; // ✅ Extract the data
  }

  async getById(id: number): Promise<Visit> {
    return apiClient.get<Visit>(`/visits/${id}`, {
      cache: { 
        ttl: VisitRepository.CACHE_TTL.DETAIL,
        staleWhileRevalidate: true 
      }
    });
  }

  async create(data: Partial<Visit>): Promise<Visit> {
    // Optimistic update: return local version immediately
    const optimisticVisit: Visit = {
      id: Date.now(), // temporary ID
      ...data,
      status: 'planned',
      created_at: new Date().toISOString(),
    } as Visit;

    // Store locally first
    await this.storeLocally(optimisticVisit);

    // Then make API call
    try {
      const result = await apiClient.post<Visit>('/visits', data);
      // Update local with server response
      await this.updateLocal(optimisticVisit.id, result);
      return result;
    } catch (error) {
      // Mark as failed sync
      await this.markSyncFailed(optimisticVisit.id);
      throw error;
    }
  }

  async update(id: number, data: Partial<Visit>): Promise<Visit> {
    // Similar optimistic update pattern
    await this.updateLocally(id, { ...data, status: 'planned' });
    
    try {
      const result = await apiClient.put<Visit>(`/visits/${id}`, data);
      await this.updateLocal(id, result);
      return result;
    } catch (error) {
      await this.markSyncFailed(id);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.markForDeletion(id);
    try {
      await apiClient.delete(`/visits/${id}`);
      await this.removeLocally(id);
    } catch (error) {
      await this.markDeletionFailed(id);
      throw error;
    }
  }

  async checkout(id: number): Promise<Visit> {
    return apiClient.patch<Visit>(`/visits/${id}/checkout`, {});
  }

  async getStats(): Promise<VisitStats> {
    return apiClient.get<VisitStats>('/visits/stats', {
      cache: { 
        ttl: VisitRepository.CACHE_TTL.STATS,
        staleWhileRevalidate: true 
      }
    });
  }

  async getMonthly(params?: any): Promise<Visit[]> {
    return apiClient.get<Visit[]>('/visits/monthly', {
      params,
      cache: { 
        ttl: VisitRepository.CACHE_TTL.LIST,
        staleWhileRevalidate: true 
      }
    });
  }

  // Local storage methods (using AsyncStorage or SQLite)
  private async storeLocally(visit: Visit): Promise<void> {
    const visits = await this.getLocalVisits();
    visits.push(visit);
    await AsyncStorage.setItem('visits_local', JSON.stringify(visits));
  }

  private async getLocalVisits(): Promise<Visit[]> {
    const data = await AsyncStorage.getItem('visits_local');
    return data ? JSON.parse(data) : [];
  }

  private async updateLocal(tempId: number, serverVisit: Visit): Promise<void> {
    const visits = await this.getLocalVisits();
    const index = visits.findIndex(v => v.id === tempId);
    if (index !== -1) {
      visits[index] = serverVisit;
      await AsyncStorage.setItem('visits_local', JSON.stringify(visits));
    }
  }

  private async updateLocally(id: number, data: Partial<Visit>): Promise<void> {
    const visits = await this.getLocalVisits();
    const index = visits.findIndex(v => v.id === id);
    if (index !== -1) {
      visits[index] = { ...visits[index], ...data };
      await AsyncStorage.setItem('visits_local', JSON.stringify(visits));
    }
  }

  private async markSyncFailed(id: number): Promise<void> {
    const visits = await this.getLocalVisits();
    const index = visits.findIndex(v => v.id === id);
    if (index !== -1) {
      visits[index].status = 'cancelled';
      await AsyncStorage.setItem('visits_local', JSON.stringify(visits));
    }
  }

  private async markForDeletion(id: number): Promise<void> {
    const deleted = await AsyncStorage.getItem('deleted_visits') || '[]';
    const deletedArray = JSON.parse(deleted);
    deletedArray.push(id);
    await AsyncStorage.setItem('deleted_visits', JSON.stringify(deletedArray));
  }

  private async removeLocally(id: number): Promise<void> {
    const visits = await this.getLocalVisits();
    const filtered = visits.filter(v => v.id !== id);
    await AsyncStorage.setItem('visits_local', JSON.stringify(filtered));
  }

  private async markDeletionFailed(id: number): Promise<void> {
    // Store for retry
    const failedDeletions = await AsyncStorage.getItem('failed_deletions') || '[]';
    const failures = JSON.parse(failedDeletions);
    failures.push(id);
    await AsyncStorage.setItem('failed_deletions', JSON.stringify(failures));
  }

  // Sync method
  async sync(): Promise<void> {
    // Sync failed creations/updates
    const visits = await this.getLocalVisits();
    const pendingVisits = visits.filter(v => v.status === 'planned' || v.status === 'cancelled');
    
    for (const visit of pendingVisits) {
      try {
        // Try to sync each pending visit
        const result = await apiClient.post<Visit>('/visits', visit);
        await this.updateLocal(visit.id, result);
      } catch (error) {
        console.error(`Failed to sync visit ${visit.id}:`, error);
      }
    }

    // Sync deletions
    const deletedData = await AsyncStorage.getItem('deleted_visits') || '[]';
    const deletedIds = JSON.parse(deletedData);
    
    for (const id of deletedIds) {
      try {
        await apiClient.delete(`/visits/${id}`);
        // Remove from deleted queue
        const updated = deletedIds.filter((d: number) => d !== id);
        await AsyncStorage.setItem('deleted_visits', JSON.stringify(updated));
      } catch (error) {
        console.error(`Failed to delete visit ${id}:`, error);
      }
    }
  }
}

export const visitRepository = new VisitRepository();