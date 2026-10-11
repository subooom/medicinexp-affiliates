// app/(app)/call-logs/index.tsx
import { callLogApi } from '@/api/call-logs';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog, CallStatus } from '@/types/models';
import { getCallStatusColor } from '@/utils/status-colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Filter = 'upcoming' | 'all' | Exclude<CallStatus, 'scheduled'>;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Done' },
  { key: 'missed', label: 'Missed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function CallLogsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageToLoad: number, nextFilter: Filter) => {
    try {
      const response =
        nextFilter === 'upcoming'
          ? await callLogApi.getScheduled({ page: pageToLoad, per_page: 20 })
          : await callLogApi.getAll({ page: pageToLoad, per_page: 20, status: nextFilter === 'all' ? undefined : nextFilter });
      const result = response.data.data;
      setCallLogs((prev) => (pageToLoad === 1 ? result.data : [...prev, ...result.data]));
      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch (error) {
      console.error('Error loading call logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(1, filter);
    }, [load, filter])
  );

  const loadMore = () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    load(page + 1, filter);
  };

  const confirmDelete = (call: CallLog) => {
    Alert.alert('Delete this call log?', call.notes || undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await callLogApi.delete(call.id);
            setCallLogs((prev) => prev.filter((c) => c.id !== call.id));
          } catch (error: any) {
            Alert.alert('Could not delete', error.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const renderCall = ({ item }: { item: CallLog }) => {
    const statusColor = getCallStatusColor(colors, item.status);
    const who = item.lead?.display_name || item.venue?.name || 'Unknown';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/(app)/call-logs/[id]', params: { id: item.id } })}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={item.direction === 'incoming' ? 'arrow-down-outline' : 'arrow-up-outline'} size={16} color={colors.mutedForeground} />
          <Text style={[typography.body1, styles.name, { color: colors.foreground }]} numberOfLines={1}>{who}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[typography.caption, { color: statusColor, fontWeight: '600', textTransform: 'capitalize' }]}>{item.status}</Text>
          </View>
        </View>
        {item.lead && item.venue && (
          <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>{item.venue.name}</Text>
        )}
        {item.notes ? (
          <Text style={[typography.body2, { color: colors.mutedForeground }]} numberOfLines={2}>{item.notes}</Text>
        ) : null}
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {item.call_date} • {item.call_time.slice(0, 5)}
            {item.duration_minutes ? ` • ${item.duration_minutes} min` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>Calls</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/(app)/call-logs/create')}>
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((option) => {
            const selected = option.key === filter;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}
                onPress={() => setFilter(option.key)}
              >
                <Text style={[typography.caption, { color: selected ? colors.primaryForeground : colors.foreground }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={callLogs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCall}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, filter); }} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListHeaderComponent={
            callLogs.length > 0 ? (
              <Text style={[typography.caption, { color: colors.mutedForeground, marginBottom: 8 }]}>Long-press a call to delete it</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="call-outline" size={40} color={colors.mutedForeground} />
              <Text style={[typography.body1, { color: colors.mutedForeground }]}>
                {filter === 'upcoming' ? 'No calls scheduled' : 'No calls here'}
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
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
    list: { padding: 16, paddingTop: 4, paddingBottom: 80, flexGrow: 1 },
    card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, gap: 6 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, fontWeight: '600' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    empty: { alignItems: 'center', gap: 8, paddingVertical: 60 },
  });
