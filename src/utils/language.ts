// src/utils/language.ts — English or Nepali for the guide and the welcome tour, remembered on
// the phone. Text comes as { en, ne }; missing Nepali falls back to English.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Language = 'en' | 'ne';
export type Localized = { en: string; ne?: string };

const KEY = 'app.language';
let current: Language = 'en';
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((saved) => {
    if (saved === 'en' || saved === 'ne') setLanguage(saved, false);
  })
  .catch(() => undefined);

export function setLanguage(language: Language, save = true) {
  current = language;
  listeners.forEach((listener) => listener());
  if (save) AsyncStorage.setItem(KEY, language).catch(() => undefined);
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => current
  );
}

/** The text in the chosen language (English when the Nepali isn't written yet). */
export const pick = (text: Localized | undefined, language: Language): string =>
  (language === 'ne' && text?.ne?.trim() ? text.ne : text?.en) ?? '';
