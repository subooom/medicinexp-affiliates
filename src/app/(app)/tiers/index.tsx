// app/(app)/tiers/index.tsx
import { commissionApi } from '@/api/commissions';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Tier } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TiersListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [userTier, setUserTier] = useState<Tier | null>(null);

  useEffect(() => {
    loadTiers();
    loadUserTier();
  }, []);

  const loadTiers = async () => {
    try {
      const response = await commissionApi.getCommissionTiers();
      setTiers(response.data.data || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserTier = async () => {
    try {
      const response = await commissionApi.getCurrentTier();
      setUserTier(response.data.data?.current_tier || null);
    } catch (error) {
      console.error('Error loading user tier:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTiers();
  };

  // Get unique tier levels from data
  const tierLevels = [...new Set(tiers.map(t => t.tier_level))].sort((a, b) => a - b);

  const filteredTiers = selectedLevel
    ? tiers.filter(t => t.tier_level === selectedLevel)
    : tiers;

  const isUserTier = (tierId: number) => {
    return userTier?.id === tierId;
  };

  // Helper: Parse metadata
  const parseMetadata = (metadata: any) => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try { return JSON.parse(metadata); } 
      catch { return {}; }
    }
    return metadata;
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
      {/* Filter Pills */}
      {tierLevels.length > 1 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              !selectedLevel && styles.filterPillActive,
            ]}
            onPress={() => setSelectedLevel(null)}
          >
            <Text style={[
              styles.filterText,
              !selectedLevel && styles.filterTextActive,
            ]}>
              All
            </Text>
          </TouchableOpacity>
          {tierLevels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterPill,
                selectedLevel === level && styles.filterPillActive,
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <Text style={[
                styles.filterText,
                selectedLevel === level && styles.filterTextActive,
              ]}>
                Lv.{level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stats Pills */}
      <View style={styles.statsContainer}>
        <View style={[styles.statPill, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.statPillNumber, { color: colors.primary }]}>{tiers.length}</Text>
          <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#10B98110' }]}>
          <Text style={[styles.statPillNumber, { color: '#10B981' }]}>
            {tiers.filter(t => t.is_active).length}
          </Text>
          <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        {userTier && (
          <View style={[styles.statPill, { backgroundColor: (userTier.color || '#6B7280') + '15' }]}>
            <Text style={[styles.statPillNumber, { color: userTier.color || '#6B7280' }]}>
              {userTier.tier_level}
            </Text>
            <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Your Level</Text>
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredTiers}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const tierColor = item.color || '#6B7280';
          const isActive = item.is_active;
          const isCurrentUserTier = isUserTier(item.id);
          const metadata = parseMetadata(item.metadata);
          const benefits = metadata?.benefits || [];
          const icon = item.icon || '⭐';
          
          return (
            <TouchableOpacity 
              style={[
                styles.tierCard, 
                { backgroundColor: colors.card },
                isCurrentUserTier && styles.userTierCard,
              ]} 
              onPress={() => router.push({
                  pathname: '/tiers/[id]',
                  params: { id: item.id }
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.cardIcon, { backgroundColor: tierColor + '15' }]}>
                  <Text style={styles.cardBadge}>{icon}</Text>
                </View>
              </View>
              
              <View style={styles.cardCenter}>
                <View style={styles.cardHeader}>
                  <Text style={[typography.body1, styles.tierName, { color: colors.foreground }]}>
                    {item.tier_name}
                  </Text>
                  {isCurrentUserTier && (
                    <View style={[styles.userBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[typography.caption, styles.userBadgeText, { color: colors.primary }]}>
                        Current
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={[typography.body2, styles.tierDesc, { color: colors.mutedForeground }]}>
                  {item.description || `${item.base_commission_rate}% commission`}
                </Text>
                
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                      {item.base_commission_rate}%
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="pricetag-outline" size={12} color={colors.mutedForeground} />
                    <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                      {item.coupon_count} coupons
                    </Text>
                  </View>
                  {item.min_sales !== null && item.min_sales !== undefined && (
                    <View style={styles.metaItem}>
                      <Ionicons name="trending-up-outline" size={12} color={colors.mutedForeground} />
                      <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                        {item.min_sales}+ sales
                      </Text>
                    </View>
                  )}
                  {item.multiplier !== null && item.multiplier !== undefined && item.multiplier > 1 && (
                    <View style={styles.metaItem}>
                      <Ionicons name="rocket-outline" size={12} color={colors.mutedForeground} />
                      <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                        {item.multiplier}x
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.cardRight}>
                <View style={[styles.levelPill, { backgroundColor: tierColor + '15' }]}>
                  <Text style={[styles.levelText, { color: tierColor }]}>
                    Lv.{item.tier_level}
                  </Text>
                </View>
                {!isActive && (
                  <View style={[styles.inactiveBadge, { backgroundColor: '#EF444415' }]}>
                    <Text style={[typography.caption, styles.inactiveText, { color: '#EF4444' }]}>
                      Inactive
                    </Text>
                  </View>
                )}
                {item.is_default && (
                  <View style={[styles.defaultBadge, { backgroundColor: '#F59E0B15' }]}>
                    <Text style={[typography.caption, styles.defaultText, { color: '#F59E0B' }]}>
                      Default
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="trophy" size={40} color={colors.primary} />
            </View>
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>No tiers</Text>
            <Text style={[typography.body2, styles.emptySub, { color: colors.mutedForeground }]}>
              Commission tiers will appear here
            </Text>
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
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexWrap: 'wrap',
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
    },
    filterText: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    filterTextActive: {
      color: colors.primaryForeground,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 8,
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
    listContent: {
      padding: 16,
      paddingBottom: 80,
      flexGrow: 1,
    },
    tierCard: {
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
    userTierCard: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    cardLeft: {
      marginRight: 12,
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBadge: {
      fontSize: 24,
    },
    cardCenter: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tierName: {
      fontWeight: '600',
      fontSize: 15,
    },
    userBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    userBadgeText: {
      fontWeight: '600',
    },
    tierDesc: {
      fontSize: 13,
      marginTop: 1,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 8,
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      fontSize: 10,
    },
    cardRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    levelPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    levelText: {
      fontSize: 12,
      fontWeight: '700',
    },
    inactiveBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    inactiveText: {
      fontSize: 9,
      fontWeight: '600',
    },
    defaultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    defaultText: {
      fontSize: 9,
      fontWeight: '600',
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
  });