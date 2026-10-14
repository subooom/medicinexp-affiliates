// src/hooks/use-narrator.ts — reads guide text aloud with the phone's own voice (works offline).
// One reading at a time: starting another stops the first. No Nepali voice on the phone →
// the rep can hear it in English or go and add the Nepali voice.
import { Language, Localized, pick } from '@/utils/language';
import { openVoiceSettings, voiceFor } from '@/utils/speech-support';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// Slightly slower than default: easier to follow outside a noisy shop
const RATE = 0.95;
// Android limits one utterance's length; guide texts are short, but split long ones anyway
const CHUNK = 3000;

const LOCALE: Record<Language, string> = { en: 'en-US', ne: 'ne-NP' };

export function useNarrator(language: Language) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const current = useRef<string | null>(null);

  const stop = useCallback(() => {
    current.current = null;
    setSpeakingId(null);
    Speech.stop().catch(() => undefined);
  }, []);

  // Never keep talking after the screen is gone
  useEffect(() => stop, [stop]);

  const speak = useCallback((id: string, texts: Localized[], lang: Language, voice?: string) => {
    Speech.stop().catch(() => undefined);
    current.current = id;
    setSpeakingId(id);

    const pieces = texts
      .map((text) => pick(text, lang).trim())
      .filter(Boolean)
      .flatMap((text) => (text.length > CHUNK ? text.match(new RegExp(`[\\s\\S]{1,${CHUNK}}(\\s|$)`, 'g')) ?? [text] : [text]));

    pieces.forEach((piece, index) => {
      const last = index === pieces.length - 1;
      Speech.speak(piece, {
        language: LOCALE[lang],
        voice,
        rate: RATE,
        // Only the last piece ends the reading; a stop or error ends it at once
        onDone: last
          ? () => {
              if (current.current === id) stop();
            }
          : undefined,
        onStopped: () => {
          if (current.current === id) setSpeakingId(null);
        },
        onError: () => {
          if (current.current === id) stop();
        },
      });
    });
  }, [stop]);

  /** ▶ / ■ for one FAQ or section. */
  const toggle = useCallback(
    async (id: string, texts: Localized[]) => {
      if (current.current === id) return stop();

      if (language === 'en') return speak(id, texts, 'en');

      const voice = await voiceFor('ne');
      if (voice) return speak(id, texts, 'ne', voice);

      Alert.alert(
        'नेपाली आवाज छैन · No Nepali voice',
        'This phone has no Nepali voice for reading aloud yet. You can hear it in English now, or add the Nepali voice (free) and come back.',
        [
          { text: 'Read in English', onPress: () => speak(id, texts, 'en') },
          {
            text: 'Add Nepali voice',
            onPress: () => {
              Alert.alert(
                'Add the Nepali voice',
                'In the screen that opens:\n1. Preferred engine: choose "Speech Services by Google" (install it from Play Store if missing).\n2. Tap the gear next to it → Install voice data → Nepali → download.\n3. Come back and press play again.',
                [{ text: 'Open settings', onPress: () => openVoiceSettings() }, { text: 'Later', style: 'cancel' }]
              );
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    [language, speak, stop]
  );

  return { speakingId, toggle, stop };
}
