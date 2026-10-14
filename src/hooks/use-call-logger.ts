// src/hooks/use-call-logger.ts — tap to call, then log it in one tap when you come back.
// Phones don't let apps read call duration without heavy permissions, so the time away
// from the app is used as the estimate and the MR confirms how it went.
import { queuedMessage, sendOrQueue } from '@/offline/send';
import { noteContactEvent } from '@/utils/contact-sync';
import { toLocalDateString } from '@/utils/time';
import { uuidv4 } from '@/utils/uuid';
import { useEffect, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';

type Target = { phone: string; name: string; leadId?: number | null; venueId?: number | null };

const pad = (n: number) => String(n).padStart(2, '0');

export function useCallLogger(onLogged?: () => void) {
  const pending = useRef<{ target: Target; startedAt: number; via: 'phone' | 'whatsapp' } | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const call = pending.current;
      if (state !== 'active' || !call) return;
      pending.current = null;

      const seconds = Math.round((Date.now() - call.startedAt) / 1000);
      // Came straight back: they probably didn't call
      if (seconds < 8) return;
      const minutes = Math.max(1, Math.round(seconds / 60));

      const save = async (status: 'completed' | 'missed') => {
        const started = new Date(call.startedAt);
        try {
          const result = await sendOrQueue({
            method: 'post',
            url: '/call-logs',
            label: `Call: ${call.target.name}`,
            data: {
              direction: 'outgoing',
              status,
              call_date: toLocalDateString(started),
              call_time: `${pad(started.getHours())}:${pad(started.getMinutes())}`,
              duration_minutes: status === 'completed' ? minutes : 0,
              notes: call.via === 'whatsapp' ? 'WhatsApp call' : null,
              lead_id: call.target.leadId ?? null,
              venue_id: call.target.venueId ?? null,
              client_uuid: uuidv4(),
            },
          });
          if (result.queued) Alert.alert('Call logged', queuedMessage);
          // A saved contact shows the latest event on the call screen
          const day = started.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          noteContactEvent(call.target.phone, status === 'completed' ? `Called ${day}` : `No answer ${day}`);
          onLogged?.();
        } catch (error: any) {
          Alert.alert('Could not log the call', error.message || 'Please add it from Calls.');
        }
      };

      Alert.alert(`Call with ${call.target.name}`, `About ${minutes} min. How did it go?`, [
        { text: 'Skip', style: 'cancel' },
        { text: 'No answer', onPress: () => save('missed') },
        { text: 'We talked', onPress: () => save('completed') },
      ]);
    });
    return () => subscription.remove();
  }, [onLogged]);

  const call = (target: Target) => {
    pending.current = { target, startedAt: Date.now(), via: 'phone' };
    Linking.openURL(`tel:${target.phone}`);
  };

  const whatsapp = (target: Target, url: string) => {
    pending.current = { target, startedAt: Date.now(), via: 'whatsapp' };
    Linking.openURL(url);
  };

  return { call, whatsapp };
}
