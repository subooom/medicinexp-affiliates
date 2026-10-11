// app/(app)/commissions/index.tsx
import { commissionApi } from '@/api/commissions';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { formatRupees } from '@/utils/money';
import { Commission } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CommissionsListScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadCommissions();
    loadSummary();
  }, []);

  const loadCommissions = async () => {
    try {
      const response = await commissionApi.getAll();
      setCommissions(response.data.data || []);
    } catch (error: any) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await commissionApi.getSummary();
      setSummary(response.data);
    } catch (error: any) {
      console.error('Error loading summary:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCommissions();
    loadSummary();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success || '#10B981';
      case 'approved': return colors.primary || '#3B82F6';
      case 'pending': return colors.warning || '#F59E0B';
      case 'cancelled': return colors.destructive || '#EF4444';
      default: return colors.mutedForeground || '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>Commissions</Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.caption, styles.summaryLabel, { color: colors.mutedForeground }]}>Total Earned</Text>
            <Text style={[typography.h3, styles.summaryValue, { color: colors.foreground }]}>{formatRupees(summary.this_year)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.caption, styles.summaryLabel, { color: colors.mutedForeground }]}>This Month</Text>
            <Text style={[typography.h3, styles.summaryValue, { color: colors.foreground }]}>{formatRupees(summary.this_month)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.caption, styles.summaryLabel, { color: colors.mutedForeground }]}>Pending</Text>
            <Text style={[typography.h3, styles.summaryValue, styles.pendingValue, { color: colors.warning || '#F59E0B' }]}>
              {formatRupees(summary.pending)}
            </Text>
          </View>
        </View>
      )}

      {/* Commissions List */}
      <FlatList
        data={commissions}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.commissionCard, { backgroundColor: colors.card }]} 
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={[typography.h4, styles.amount, { color: colors.foreground }]}>
                {formatRupees(item.commission_amount)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={[typography.caption, styles.statusText, { color: colors.primaryForeground }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            
            <View style={styles.cardBody}>
              <Text style={[typography.body2, styles.rateText, { color: colors.mutedForeground }]}>
                Rate: {item.commission_rate_used}%
              </Text>
              {item.organization && (
                <Text style={[typography.body2, styles.orgText, { color: colors.primary }]}>
                  {item.organization.name}
                </Text>
              )}
            </View>
            
            <View style={styles.cardFooter}>
              <View style={styles.meta}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                  {new Date(item.earned_date).toLocaleDateString()}
                </Text>
              </View>
              {item.paid_date && (
                <View style={styles.meta}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success || '#10B981'} />
                  <Text style={[typography.caption, styles.metaText, styles.paidText, { color: colors.success || '#10B981' }]}>
                    Paid
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color={colors.mutedForeground} />
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>No commissions yet</Text>
            <Text style={[typography.body2, styles.emptyText, { color: colors.mutedForeground }]}>
              Start generating sales to earn commissions
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
    header: {
      padding: 16,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontWeight: '600',
    },
    summaryContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    summaryLabel: {
      fontWeight: '400',
    },
    summaryValue: {
      fontWeight: '700',
      marginTop: 4,
    },
    pendingValue: {
      fontWeight: '700',
    },
    listContent: {
      padding: 16,
      flexGrow: 1,
    },
    commissionCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    amount: {
      fontWeight: '700',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    cardBody: {
      marginTop: 8,
    },
    rateText: {
      fontWeight: '400',
    },
    orgText: {
      marginTop: 2,
      fontWeight: '500',
    },
    cardFooter: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 16,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontWeight: '400',
    },
    paidText: {
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      marginTop: 12,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 32,
    },
  });