// src/utils/speech-support.ts — whether this phone can speak and understand Nepali, and where
// to send the rep when it can't. Phones differ a lot: many Androids have English only until a
// Nepali voice / speech model is downloaded.
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Linking, Platform } from 'react-native';

const sameLanguage = (locale: string, lang: string) =>
  locale.replace('_', '-').toLowerCase().split('-')[0] === lang.toLowerCase().split('-')[0];

// ---------------------------------------------------------------------------------------------
// Reading aloud (text to speech)
// ---------------------------------------------------------------------------------------------

/** A Nepali voice on this phone, or null when it has none (reading aloud needs one installed). */
export async function voiceFor(lang: 'en' | 'ne'): Promise<string | null | undefined> {
  if (lang === 'en') return undefined; // the phone's default voice
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const match = voices.find((v) => sameLanguage(v.language, 'ne'));
    return match ? match.identifier : null;
  } catch {
    return null;
  }
}

/** Android's "Text-to-speech output" settings, where voices are picked and downloaded. */
export async function openVoiceSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // Straight to the screen that offers voice data downloads, else text-to-speech settings
      await Linking.sendIntent('android.speech.tts.engine.INSTALL_TTS_DATA');
      return;
    } catch {
      try {
        await Linking.sendIntent('com.android.settings.TTS_SETTINGS');
        return;
      } catch {
        // fall through
      }
    }
  }
  await Linking.openSettings();
}

// ---------------------------------------------------------------------------------------------
// Writing out what was said (speech recognition)
// ---------------------------------------------------------------------------------------------

export type RecognitionPlan =
  // Recognise on the phone, no internet needed
  | { kind: 'on-device'; servicePackage?: string }
  // Recognise through the service online (needs internet while recording)
  | { kind: 'online'; servicePackage?: string }
  // Nothing on this phone understands the language: record audio only
  | { kind: 'none' }
  // The phone doesn't say (iOS, Android 12 or older): try, and fall back if it fails
  | { kind: 'unknown' };

// Google's services understand Nepali; a phone maker's own (e.g. vivo's) often doesn't
const PREFERRED_SERVICES = ['com.google.android.as', 'com.google.android.googlequicksearchbox', 'com.google.android.tts'];

/** Which recogniser to use for this language, checked before recording starts. */
export async function recognitionPlanFor(lang: string): Promise<RecognitionPlan> {
  if (Platform.OS !== 'android') return { kind: 'unknown' };

  let services: string[] = [];
  try {
    services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
  } catch {
    services = [];
  }
  const candidates = [...PREFERRED_SERVICES.filter((s) => services.includes(s)), undefined];

  let anyAnswer = false;
  let online: RecognitionPlan | null = null;
  for (const servicePackage of candidates) {
    try {
      const { locales, installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales(
        servicePackage ? { androidRecognitionServicePackage: servicePackage } : {}
      );
      if (locales.length || installedLocales.length) anyAnswer = true;
      if (installedLocales.some((l) => sameLanguage(l, lang))) return { kind: 'on-device', servicePackage };
      if (!online && locales.some((l) => sameLanguage(l, lang))) online = { kind: 'online', servicePackage };
    } catch {
      // this service can't list languages; try the next
    }
  }
  if (online) return online;
  return anyAnswer ? { kind: 'none' } : { kind: 'unknown' };
}

/**
 * Ask Android to download the offline speech model (Android 13+). Returns a short message for
 * the rep, or null when this phone can't do it from the app.
 */
export async function downloadSpeechModel(lang: string): Promise<string | null> {
  try {
    const { status } = await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: lang });
    if (status === 'download_success') return 'Downloaded. Try recording again.';
    if (status === 'download_scheduled') return 'Downloading (it may wait for Wi-Fi). Try again in a few minutes.';
    return 'Follow the download on screen, then try recording again.';
  } catch {
    return null;
  }
}
