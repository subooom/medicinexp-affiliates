// src/api/guide.ts — the rep guide. The server keeps it in one JSON file; the phone keeps the
// last copy it got (offline) and the app ships one too, so it opens even on a fresh install.
import bundled from '@/content/rep-guide.json';
import { Localized } from '@/utils/language';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './client';

export interface GuideLink {
  label: Localized;
  // An app screen, e.g. "/(app)/tiers"
  route: string;
}

export interface GuideItem {
  title: Localized;
  body: Localized;
  link?: GuideLink;
}

export interface GuideSection {
  id: string;
  icon: string;
  title: Localized;
  items: GuideItem[];
}

export interface Guide {
  version: number;
  updated?: string;
  faq: { q: Localized; a: Localized; link?: GuideLink }[];
  sections: GuideSection[];
}

type GuideResponse = { changed: false; etag: string } | { changed: true; etag: string; guide: Guide };

const CACHE_KEY = 'guide.cache';

export const guideApi = {
  /** What to show right away: the phone's last copy, else the one inside the app. */
  async local(): Promise<{ guide: Guide; etag?: string }> {
    try {
      const saved = await AsyncStorage.getItem(CACHE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fall through to the built-in copy
    }
    return { guide: bundled as Guide };
  },

  /** Ask the server for a newer guide; null when there isn't one (or no internet). */
  async refresh(etag?: string): Promise<Guide | null> {
    try {
      const data = (await apiClient.get<{ data: GuideResponse }>('/guide', { params: etag ? { etag } : undefined })).data.data;
      if (!data.changed) return null;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ guide: data.guide, etag: data.etag }));
      return data.guide;
    } catch {
      return null;
    }
  },
};
