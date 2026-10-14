// app/(app)/inventory.tsx — what the MR is carrying, and asking for more
import { materialApi } from '@/api/materials';
import { Button, Card, EmptyState, ScreenHeader } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { MaterialWithStock } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

const LOW_STOCK = 5;

export default function InventoryScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setMaterials((await materialApi.getAll({ in_bag: true })).data.data);
    } catch {
      // Keep what's shown
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

  const total = materials.reduce((sum, m) => sum + m.in_bag, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="My stock" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 4 }}>
              <Text style={[typography.body2, { color: colors.mutedForeground }]}>
                {total > 0 ? `You are carrying ${total} items. They go down as you leave them at pharmacies.` : 'Your bag is empty.'}
              </Text>
              <Button title="Ask for more" icon="add-circle-outline" onPress={() => router.push('/pickups/new')} />
              <Button title="My pickup requests" variant="outline" icon="time-outline" onPress={() => router.push('/pickups')} />
            </View>
          }
          ListEmptyComponent={<EmptyState icon="cube-outline" title="Nothing in your bag" message="Ask your program for materials and collect them at a hub." />}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={[styles.image, { backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="cube-outline" size={22} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{item.name}</Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {item.total_dropped_off} handed out so far{item.max_per_venue ? ` · max ${item.max_per_venue} per pharmacy` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.h4, { color: item.in_bag <= LOW_STOCK ? colors.destructive : colors.foreground, fontWeight: '700' }]}>{item.in_bag}</Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.in_bag <= LOW_STOCK ? 'Low' : item.unit ?? 'left'}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 48, height: 48, borderRadius: 10 },
});
