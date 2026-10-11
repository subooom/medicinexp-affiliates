// src/components/ui/sync-banner.tsx — "You're offline" / "3 waiting to sync"; tap for details
import { useSyncState } from '@/offline/sync-provider';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/** topInset: used at the very top of a screen with no header, below the status bar */
export function SyncBanner({ topInset = false }: { topInset?: boolean }) {
  const router = useRouter();
  const { online, pending, failed } = useSyncState();

  if (online && pending === 0 && failed === 0) return null;

  let text: string;
  let tone: { bg: string; fg: string };
  if (failed > 0) {
    text = `${failed} could not be saved. Tap to fix.`;
    tone = { bg: '#FEE2E2', fg: '#991B1B' };
  } else if (!online) {
    text = pending > 0 ? `Offline · ${pending} waiting to sync` : 'Offline · showing saved data';
    tone = { bg: '#FEF3C7', fg: '#92400E' };
  } else {
    text = `Sending ${pending}…`;
    tone = { bg: '#E6E0F5', fg: '#452F82' };
  }

  return (
    <TouchableOpacity style={[styles.banner, { backgroundColor: tone.bg }, topInset && { paddingTop: 44 }]} onPress={() => router.push('/sync')} accessibilityRole="button">
      <Ionicons name={failed > 0 ? 'alert-circle' : online ? 'cloud-upload-outline' : 'cloud-offline-outline'} size={16} color={tone.fg} />
      <Text style={[typography.caption, { color: tone.fg, fontWeight: '700', flex: 1 }]}>{text}</Text>
      <Ionicons name="chevron-forward" size={14} color={tone.fg} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});
