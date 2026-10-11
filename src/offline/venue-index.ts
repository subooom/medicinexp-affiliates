// src/offline/venue-index.ts — pharmacies stored on the phone so the MR can search,
// find nearby ones and check in without internet. Venues added offline get a temporary
// negative id until they sync (the queue sends their client_uuid instead).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Venue } from '@/types/models';

const KEY = 'venue-index:v1';
const PAGE_SIZE = 100;
const MAX_PAGES = 15;
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;

type Stored = { venues: Venue[]; at: number; pending: (Venue & { client_uuid: string })[] };

let state: Stored | null = null;

async function load(): Promise<Stored> {
  if (!state) {
    try {
      state = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null') || { venues: [], at: 0, pending: [] };
    } catch {
      state = { venues: [], at: 0, pending: [] };
    }
  }
  return state!;
}

async function save() {
  if (state) {
    await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
  }
}

const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const venueIndex = {
  async all(): Promise<Venue[]> {
    const s = await load();
    return [...s.pending, ...s.venues];
  },

  async needsRefresh(): Promise<boolean> {
    return Date.now() - (await load()).at > REFRESH_AFTER_MS;
  },

  /**
   * Download venues page by page (newest first). `fetchPage` is venueApi.getAll.
   */
  async refresh(fetchPage: (page: number, perPage: number) => Promise<{ data: Venue[]; last_page: number }>) {
    const venues: Venue[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await fetchPage(page, PAGE_SIZE);
      venues.push(...result.data);
      if (page >= result.last_page) break;
    }
    const s = await load();
    const synced = new Set(venues.map((v: any) => v.client_uuid).filter(Boolean));
    s.venues = venues;
    s.pending = s.pending.filter((v) => !synced.has(v.client_uuid));
    s.at = Date.now();
    await save();
  },

  async search(text: string, limit = 15): Promise<Venue[]> {
    const q = text.trim().toLowerCase();
    const all = await this.all();
    return all
      .filter((v) => [v.name, v.address, v.city, v.phone].some((field) => field && field.toLowerCase().includes(q)))
      .slice(0, limit);
  },

  async nearby(latitude: number, longitude: number, radiusKm = 2, limit = 100): Promise<Venue[]> {
    const all = await this.all();
    return all
      .filter((v) => v.latitude !== null && v.longitude !== null)
      .map((v) => ({ ...v, distance: distanceKm(latitude, longitude, Number(v.latitude), Number(v.longitude)) }))
      .filter((v) => v.distance! <= radiusKm)
      .sort((a, b) => a.distance! - b.distance!)
      .slice(0, limit);
  },

  async find(id: number): Promise<Venue | null> {
    return (await this.all()).find((v) => v.id === id) ?? null;
  },

  /** A venue created offline: usable at once, with a temporary negative id. */
  async addPending(venue: Omit<Venue, 'id'> & { client_uuid: string }): Promise<Venue> {
    const s = await load();
    const tempId = -Date.now();
    const pending = { ...venue, id: tempId } as Venue & { client_uuid: string };
    s.pending.unshift(pending);
    await save();
    return pending;
  },

  /** client_uuid of a venue created offline, for a temporary (negative) id. */
  async clientUuidFor(tempId: number): Promise<string | null> {
    const s = await load();
    return s.pending.find((v) => v.id === tempId)?.client_uuid ?? null;
  },

  async clear() {
    state = { venues: [], at: 0, pending: [] };
    await AsyncStorage.removeItem(KEY);
  },
};
