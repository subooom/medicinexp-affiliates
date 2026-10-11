// app/(app)/leads/index.tsx
import { LeadFilters, leadApi } from '@/api/leads';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Lead, LeadStatus } from '@/types/models';
import { leadStatusLabel, leadTypeColor, leadTypeInfo } from '@/utils/lead-types';
import { getLeadStatusColor } from '@/utils/status-colors';
import { getTimeAgo } from '@/utils/time';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Filter = 'open' | 'follow_up' | LeadStatus | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'follow_up', label: 'Follow-ups due' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Interested' },
  { key: 'converted', label: 'Customers' },
  { key: 'lost', label: 'Lost' },
  { key: 'all', label: 'All' },
];

const filterParams = (filter: Filter): LeadFilters => {
  switch (filter) {
    case 'open':
      return { open: true };
    case 'follow_up':
      return { follow_up_due: true };
    case 'all':
      return {};
    default:
      return { status: filter };
  }
};

export default function LeadsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pageToLoad: number, nextFilter: Filter, nextSearch: string) => {
    try {
      const params: LeadFilters = { ...filterParams(nextFilter), page: pageToLoad, per_page: 20 };
      if (nextSearch.length >= 2) params.search = nextSearch;
      const response = await leadApi.getAll(params);
      const result = response.data.data;
      setLeads((prev) => (pageToLoad === 1 ? result.data : [...prev, ...result.data]));
      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(1, filter, search);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, filter])
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (text.length === 0 || text.length >= 2) load(1, filter, text);
    }, 300);
  };

  const loadMore = () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    load(page + 1, filter, search);
  };

  const renderLead = ({ item }: { item: Lead }) => {
    const type = leadTypeInfo(item.lead_type);
    const typeColor = leadTypeColor(item.lead_type, colors);
    const statusColor = getLeadStatusColor(colors, item.status);
    const call = item.latest_call_log;
    const followUpDue = item.next_follow_up_at && new Date(item.next_follow_up_at) <= new Date();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={type.icon} size={16} color={typeColor} />
          </View>
          <Text style={[typography.body1, styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {item.display_name}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[typography.caption, { color: statusColor, fontWeight: '600' }]}>{leadStatusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
          {[type.label, item.venue && item.lead_type !== 'organization' ? item.venue.name : null, item.contact_phone].filter(Boolean).join(' • ')}
        </Text>

        {item.next_follow_up_at && item.status !== 'converted' && item.status !== 'lost' && (
          <View style={styles.metaRow}>
            <Ionicons name="alarm-outline" size={13} color={followUpDue ? colors.warning : colors.mutedForeground} />
            <Text style={[typography.caption, { color: followUpDue ? colors.warning : colors.mutedForeground }]}>
              Follow up {new Date(item.next_follow_up_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {call && (
          <TouchableOpacity
            style={[styles.callSnippet, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/(app)/call-logs/[id]', params: { id: call.id } })}
          >
            <Ionicons name={call.direction === 'incoming' ? 'arrow-down-outline' : 'arrow-up-outline'} size={13} color={colors.mutedForeground} />
            <Text style={[typography.caption, { flex: 1, color: colors.foreground }]} numberOfLines={1}>
              {call.notes || 'Call'}
            </Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>{getTimeAgo(`${call.call_date}T${call.call_time}`)}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>Leads</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/(app)/leads/create')}>
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <TextInput
          style={[typography.body1, { flex: 1, color: colors.foreground }]}
          placeholder="Search name, phone or pharmacy"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={handleSearch}
        />
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
          data={leads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLead}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, filter, search); }} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={colors.mutedForeground} />
              <Text style={[typography.body1, { color: colors.mutedForeground }]}>No leads here</Text>
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
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
    list: { padding: 16, paddingTop: 4, paddingBottom: 80, flexGrow: 1 },
    card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, gap: 6 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, fontWeight: '600' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    callSnippet: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
    empty: { alignItems: 'center', gap: 8, paddingVertical: 60 },
  });
