// app/(app)/pickups/index.tsx — the MR's requests for materials
import { pickupApi } from '@/api/pickups';
import { Badge, Button, Card, EmptyState, ScreenHeader, formatDateTime } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Pickup } from '@/types/models';
import { pickupStatus } from '@/utils/pickups';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

export default function PickupsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await pickupApi.getAll({ page: 1, per_page: 20 });
      setPickups(response.data.data.data);
    } catch {
      // Keep what is shown
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Materials pickup" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <Button title="Ask for materials" icon="add-circle-outline" onPress={() => router.push('/pickups/new')} style={{ marginBottom: 6 }} />
          }
          ListEmptyComponent={
            <EmptyState icon="cube-outline" title="No requests yet" message="Running low on brochures or samples? Ask your program and pick them up at a hub." />
          }
          renderItem={({ item }) => {
            const status = pickupStatus[item.status];
            return (
              <Card onPress={() => router.push({ pathname: '/pickups/[id]', params: { id: item.id } })} style={{ gap: 6 }}>
                <View style={styles.row}>
                  <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
                    {item.items.map((i) => `${i.quantity_approved ?? i.quantity_requested} × ${i.material_name}`).join(', ')}
                  </Text>
                </View>
                <Badge label={status.label} tone={status.tone} />
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {item.status === 'approved' && item.pickup_at
                    ? `${formatDateTime(item.pickup_at)} · ${item.hub?.name ?? ''}`
                    : `Asked ${formatDateTime(item.created_at)}`}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
