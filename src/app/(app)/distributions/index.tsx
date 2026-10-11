// app/(app)/distributions/index.tsx
import { distributionApi } from '@/api/distributions';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Distribution } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DistributionsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ organization_id?: string }>();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    loadDistributions();
  }, [params.organization_id]);

  const loadDistributions = async () => {
    try {
      const requestParams: any = {};
      if (params.organization_id) {
        requestParams.organization_id = parseInt(params.organization_id);
      }
      const response = await distributionApi.getAll(requestParams);
      setDistributions(response.data.data.data || []);
      
      if (response.data.data?.length > 0) {
        setOrganizationName(response.data.data[0].organization?.name || '');
      }
    } catch (error) {
      console.error('Error loading distributions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDistributions();
  };

  const totalQuantity = distributions.reduce((sum, d) => sum + d.quantity, 0);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>
          {organizationName || 'Distributions'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statPill, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.statPillNumber, { color: colors.primary }]}>{distributions.length}</Text>
          <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Items</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#10B98110' }]}>
          <Text style={[styles.statPillNumber, { color: '#10B981' }]}>{totalQuantity}</Text>
          <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Total Qty</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={distributions}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.distCard, { backgroundColor: colors.card }]} 
            onPress={() => router.push({
              pathname: '/(app)/distributions/[id]',
              params: { id: item.id }
            })}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              {item.material?.image_url ? (
                <Image 
                  source={{ uri: item.material.image_url }} 
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cardIcon, { backgroundColor: colors.accent + '15' }]}>
                  <Ionicons name="cube-outline" size={20} color={colors.accent} />
                </View>
              )}
            </View>
            
            <View style={styles.cardCenter}>
              <Text style={[typography.body1, styles.materialName, { color: colors.foreground }]}>
                {item.material?.name || 'Unknown Material'}
              </Text>
              <Text style={[typography.body2, styles.orgName, { color: colors.mutedForeground }]}>
                {item.organization?.name || 'Unknown Organization'}
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="cube-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                    Qty: {item.quantity}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                    {new Date(item.distribution_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardRight}>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent + '10' }]}>
              <Ionicons name="cube" size={40} color={colors.accent} />
            </View>
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>No distributions</Text>
            <Text style={[typography.body2, styles.emptySub, { color: colors.mutedForeground }]}>
              {params.organization_id 
                ? 'No materials distributed to this organization yet' 
                : 'Start distributing materials during check-in'}
            </Text>
            {!params.organization_id && (
              <TouchableOpacity 
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(app)/visits/checkin')}
              >
                <Text style={[typography.buttonSmall, styles.emptyBtnText, { color: colors.primaryForeground }]}>
                  Check In & Distribute
                </Text>
              </TouchableOpacity>
            )}
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: 4,
      width: 40,
    },
    headerTitle: {
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
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
    listContent: {
      padding: 16,
      paddingBottom: 80,
      flexGrow: 1,
    },
    distCard: {
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
    cardImage: {
      width: 50,
      height: 50,
      borderRadius: 10,
    },
    cardIcon: {
      width: 50,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCenter: {
      flex: 1,
    },
    materialName: {
      fontWeight: '600',
      fontSize: 15,
    },
    orgName: {
      fontSize: 13,
      marginTop: 1,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 10,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      fontSize: 11,
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