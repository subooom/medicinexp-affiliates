// src/offline/cache.ts — last good response for each GET, per program, so screens still
// show venues, leads, materials, stock and earnings without internet.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cache:v1:';
const INDEX_KEY = 'cache:v1:index';
const MAX_ENTRIES = 400;

type Entry = { data: unknown; at: number };

let index: Record<string, number> | null = null;

async function loadIndex(): Promise<Record<string, number>> {
  if (!index) {
    try {
      index = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || '{}');
    } catch {
      index = {};
    }
  }
  return index!;
}

/** Stable key: program + path + sorted query params. */
export function cacheKey(programId: string | null, url: string, params?: Record<string, unknown>): string {
  const clean = Object.keys(params || {})
    .filter((k) => params![k] !== undefined && params![k] !== null && params![k] !== '')
    .sort()
    .map((k) => `${k}=${String(params![k])}`)
    .join('&');
  return `${programId ?? '-'}|${url}${clean ? `?${clean}` : ''}`;
}

export const responseCache = {
  async get(key: string): Promise<Entry | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as Entry) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, data: unknown): Promise<void> {
    try {
      const idx = await loadIndex();
      const at = Date.now();
      idx[key] = at;
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, at }));

      // Drop the oldest entries beyond the limit
      const keys = Object.keys(idx);
      if (keys.length > MAX_ENTRIES) {
        const old = keys.sort((a, b) => idx[a] - idx[b]).slice(0, keys.length - MAX_ENTRIES);
        old.forEach((k) => delete idx[k]);
        await AsyncStorage.multiRemove(old.map((k) => PREFIX + k));
      }
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    } catch {
      // A full disk shouldn't break the screen that made the request
    }
  },

  async clear(): Promise<void> {
    const idx = await loadIndex();
    await AsyncStorage.multiRemove([...Object.keys(idx).map((k) => PREFIX + k), INDEX_KEY]);
    index = {};
  },
};
