// src/offline/notifications.ts — push token for server reminders, plus local reminders
// for scheduled calls and lead follow-ups so they still fire with no internet.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { callLogApi } from '@/api/call-logs';
import { fieldApi } from '@/api/field';
import { leadApi } from '@/api/leads';

const SCHEDULED_KEY = 'local-reminders:v1';
// The server pushes call reminders 15 minutes ahead; local ones come a little earlier
// so the two don't show at the same moment
const CALL_LEAD_MS = 17 * 60 * 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const timeLabel = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const notifications = {
  /**
   * Ask for permission and send the Expo push token to the server. Safe on every launch;
   * failures (offline, emulator, Expo Go) are ignored and retried next time.
   */
  async register(): Promise<void> {
    try {
      if (!(await ensurePermission()) || !Device.isDevice) return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if ((await AsyncStorage.getItem('push_token_sent')) === token) return;
      await fieldApi.registerDevice({
        device_token: token,
        device_type: Platform.OS === 'ios' ? 'ios' : 'android',
        app_version: Constants.expoConfig?.version,
      });
      await AsyncStorage.setItem('push_token_sent', token);
    } catch {
      // Next launch
    }
  },

  /** Re-create local reminders from upcoming calls and follow-ups (cached lists when offline). */
  async scheduleLocalReminders(): Promise<void> {
    try {
      if (!(await Notifications.getPermissionsAsync()).granted) return;

      const old: string[] = JSON.parse((await AsyncStorage.getItem(SCHEDULED_KEY)) || '[]');
      await Promise.all(old.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));

      const [calls, leads] = await Promise.all([
        callLogApi.getScheduled({ page: 1, per_page: 20 }).then((r) => r.data.data.data).catch(() => []),
        leadApi.getAll({ open: true, page: 1, per_page: 20 }).then((r) => r.data.data.data).catch(() => []),
      ]);

      const now = Date.now();
      const ids: string[] = [];

      for (const call of calls as any[]) {
        const at = call.scheduled_at
          ? new Date(call.scheduled_at).getTime()
          : new Date(`${call.call_date}T${call.call_time}`).getTime();
        const fireAt = at - CALL_LEAD_MS;
        if (!Number.isFinite(fireAt) || fireAt <= now) continue;
        const who = call.lead?.display_name || call.lead?.contact_name || call.venue?.name || 'your contact';
        ids.push(
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Call coming up', body: `Call ${who} at ${timeLabel(at)}.`, data: { screen: `/call-logs/${call.id}` } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: 'reminders' },
          })
        );
      }

      for (const lead of leads as any[]) {
        if (!lead.next_follow_up_at) continue;
        // 9 AM on the follow-up day
        const day = new Date(lead.next_follow_up_at);
        day.setHours(9, 0, 0, 0);
        if (day.getTime() <= now) continue;
        ids.push(
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Follow up today',
              body: `Time to follow up with ${lead.display_name || lead.contact_name || 'a lead'}.`,
              data: { screen: `/leads/${lead.id}` },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: day.getTime(), channelId: 'reminders' },
          })
        );
      }

      await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(ids));
    } catch {
      // Reminders are a convenience; never break the app over them
    }
  },
};
