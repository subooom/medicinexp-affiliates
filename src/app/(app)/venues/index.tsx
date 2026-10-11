// app/(app)/venues/index.tsx
import { venueApi, VenueFilters } from '@/api/venues';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Venue, VenueType } from '@/types/models';
import { toIconName } from '@/utils/icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VenuesListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [types, setTypes] = useState<VenueType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState<number | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (pageToLoad: number, filters: { search: string; typeId: number | null; mineOnly: boolean }) => {
      const params: VenueFilters = { page: pageToLoad, per_page: 20 };
      if (filters.search.length >= 2) params.search = filters.search;
      if (filters.typeId) params.venue_type_id = filters.typeId;
      if (filters.mineOnly) params.mine = true;

      try {
        const response = await venueApi.getAll(params);
        const result = response.data.data;
        setVenues((prev) => (pageToLoad === 1 ? result.data : [...prev, ...result.data]));
        setPage(result.current_page);
        setLastPage(result.last_page);
        setTotal(result.total);
      } catch (error) {
        console.error('Error loading venues:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    venueApi
      .getTypes()
      .then((response) => setTypes(response.data.data))
      .catch((error) => console.error('Error loading venue types:', error));
  }, []);

  // Reload when coming back from create/edit
  useFocusEffect(
    useCallback(() => {
      load(1, { search, typeId, mineOnly });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, typeId, mineOnly])
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (text.length === 0 || text.length >= 2) load(1, { search: text, typeId, mineOnly });
    }, 300);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(1, { search, typeId, mineOnly });
  };

  const loadMore = () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    load(page + 1, { search, typeId, mineOnly });
  };

  const typeColor = (type?: VenueType | null) => type?.color || colors.primary;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>Pharmacies & Clinics</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/venues/create')}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <TextInput
          style={[typography.body1, styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, address, city or phone"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, { borderColor: colors.border }, mineOnly && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setMineOnly(!mineOnly)}
          >
            <Ionicons name="person-outline" size={14} color={mineOnly ? colors.primaryForeground : colors.foreground} />
            <Text style={[typography.caption, { color: mineOnly ? colors.primaryForeground : colors.foreground }]}>Added by me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, { borderColor: colors.border }, typeId === null && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
            onPress={() => setTypeId(null)}
          >
            <Text style={[typography.caption, { color: colors.foreground }]}>All types</Text>
          </TouchableOpacity>
          {types.map((type) => {
            const selected = typeId === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[styles.chip, { borderColor: colors.border }, selected && { backgroundColor: typeColor(type) + '20', borderColor: typeColor(type) }]}
                onPress={() => setTypeId(selected ? null : type.id)}
              >
                <Ionicons name={toIconName(type.icon, 'business-outline')} size={14} color={typeColor(type)} />
                <Text style={[typography.caption, { color: colors.foreground }]}>{type.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={[typography.caption, styles.count, { color: colors.mutedForeground }]}>
        {total} {total === 1 ? 'place' : 'places'}
      </Text>

      <FlatList
        data={venues}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push({ pathname: '/(app)/venues/[id]', params: { id: item.id } })}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIcon, { backgroundColor: typeColor(item.type) + '15' }]}>
              <Ionicons name={toIconName(item.type?.icon, 'business-outline')} size={20} color={typeColor(item.type)} />
            </View>

            <View style={styles.cardCenter}>
              <View style={styles.nameRow}>
                <Text style={[typography.body1, styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.is_customer && (
                  <View style={[styles.customerBadge, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.customerText, { color: '#10B981' }]}>Customer</Text>
                  </View>
                )}
              </View>
              <Text style={[typography.body2, styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                {[item.address, item.city].filter(Boolean).join(', ')}
              </Text>
              {item.type && (
                <Text style={[typography.caption, { color: typeColor(item.type) }]}>{item.type.name}</Text>
              )}
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="business" size={40} color={colors.primary} />
            </View>
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>Nothing found</Text>
            <Text style={[typography.body2, styles.emptySub, { color: colors.mutedForeground }]}>
              Try another search, or add the pharmacy yourself
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/venues/create')}
            >
              <Text style={[typography.buttonSmall, { color: colors.primaryForeground, fontWeight: '600' }]}>Add a pharmacy</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    backButton: { width: 40 },
    headerTitle: { fontWeight: '600' },
    addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    searchInput: { flex: 1, marginLeft: 8 },
    chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    count: { paddingHorizontal: 16 },
    listContent: { padding: 16, paddingBottom: 80, flexGrow: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardCenter: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { fontWeight: '600', fontSize: 15, flexShrink: 1 },
    address: { fontSize: 13 },
    customerBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
    customerText: { fontSize: 10, fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontWeight: '600', marginTop: 4 },
    emptySub: { textAlign: 'center', marginTop: 4, paddingHorizontal: 32 },
    emptyBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 16 },
  });
