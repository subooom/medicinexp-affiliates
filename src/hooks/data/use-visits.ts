// src/hooks/data/use-visits.ts
import { visitApi } from '@/api/visits';
import { Visit, VisitFilters } from '@/types/models';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sendOrQueue } from '@/offline/send';

const PER_PAGE = 20;

interface UseVisitsResult {
  data: Visit[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateVisit: (id: number, data: Partial<Pick<Visit, 'notes' | 'status' | 'visited_at'>>) => Promise<Visit>;
  deleteVisit: (id: number) => Promise<void>;
  hasMore: boolean;
  clearError: () => void;
}

// The API returns { success, data: <Laravel paginator> }
function readPage(response: any): { items: Visit[]; currentPage: number; lastPage: number } {
  const paginator = response?.data?.data ?? {};
  return {
    items: paginator.data ?? [],
    currentPage: paginator.current_page ?? 1,
    lastPage: paginator.last_page ?? 1,
  };
}

export function useVisits(filters?: VisitFilters): UseVisitsResult {
  const [data, setData] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const isMounted = useRef(true);
  const isLoadingMore = useRef(false);
  const filtersKey = JSON.stringify(filters ?? {});

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      const response = await visitApi.getAll({ ...filters, page: pageToLoad, per_page: PER_PAGE });
      return readPage(response);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersKey]
  );

  const loadFirstPage = useCallback(async () => {
    try {
      const result = await fetchPage(1);
      if (!isMounted.current) return;
      setData(result.items);
      setPage(result.currentPage);
      setHasMore(result.currentPage < result.lastPage);
      setError(null);
    } catch (err: any) {
      if (isMounted.current) setError(err.message || 'Failed to fetch visits');
    }
  }, [fetchPage]);

  useEffect(() => {
    setLoading(true);
    loadFirstPage().finally(() => {
      if (isMounted.current) setLoading(false);
    });
  }, [loadFirstPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirstPage();
    if (isMounted.current) setRefreshing(false);
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore.current || !hasMore || loading) return;

    isLoadingMore.current = true;
    try {
      const result = await fetchPage(page + 1);
      if (!isMounted.current) return;
      setData((prev) => [...prev, ...result.items]);
      setPage(result.currentPage);
      setHasMore(result.currentPage < result.lastPage);
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      isLoadingMore.current = false;
    }
  }, [fetchPage, page, hasMore, loading]);

  const updateVisit = useCallback(async (id: number, updateData: Partial<Pick<Visit, 'notes' | 'status' | 'visited_at'>>): Promise<Visit> => {
    const response = await visitApi.update(id, updateData);
    const updated: Visit = response.data.data;
    if (isMounted.current) {
      setData((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated, venue: updated.venue ?? v.venue } : v)));
    }
    return updated;
  }, []);

  const deleteVisit = useCallback(async (id: number): Promise<void> => {
    await visitApi.delete(id);
    if (isMounted.current) {
      setData((prev) => prev.filter((v) => v.id !== id));
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    loadMore,
    updateVisit,
    deleteVisit,
    hasMore,
    clearError,
  };
}

export function useVisit(id: number) {
  const [data, setData] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await visitApi.getById(id);
      setData(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visit');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateVisit = useCallback(
    async (updateData: Partial<Pick<Visit, 'notes' | 'status' | 'visited_at'>>) => {
      const result = await sendOrQueue<Visit>({ method: 'put', url: `/visits/${id}`, data: updateData, label: 'Visit change' });
      // Offline: show the change now; the queue sends it later
      const updated = result.queued ? ({ ...(data as Visit), ...updateData } as Visit) : result.data;
      setData((prev) => (prev ? { ...prev, ...updated, venue: updated.venue ?? prev.venue } : updated));
      return updated;
    },
    [id, data]
  );

  const deleteVisit = useCallback(async () => {
    await visitApi.delete(id);
    setData(null);
  }, [id]);

  return { data, loading, error, reload: load, updateVisit, deleteVisit };
}
