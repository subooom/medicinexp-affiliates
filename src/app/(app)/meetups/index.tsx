// app/(app)/meetups/index.tsx — meetups with the program, and asking for one
import { meetupApi } from '@/api/meetups';
import { Badge, Button, Card, EmptyState, ScreenHeader, formatDateTime } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Meetup } from '@/types/models';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MeetupsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (nextScope: 'upcoming' | 'past') => {
    try {
      const response = await meetupApi.getAll({ scope: nextScope, page: 1, per_page: 20 });
      setMeetups(response.data.data.data);
    } catch {
      setMeetups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope])
  );

  const tab = (value: 'upcoming' | 'past', label: string) => (
    <TouchableOpacity
      onPress={() => { setScope(value); setLoading(true); }}
      style={[styles.tab, { backgroundColor: scope === value ? colors.primary : colors.card, borderColor: scope === value ? colors.primary : colors.border }]}
    >
      <Text style={[typography.body2, { color: scope === value ? colors.primaryForeground : colors.foreground, fontWeight: '600' }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Meetups" />
      <FlatList
        data={loading ? [] : meetups}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(scope); }} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Button title="Ask for a meetup" icon="chatbubbles-outline" variant="outline" onPress={() => router.push('/meetups/new')} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {tab('upcoming', 'Upcoming')}
              {tab('past', 'Past')}
            </View>
            {loading && <ActivityIndicator color={colors.primary} />}
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState icon="calendar-outline" title="No meetups" message="Training, reviews and catch-ups your program schedules show up here." />}
        renderItem={({ item }) => (
          <Card onPress={() => router.push({ pathname: '/meetups/[id]', params: { id: item.id } })} style={{ gap: 6 }}>
            <View style={styles.row}>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{item.title}</Text>
              {item.status === 'requested' ? (
                <Badge label="Asked" tone="warning" />
              ) : item.status === 'cancelled' ? (
                <Badge label="Cancelled" tone="danger" />
              ) : item.my_response === 'pending' && item.status === 'scheduled' ? (
                <Badge label="Reply" tone="info" />
              ) : null}
            </View>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              {item.starts_at ? formatDateTime(item.starts_at) : 'Time to be set'}
              {item.location_name ? ` · ${item.location_name}` : ''}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
});
