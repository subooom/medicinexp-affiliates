// app/(app)/distributions/index.tsx — drop-offs: materials the MR left at pharmacies
import { materialApi } from '@/api/materials';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Dropoff } from '@/types/models';
import { toIconName } from '@/utils/icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DropoffsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [dropoffs, setDropoffs] = useState<Dropoff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageToLoad: number) => {
    try {
      const response = await materialApi.getDropoffs({ page: pageToLoad, per_page: 30 });
      const result = response.data.data;
      setDropoffs((prev) => (pageToLoad === 1 ? result.data : [...prev, ...result.data]));
      setPage(result.current_page);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (error) {
      console.error('Error loading drop-offs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>Drop-offs</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={dropoffs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={colors.primary} />}
          onEndReached={() => {
            if (loadingMore || page >= lastPage) return;
            setLoadingMore(true);
            load(page + 1);
          }}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            total > 0 ? (
              <Text style={[typography.caption, { color: colors.mutedForeground, marginBottom: 8 }]}>
                {total} drop-off{total > 1 ? 's' : ''}. Record new ones when you check in.
              </Text>
            ) : null
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          renderItem={({ item }) => {
            const typeColor = item.material?.type?.color || colors.primary;
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                disabled={!item.visit_id}
                onPress={() => item.visit_id && router.push({ pathname: '/(app)/visits/[id]', params: { id: item.visit_id } })}
              >
                <View style={[styles.icon, { backgroundColor: typeColor + '15' }]}>
                  <Ionicons name={toIconName(item.material?.type?.icon, 'cube-outline')} size={20} color={typeColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]} numberOfLines={1}>
                    {item.quantity} × {item.material?.name ?? 'Material'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.venue?.name ?? 'Unknown place'} • {new Date(item.occurred_at).toLocaleDateString()}
                  </Text>
                </View>
                {item.visit_id && <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={colors.mutedForeground} />
              <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>
                Nothing dropped off yet. When you check in at a pharmacy you can record the materials you leave there.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    list: { padding: 16, paddingBottom: 60, flexGrow: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', gap: 8, paddingVertical: 60, paddingHorizontal: 24 },
  });
