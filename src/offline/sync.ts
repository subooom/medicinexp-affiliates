// src/offline/sync.ts — sends the outbox and refreshes what the phone keeps for offline
// use. Runs on reconnect, when the app comes to the front, every minute while there is
// something to send, and in the background (expo-background-task, ~every 15 min).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { callLogApi } from '@/api/call-logs';
import { ACTIVE_PROGRAM_KEY } from '@/api/client';
import { dashboardApi } from '@/api/dashboard';
import { earningsApi } from '@/api/earnings';
import { fieldApi } from '@/api/field';
import { leadApi } from '@/api/leads';
import { materialApi } from '@/api/materials';
import { meetupApi } from '@/api/meetups';
import { pickupApi } from '@/api/pickups';
import { tierApi } from '@/api/tiers';
import { venueApi } from '@/api/venues';
import { visitApi } from '@/api/visits';
import { demoVideo } from './demo-video';
import { network } from './network';
import { notifications } from './notifications';
import { outbox } from './outbox';
import { venueIndex } from './venue-index';

export const BACKGROUND_SYNC_TASK = 'medicinexp-offline-sync';
const PREFETCH_EVERY_MS = 30 * 60 * 1000;
const lastPrefetchKey = (programId: string) => `prefetch:last:${programId}`;

/**
 * Fill the response cache with what the main screens ask for, using the exact same
 * parameters, so they open with data when the phone is offline.
 */
async function prefetch(force = false) {
  const programId = await AsyncStorage.getItem(ACTIVE_PROGRAM_KEY);
  const token = await AsyncStorage.getItem('auth_token');
  if (!programId || !token) return;

  const last = Number((await AsyncStorage.getItem(lastPrefetchKey(programId))) || 0);
  if (!force && Date.now() - last < PREFETCH_EVERY_MS) return;

  const quiet = (promise: Promise<unknown>) => promise.catch(() => undefined);
  await Promise.all([
    quiet(dashboardApi.get()),
    quiet(venueApi.getAll({ page: 1, per_page: 20 })),
    quiet(venueApi.getTypes()),
    quiet(visitApi.getAll({ page: 1, per_page: 20 })),
    quiet(leadApi.getAll({ open: true, page: 1, per_page: 20 })),
    quiet(leadApi.getAll({ page: 1, per_page: 20 })),
    quiet(callLogApi.getScheduled({ page: 1, per_page: 20 })),
    quiet(callLogApi.getAll({ page: 1, per_page: 20 })),
    quiet(materialApi.getAll()),
    quiet(materialApi.getAll({ in_bag: true })),
    quiet(earningsApi.getSummary()),
    quiet(earningsApi.getCommissions({ per_page: 50 })),
    quiet(earningsApi.getPayouts({ per_page: 50 })),
    quiet(tierApi.getAll()),
    quiet(tierApi.getCurrent()),
    quiet(fieldApi.getCoupons()),
    quiet(pickupApi.getHubs()),
    quiet(pickupApi.getAll({ page: 1, per_page: 20 })),
    quiet(meetupApi.getAll({ scope: 'upcoming', page: 1, per_page: 20 })),
  ]);

  // Venues for offline search / nearby / check-in
  if (force || (await venueIndex.needsRefresh())) {
    await quiet(
      venueIndex.refresh(async (page, perPage) => {
        const response = await venueApi.getAll({ page, per_page: perPage });
        return response.data.data;
      })
    );
  }

  // Cheat sheet and demo video (downloads on Wi-Fi only)
  await quiet(
    fieldApi.getKit().then((response) => demoVideo.sync(response.data.data))
  );

  await AsyncStorage.setItem(lastPrefetchKey(programId), String(Date.now()));
}

export const sync = {
  /** Send what's waiting, then refresh offline data. */
  async run(options: { forcePrefetch?: boolean } = {}) {
    if (!(await network.refresh())) return;
    const result = await outbox.flush();
    await prefetch(options.forcePrefetch || result.sent > 0);
    await notifications.scheduleLocalReminders();
    return result;
  },

  prefetch,

  async registerBackground() {
    try {
      const status = await BackgroundTask.getStatusAsync();
      if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
      if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK))) {
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, { minimumInterval: 15 });
      }
    } catch {
      // Not available (web, simulator): foreground sync still works
    }
  },
};

// Must be defined at module scope, before the app renders
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    if (await network.refresh()) {
      await outbox.flush();
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
