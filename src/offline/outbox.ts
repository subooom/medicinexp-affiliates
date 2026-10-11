// src/offline/outbox.ts — writes made without internet, saved on the phone and sent in
// order when it's back. Every create carries a client_uuid, so a request that is sent
// twice (app killed mid-send) is still stored once on the server.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import apiClient from '@/api/client';
import { uuidv4 } from '@/utils/uuid';
import { isNetworkError } from './network';
import { venueIndex } from './venue-index';

const KEY = 'outbox:v1';

export type OutboxFile = { uri: string; name: string; type: string; field?: string };

export interface OutboxItem {
  id: string;
  createdAt: string;
  // The program the MR was working in when they made it
  programId: string | null;
  // What the MR sees in the sync list, e.g. "Visit at Sharma Pharmacy"
  label: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  url: string;
  data?: Record<string, any>;
  // Sent as multipart/form-data (photos, voice memos)
  file?: OutboxFile;
  attempts: number;
  status: 'pending' | 'failed';
  error?: string;
}

type Listener = (items: OutboxItem[]) => void;

let items: OutboxItem[] | null = null;
let flushing: Promise<FlushResult> | null = null;
const listeners = new Set<Listener>();

export type FlushResult = { sent: number; failed: number; remaining: number; stoppedOffline: boolean };

async function load(): Promise<OutboxItem[]> {
  if (!items) {
    try {
      items = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
    } catch {
      items = [];
    }
  }
  return items!;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(items ?? []));
  const snapshot = [...(items ?? [])];
  listeners.forEach((listener) => listener(snapshot));
}

/**
 * Items made offline may point at a venue that was also made offline (negative id):
 * send its client_uuid instead, which the server swaps for the real id.
 */
export async function resolveTempIds(data?: Record<string, any>): Promise<Record<string, any> | undefined> {
  if (!data || typeof data.venue_id !== 'number' || data.venue_id >= 0) {
    return data;
  }
  const uuid = await venueIndex.clientUuidFor(data.venue_id);
  const { venue_id, ...rest } = data;
  return uuid ? { ...rest, venue_client_uuid: uuid } : rest;
}

function toFormData(data: Record<string, any> | undefined, file: OutboxFile): FormData {
  const form = new FormData();
  Object.entries(data ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });
  // React Native's FormData takes { uri, name, type } for files
  form.append(file.field ?? 'file', { uri: file.uri, name: file.name, type: file.type } as any);
  return form;
}

function deleteLocalFile(file?: OutboxFile) {
  if (!file) return;
  try {
    const local = new File(file.uri);
    if (local.exists) local.delete();
  } catch {
    // Already gone
  }
}

async function send(item: OutboxItem) {
  const headers: Record<string, string> = {};
  if (item.programId) headers['X-Program-Id'] = item.programId;

  if (item.file) {
    return apiClient.request({
      method: item.method,
      url: item.url,
      data: toFormData(item.data, item.file),
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  }

  return apiClient.request({ method: item.method, url: item.url, data: item.data, headers });
}

export const outbox = {
  async list(): Promise<OutboxItem[]> {
    return [...(await load())];
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    load().then((current) => listener([...current]));
    return () => listeners.delete(listener);
  },

  async hasPending(): Promise<boolean> {
    return (await load()).some((item) => item.status === 'pending');
  },

  async enqueue(item: Pick<OutboxItem, 'label' | 'method' | 'url' | 'data' | 'file' | 'programId'>): Promise<OutboxItem> {
    const list = await load();
    const queued: OutboxItem = {
      ...item,
      data: await resolveTempIds(item.data),
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
    };
    list.push(queued);
    await persist();
    return queued;
  },

  async retry(id: string) {
    const list = await load();
    const item = list.find((i) => i.id === id);
    if (item) {
      item.status = 'pending';
      item.error = undefined;
      await persist();
    }
  },

  async retryAll() {
    (await load()).forEach((item) => {
      item.status = 'pending';
      item.error = undefined;
    });
    await persist();
  },

  async discard(id: string) {
    const list = await load();
    const index = list.findIndex((i) => i.id === id);
    if (index >= 0) {
      deleteLocalFile(list[index].file);
      list.splice(index, 1);
      await persist();
    }
  },

  /**
   * Send pending items oldest first. Stops at the first network problem (try again
   * later); an item the server rejects (e.g. validation) is marked failed and skipped
   * so it can't block everything behind it.
   */
  flush(): Promise<FlushResult> {
    if (flushing) return flushing;

    flushing = (async () => {
      const result: FlushResult = { sent: 0, failed: 0, remaining: 0, stoppedOffline: false };
      const list = await load();

      for (const item of [...list]) {
        if (item.status !== 'pending') continue;

        try {
          item.attempts += 1;
          await send(item);
          list.splice(list.indexOf(item), 1);
          deleteLocalFile(item.file);
          result.sent += 1;
          await persist();
        } catch (error: any) {
          const status = error?.status as number | undefined;
          if (isNetworkError(error) || status === 401 || status === 408 || status === 429 || (status && status >= 500)) {
            // Not this item's fault: keep it and try again later
            result.stoppedOffline = isNetworkError(error);
            await persist();
            break;
          }
          item.status = 'failed';
          item.error = error?.message || `Error ${status}`;
          result.failed += 1;
          await persist();
        }
      }

      result.remaining = list.length;
      return result;
    })().finally(() => {
      flushing = null;
    });

    return flushing;
  },

  async clear() {
    (await load()).forEach((item) => deleteLocalFile(item.file));
    items = [];
    await persist();
  },
};
