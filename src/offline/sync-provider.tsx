// src/offline/sync-provider.tsx — starts syncing when the MR is signed in, and opens the
// right screen when a reminder notification is tapped.
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { network } from './network';
import { notifications } from './notifications';
import { OutboxItem, outbox } from './outbox';
import { sync } from './sync';

export function SyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, activeMembership } = useAuth();
  const programId = activeMembership?.program?.id;

  useEffect(() => {
    if (!isAuthenticated || !programId) return;

    sync.run({ forcePrefetch: true }).catch(() => undefined);
    notifications.register();
    sync.registerBackground();

    const offNetwork = network.subscribe((online) => {
      if (online) sync.run().catch(() => undefined);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync.run().catch(() => undefined);
    });
    // Keep trying while something is waiting
    const timer = setInterval(async () => {
      if (network.isOnline() && (await outbox.hasPending())) {
        outbox.flush().catch(() => undefined);
      }
    }, 60 * 1000);

    return () => {
      offNetwork();
      appState.remove();
      clearInterval(timer);
    };
  }, [isAuthenticated, programId]);

  // Tapping a reminder opens the call, lead, pickup or meetup it is about
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (typeof screen === 'string' && screen.startsWith('/')) {
        router.push(screen as any);
      }
    });
    return () => subscription.remove();
  }, [router]);

  return <>{children}</>;
}

/** Outbox items and whether the phone is online, for the sync banner and sync screen. */
export function useSyncState() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [online, setOnline] = useState(network.isOnline());

  useEffect(() => {
    const offOutbox = outbox.subscribe(setItems);
    const offNetwork = network.subscribe(setOnline);
    return () => {
      offOutbox();
      offNetwork();
    };
  }, []);

  return {
    items,
    online,
    pending: items.filter((item) => item.status === 'pending').length,
    failed: items.filter((item) => item.status === 'failed').length,
  };
}
