// src/hooks/useVisits.ts
import { visitRepository } from '@/api/visits';
import { syncService } from '@/service/BackgroundSyncService';
import { Visit, VisitFilters } from '@/types/models';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVisitsResult {
  data: Visit[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  createVisit: (data: Partial<Visit>) => Promise<Visit>;
  updateVisit: (id: number, data: Partial<Visit>) => Promise<Visit>;
  deleteVisit: (id: number) => Promise<void>;
  hasMore: boolean;
  syncStatus: {
    isSyncing: boolean;
    queueLength: number;
    lastSyncTime: number | null;
  };
  clearError: () => void;
}

export function useVisits(filters?: VisitFilters): UseVisitsResult {
  const [data, setData] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    queueLength: 0,
    lastSyncTime: null as number | null,
  });

  const isMounted = useRef(true);
  const isLoadingMore = useRef(false);
  const currentFilters = useRef(filters);

  // Fetch data
  const fetchData = useCallback(
    async (resetData = false) => {
      try {
        const currentPage = resetData ? 1 : page;
        const result = await visitRepository.getAll({
          ...currentFilters.current,
          page: currentPage,
          limit: 20,
        });

        if (!isMounted.current) return;


        if (resetData) {
          setData(result.data.data);
          setPage(1);
        } else {
          setData((prev) => [...prev, ...result]);
        }

        setHasMore(result.length === 20);
        setError(null);
        return result;
      } catch (err: any) {
        if (isMounted.current) {
          // Check if it's an offline error
          if (err.message?.includes('offline') || err.queued) {
            setError('You are offline. Data will sync when you reconnect.');
          } else {
            setError(err.message || 'Failed to fetch visits');
          }
        }
        return [];
      }
    },
    [page]
  );

  // Initial load
  useEffect(() => {
    currentFilters.current = filters;
  }, [filters]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData(true);
      setLoading(false);
    };

    loadData();

    return () => {
      isMounted.current = false;
    };
  }, [filters, fetchData]);

  // Monitor sync status
  useEffect(() => {
    const updateSyncStatus = () => {
      if (!isMounted.current) return;
      const status = syncService.getSyncStatus();
      setSyncStatus({
        isSyncing: status.isSyncing,
        queueLength: status.queueLength,
        lastSyncTime: status.lastSyncTime || null,
      });
    };

    // Update immediately
    updateSyncStatus();

    // Update every 3 seconds
    const interval = setInterval(updateSyncStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  // Refresh (pull to refresh)
  const refresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      // Force refresh from API
      await visitRepository.getAll({ 
        ...currentFilters.current, 
        page: 1,
        forceRefresh: true 
      });
      await fetchData(true);
      
      // Trigger background sync
      await syncService.sync();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [filters, fetchData, refreshing]);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore.current || !hasMore || loading) return;

    isLoadingMore.current = true;
    try {
      const nextPage = page + 1;
      const result = await visitRepository.getAll({
        ...currentFilters.current,
        page: nextPage,
        limit: 20,
      });

      if (isMounted.current) {
        setData((prev) => [...prev, ...result]);
        setPage(nextPage);
        setHasMore(result.length === 20);
      }
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      isLoadingMore.current = false;
    }
  }, [page, hasMore, loading, filters]);

  // CRUD operations with optimistic updates
  const createVisit = useCallback(
    async (visitData: Partial<Visit>): Promise<Visit> => {
      try {
        // Optimistic update
        const optimisticVisit: Visit = {
          id: Date.now(), // Temporary ID
          ...visitData,
          status: 'planned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Visit;

        // Update UI immediately
        if (isMounted.current) {
          setData((prev) => [optimisticVisit, ...prev]);
        }

        // Actually create on server
        const newVisit = await visitRepository.create(visitData);
        
        // Replace optimistic with real data
        if (isMounted.current) {
          setData((prev) => 
            prev.map((v) => (v.id === optimisticVisit.id ? newVisit : v))
          );
        }
        
        return newVisit;
      } catch (error) {
        // Revert optimistic update
        if (isMounted.current) {
          setData((prev) => 
            prev.filter((v) => v.id !== Date.now())
          );
        }
        console.error('Failed to create visit:', error);
        throw error;
      }
    },
    []
  );

  const updateVisit = useCallback(
    async (id: number, updateData: Partial<Visit>): Promise<Visit> => {
      try {
        // Optimistic update
        if (isMounted.current) {
          setData((prev) =>
            prev.map((v) =>
              v.id === id ? { ...v, ...updateData, status: 'planned' } : v
            )
          );
        }

        const updated = await visitRepository.update(id, updateData);
        
        // Replace with real data
        if (isMounted.current) {
          setData((prev) =>
            prev.map((v) => (v.id === id ? updated : v))
          );
        }
        
        return updated;
      } catch (error) {
        // Revert optimistic update
        if (isMounted.current) {
          await fetchData(true);
        }
        console.error('Failed to update visit:', error);
        throw error;
      }
    },
    [fetchData]
  );

  const deleteVisit = useCallback(
    async (id: number): Promise<void> => {
      try {
        // Optimistic delete
        if (isMounted.current) {
          setData((prev) => prev.filter((v) => v.id !== id));
        }

        await visitRepository.delete(id);
      } catch (error) {
        // Revert optimistic delete
        if (isMounted.current) {
          await fetchData(true);
        }
        console.error('Failed to delete visit:', error);
        throw error;
      }
    },
    [fetchData]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    loadMore,
    createVisit,
    updateVisit,
    deleteVisit,
    hasMore,
    syncStatus,
    clearError,
  };
}

// Single visit hook
export function useVisit(id: number) {
  const [data, setData] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchVisit = async () => {
      try {
        setLoading(true);
        const result = await visitRepository.getById(id);
        if (isMounted.current) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted.current) {
          setError(err.message || 'Failed to fetch visit');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchVisit();

    return () => {
      isMounted.current = false;
    };
  }, [id]);

  const updateVisit = useCallback(
    async (updateData: Partial<Visit>) => {
      try {
        // Optimistic update
        if (isMounted.current && data) {
          setData({ ...data, ...updateData, status: 'planned' });
        }

        const result = await visitRepository.update(id, updateData);
        
        if (isMounted.current) {
          setData(result);
        }
        return result;
      } catch (error) {
        // Revert
        if (isMounted.current && id) {
          const original = await visitRepository.getById(id);
          setData(original);
        }
        console.error('Failed to update visit:', error);
        throw error;
      }
    },
    [id, data]
  );

  const deleteVisit = useCallback(async () => {
    try {
      await visitRepository.delete(id);
      if (isMounted.current) {
        setData(null);
      }
    } catch (error) {
      console.error('Failed to delete visit:', error);
      throw error;
    }
  }, [id]);

  return {
    data,
    loading,
    error,
    updateVisit,
    deleteVisit,
  };
}