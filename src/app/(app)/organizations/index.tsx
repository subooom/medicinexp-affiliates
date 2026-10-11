// app/(app)/organizations/index.tsx
import { organizationApi } from '@/api/organizations';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { toIconName } from '@/utils/icons';
import { Organization } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function OrganizationsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async (query?: string) => {
    try {
      const params: any = {};
      if (query) {
        params.search = query;
      }
      const response = await organizationApi.getAll(params);
      setOrganizations(response.data.data?.data || response.data.data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrganizations(searchQuery);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      loadOrganizations(text);
    } else if (text.length === 0) {
      loadOrganizations();
    }
  };

  const getTypeColor = (type: any) => {
    return type?.color || colors.primary;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>My Organizations</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]} 
          onPress={() => router.push('/(app)/organizations/create')}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statPill, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.statPillNumber, { color: colors.primary }]}>{organizations.length}</Text>
          <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#10B98110' }]}>
          <Text style={[styles.statPillNumber, { color: '#10B981' }]}>
            {organizations.filter(o => o.is_active).length}
          </Text>
          <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <TextInput
          style={[typography.body1, styles.searchInput, { color: colors.foreground }]}
          placeholder="Search organizations..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* List */}
      <FlatList
        data={organizations}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.orgCard, { backgroundColor: colors.card }]} 
            onPress={() => router.push({
                    pathname: '/(app)/organizations/[id]',
                    params: { id: item.id }
                })
            }
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.cardIcon, { backgroundColor: getTypeColor(item.type) + '15' }]}>
                <Ionicons 
                  name={toIconName(item.type?.icon, 'business-outline')} 
                  size={20} 
                  color={getTypeColor(item.type)} 
                />
              </View>
            </View>
            
            <View style={styles.cardCenter}>
              <Text style={[typography.body1, styles.orgName, { color: colors.foreground }]}>
                {item.name}
              </Text>
              <Text style={[typography.body2, styles.orgAddress, { color: colors.mutedForeground }]}>
                {item.address}
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                    {item.city}, {item.state || 'N/A'}
                  </Text>
                </View>
                {item.type && (
                  <View style={[styles.typeBadge, { backgroundColor: item.type.color + '15' }]}>
                    <Text style={[typography.caption, styles.typeText, { color: item.type.color }]}>
                      {item.type.name}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.cardRight}>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="business" size={40} color={colors.primary} />
            </View>
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>No organizations</Text>
            <Text style={[typography.body2, styles.emptySub, { color: colors.mutedForeground }]}>
              Create your first organization to get started
            </Text>
            <TouchableOpacity 
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/organizations/create')}
            >
              <Text style={[typography.buttonSmall, styles.emptyBtnText, { color: colors.primaryForeground }]}>
                Create Organization
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontWeight: '600',
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    statPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      gap: 6,
    },
    statPillNumber: {
      fontSize: 16,
      fontWeight: '700',
    },
    statPillLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
    },
    listContent: {
      padding: 16,
      paddingBottom: 80,
      flexGrow: 1,
    },
    orgCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    cardLeft: {
      marginRight: 12,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCenter: {
      flex: 1,
    },
    orgName: {
      fontWeight: '600',
      fontSize: 15,
    },
    orgAddress: {
      fontSize: 13,
      marginTop: 1,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      fontSize: 11,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    typeText: {
      fontSize: 10,
      fontWeight: '500',
    },
    cardRight: {
      marginLeft: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontWeight: '600',
      marginTop: 4,
    },
    emptySub: {
      textAlign: 'center',
      marginTop: 4,
      paddingHorizontal: 32,
    },
    emptyBtn: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 16,
    },
    emptyBtnText: {
      fontWeight: '600',
    },
  });   