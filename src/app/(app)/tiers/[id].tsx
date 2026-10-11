// app/(app)/tiers/[id].tsx
import { commissionApi } from '@/api/commissions';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Tier } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TierDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTierId, setUserTierId] = useState<number | null>(null);

  useEffect(() => {
    loadTier();
    loadUserTier();
  }, []);

  const loadTier = async () => {
    try {
      const response = await commissionApi.getTierById(parseInt(id));
      setTier(response.data.data);
    } catch (error) {
      console.error('Error loading tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserTier = async () => {
    try {
      const response = await commissionApi.getCurrentTier();
      setUserTierId(response.data.data?.current_tier?.id || null);
    } catch (error) {
      console.error('Error loading user tier:', error);
    }
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

  if (!tier) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>Tier not found</Text>
      </View>
    );
  }

  // Use tier's own color/icon
  const tierColor = tier.color || '#6B7280';
  const tierBadge = tier.icon || '⭐';
  const isUserTier = userTierId === tier.id;
  const metadata = parseMetadata(tier.metadata);
  const benefits = metadata?.benefits || [];
  const requirements = tier.requirements || [];

  // Determine if tier has bonus
  const hasBonus = tier.bonus_amount && tier.bonus_amount > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={[styles.badgeContainer, { backgroundColor: tierColor + '15' }]}>
            <Text style={styles.badgeEmoji}>{tierBadge}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.levelPill, { backgroundColor: tierColor + '15' }]}>
              <Text style={[styles.levelText, { color: tierColor }]}>
                Level {tier.tier_level}
              </Text>
            </View>
            {isUserTier && (
              <View style={[styles.userBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[typography.caption, styles.userBadgeText, { color: colors.primary }]}>
                  Your Tier
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[typography.h3, styles.tierName, { color: colors.foreground }]}>
          {tier.tier_name}
        </Text>

        <Text style={[typography.body2, styles.tierDescription, { color: colors.mutedForeground }]}>
          {tier.description || `Earn ${tier.base_commission_rate}% commission on every sale`}
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: colors.background }]}>
            <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>
              {tier.base_commission_rate}%
            </Text>
            <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>
              Commission
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.background }]}>
            <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>
              {tier.coupon_count}
            </Text>
            <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>
              Coupons
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.background }]}>
            <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>
              {tier.multiplier || 1.0}x
            </Text>
            <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>
              Multiplier
            </Text>
          </View>
          {hasBonus && (
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[typography.h4, styles.statValue, { color: colors.success }]}>
                ₹{tier.bonus_amount}
              </Text>
              <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>
                Bonus
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Requirements Card */}
      {requirements.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
            <Text style={[typography.h5, styles.cardTitle, { color: colors.foreground }]}>
              Requirements
            </Text>
          </View>

          {requirements.map((req: string, index: number) => (
            <View key={index} style={[styles.requirementItem, { borderBottomColor: colors.border }]}>
              <View style={styles.requirementLeft}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.mutedForeground} />
                <Text style={[typography.body2, styles.requirementLabel, { color: colors.mutedForeground }]}>
                  {req}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Benefits Card */}
      {benefits.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="star-outline" size={20} color={colors.primary} />
            <Text style={[typography.h5, styles.cardTitle, { color: colors.foreground }]}>
              Benefits
            </Text>
          </View>

          {benefits.map((benefit: string, index: number) => (
            <View key={index} style={[styles.benefitItem, { borderBottomColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[typography.body2, styles.benefitText, { color: colors.foreground }]}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(app)/tiers')}
      >
        <Ionicons name="arrow-back" size={20} color={colors.primaryForeground} />
        <Text style={[typography.button, styles.backButtonText, { color: colors.primaryForeground }]}>
          Back to Tiers
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCard: {
      margin: 16,
      marginBottom: 8,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badgeContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeEmoji: {
      fontSize: 32,
    },
    headerRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    levelPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    levelText: {
      fontSize: 14,
      fontWeight: '700',
    },
    userBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    userBadgeText: {
      fontWeight: '600',
    },
    tierName: {
      fontWeight: '700',
      marginTop: 12,
    },
    tierDescription: {
      marginTop: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
    },
    statValue: {
      fontWeight: '700',
    },
    statLabel: {
      marginTop: 2,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    cardTitle: {
      fontWeight: '600',
    },
    requirementItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    requirementLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    requirementLabel: {
      fontWeight: '500',
    },
    noRequirements: {
      textAlign: 'center',
      fontStyle: 'italic',
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    benefitText: {
      flex: 1,
    },
    noBenefits: {
      textAlign: 'center',
      fontStyle: 'italic',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginBottom: 24,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    backButtonText: {
      fontWeight: '600',
    },
  });