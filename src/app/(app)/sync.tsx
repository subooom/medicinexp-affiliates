// app/(app)/sync.tsx — what's saved on the phone and waiting to be sent
import { Badge, Button, Card, EmptyState, ScreenHeader } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { outbox } from '@/offline/outbox';
import { sync } from '@/offline/sync';
import { useSyncState } from '@/offline/sync-provider';
import { typography } from '@/styles/typography';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

export default function SyncScreen() {
  const { colors } = useAppTheme();
  const { items, online, failed } = useSyncState();
  const [busy, setBusy] = useState(false);

  const sendNow = async () => {
    setBusy(true);
    try {
      if (failed > 0) await outbox.retryAll();
      const result = await sync.run({ forcePrefetch: true });
      if (!online || result?.stoppedOffline) {
        Alert.alert('Still offline', 'Everything stays on your phone and is sent when you have internet.');
      }
    } finally {
      setBusy(false);
    }
  };

  const discard = (id: string, label: string) =>
    Alert.alert('Delete this?', `"${label}" will not be sent to the server.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => outbox.discard(id) },
    ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sync" showSync={false} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 6 }}>
            <Text style={[typography.body2, { color: colors.mutedForeground }]}>
              {online ? 'You are online.' : 'You are offline.'} Work you do without internet is kept on your phone and sent in the order you made it.
            </Text>
            {items.length > 0 && <Button title={failed > 0 ? 'Try again' : 'Send now'} icon="cloud-upload-outline" onPress={sendNow} loading={busy} />}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="checkmark-done-circle-outline" title="All synced" message="Nothing is waiting on this phone." />}
        renderItem={({ item }) => (
          <Card style={{ gap: 6 }}>
            <View style={styles.row}>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{item.label}</Text>
              <Badge label={item.status === 'failed' ? 'Not saved' : 'Waiting'} tone={item.status === 'failed' ? 'danger' : 'warning'} />
            </View>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Made {new Date(item.createdAt).toLocaleString()}
              {item.file ? ' · includes a file' : ''}
            </Text>
            {item.error && <Text style={[typography.body2, { color: colors.destructive }]}>{item.error}</Text>}
            {item.status === 'failed' && (
              <View style={styles.row}>
                <Button title="Retry" variant="outline" onPress={() => outbox.retry(item.id).then(() => outbox.flush())} style={{ flex: 1 }} />
                <Button title="Delete" variant="ghost" onPress={() => discard(item.id, item.label)} style={{ flex: 1 }} />
              </View>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
