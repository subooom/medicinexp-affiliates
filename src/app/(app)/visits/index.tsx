// app/(app)/visits/index.tsx - Card Grid Layout with Offline Sync
import { AppColors } from '@/constants/colors';
import { useVisits } from '@/hooks/data/use-visits';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Visit, VisitFilters } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function VisitsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  
  // State for filters (optional)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  
  // Use the new hook
  const {
    data: visits,
    loading,
    error,
    refreshing,
    refresh,
    loadMore,
    createVisit,
    updateVisit,
    deleteVisit,
    hasMore,
    syncStatus,
    clearError,
  } = useVisits(statusFilter ? { status: statusFilter } as VisitFilters : undefined);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'planned': return '#6C3CE1';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'planned': return 'time';
      case 'cancelled': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const handleDeleteVisit = (visit: Visit) => {
    Alert.alert(
      'Delete Visit',
      `Are you sure you want to delete this visit for ${visit.organization?.name || 'Unknown'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVisit(visit.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete visit');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (visit: Visit, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Mark this visit as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateVisit(visit.id, { status: newStatus as any });
            } catch (error) {
              Alert.alert('Error', 'Failed to update visit status');
            }
          },
        },
      ]
    );
  };

  const handleCreateVisit = async () => {
    try {
      // Navigate to check-in screen with create callback
      router.push({
        pathname: '/(app)/visits/checkin',
        params: { 
          onCreate: 'true' // You can handle this in the checkin screen
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create visit');
    }
  };

  if (loading && !visits.length) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body2, { color: colors.mutedForeground, marginTop: 16 }]}>
          Loading visits...
        </Text>
      </View>
    );
  }

  if (error && !visits.length) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline" size={48} color={colors.mutedForeground} />
        <Text style={[typography.h4, { color: colors.foreground, marginTop: 16 }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.errorBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            clearError();
            refresh();
          }}
        >
          <Text style={[typography.buttonSmall, { color: colors.primaryForeground }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sync Status Banner */}
      {(syncStatus.isSyncing || syncStatus.queueLength > 0) && (
        <View style={[styles.syncBanner, { backgroundColor: syncStatus.isSyncing ? '#FFF3E0' : '#E3F2FD' }]}>
          <Ionicons 
            name={syncStatus.isSyncing ? 'sync-circle' : 'cloud-upload'} 
            size={20} 
            color={syncStatus.isSyncing ? '#F57C00' : '#1976D2'} 
          />
          <Text style={[styles.syncBannerText, { color: syncStatus.isSyncing ? '#F57C00' : '#1976D2' }]}>
            {syncStatus.isSyncing 
              ? 'Syncing...' 
              : `${syncStatus.queueLength} pending sync${syncStatus.queueLength > 1 ? 's' : ''}`
            }
          </Text>
          {syncStatus.lastSyncTime && !syncStatus.isSyncing && (
            <Text style={[styles.syncTimeText, { color: colors.mutedForeground }]}>
              Last sync: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>
          Visits
        </Text>
        <TouchableOpacity 
          style={[styles.checkInButton, { backgroundColor: colors.primary }]} 
          onPress={handleCreateVisit}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Stats Pills */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[
            styles.statPill, 
            { 
              backgroundColor: !statusFilter ? colors.primary + '20' : colors.primary + '10',
              borderWidth: !statusFilter ? 1 : 0,
              borderColor: !statusFilter ? colors.primary : 'transparent',
            }
          ]}
          onPress={() => setStatusFilter(undefined)}
        >
          <Text style={[styles.statPillNumber, { color: !statusFilter ? colors.primary : colors.mutedForeground }]}>
            {visits.length}
          </Text>
          <Text style={[styles.statPillLabel, { color: !statusFilter ? colors.primary : colors.mutedForeground }]}>
            Total
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.statPill, 
            { 
              backgroundColor: statusFilter === 'completed' ? '#10B98120' : '#10B98110',
              borderWidth: statusFilter === 'completed' ? 1 : 0,
              borderColor: statusFilter === 'completed' ? '#10B981' : 'transparent',
            }
          ]}
          onPress={() => setStatusFilter(statusFilter === 'completed' ? undefined : 'completed')}
        >
          <Text style={[styles.statPillNumber, { color: statusFilter === 'completed' ? '#10B981' : '#10B981' }]}>
            {visits?.filter(v => v.status === 'completed').length}
          </Text>
          <Text style={[styles.statPillLabel, { color: statusFilter === 'completed' ? '#10B981' : colors.mutedForeground }]}>
            Done
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.statPill, 
            { 
              backgroundColor: statusFilter === 'planned' ? '#6C3CE120' : '#6C3CE110',
              borderWidth: statusFilter === 'planned' ? 1 : 0,
              borderColor: statusFilter === 'planned' ? '#6C3CE1' : 'transparent',
            }
          ]}
          onPress={() => setStatusFilter(statusFilter === 'planned' ? undefined : 'planned')}
        >
          <Text style={[styles.statPillNumber, { color: statusFilter === 'planned' ? '#6C3CE1' : '#6C3CE1' }]}>
            {visits?.filter(v => v.status === 'planned').length}
          </Text>
          <Text style={[styles.statPillLabel, { color: statusFilter === 'planned' ? '#6C3CE1' : colors.mutedForeground }]}>
            Planned
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refresh} 
            tintColor={colors.primary} 
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          visits.length === 0 && styles.emptyListContent
        ]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore && visits.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : visits.length > 0 ? (
            <View style={styles.loadMoreContainer}>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                No more visits
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.visitCard, 
              { 
                backgroundColor: colors.card,
                opacity: item.status === 'planned' ? 0.7 : 1,
              }
            ]} 
            onPress={() => router.push(`/(app)/visits/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.cardIcon, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <Ionicons name={getStatusIcon(item.status)} size={20} color={getStatusColor(item.status)} />
              </View>
            </View>
            
            <View style={styles.cardCenter}>
              <View style={styles.cardHeader}>
                <Text style={[typography.body1, styles.orgName, { color: colors.foreground }]}>
                  {item.organization?.name || 'Unknown'}
                </Text>
                {item.status === 'planned' && (
                  <View style={styles.syncBadge}>
                    <Ionicons name="sync" size={12} color="#F57C00" />
                    <Text style={[typography.caption, styles.syncBadgeText]}>Planned</Text>
                  </View>
                )}
                {item.status === 'cancelled' && (
                  <View style={[styles.syncBadge, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="alert-circle" size={12} color="#D32F2F" />
                    <Text style={[typography.caption, styles.syncBadgeTextFailed]}>Failed</Text>
                  </View>
                )}
              </View>
              <Text style={[typography.body2, styles.orgAddress, { color: colors.mutedForeground }]}>
                {item.organization?.address || 'No address'}
              </Text>
              <View style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                  {new Date(item.visit_date).toLocaleDateString()}
                </Text>
                {item.visit_time && (
                  <>
                    <Ionicons name="time-outline" size={12} color={colors.mutedForeground} style={styles.metaSpacer} />
                    <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                      {item.visit_time}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.cardRight}>
              <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              </View>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert(
                    'Visit Options',
                    `What would you like to do with ${item.organization?.name || 'this visit'}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Complete', onPress: () => handleUpdateStatus(item, 'completed') },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteVisit(item) },
                    ]
                  );
                }}
                style={styles.moreButton}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="location" size={40} color={colors.primary} />
            </View>
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>
              No visits {statusFilter ? `(${statusFilter})` : ''}
            </Text>
            <Text style={[typography.body2, styles.emptySub, { color: colors.mutedForeground }]}>
              {statusFilter 
                ? `You don't have any ${statusFilter} visits yet`
                : 'Start by checking in at an organization'
              }
            </Text>
            <TouchableOpacity 
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (statusFilter) {
                  setStatusFilter(undefined);
                } else {
                  router.push('/(app)/visits/checkin');
                }
              }}
            >
              <Text style={[typography.buttonSmall, styles.emptyBtnText, { color: colors.primaryForeground }]}>
                {statusFilter ? 'Show All Visits' : 'Check In'}
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorBtn: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 16,
    },
    
    // Sync Banner
    syncBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    syncBannerText: {
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
    },
    syncTimeText: {
      fontSize: 11,
    },

    // Header
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
    checkInButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Stats Pills
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
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
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

    // List
    listContent: {
      padding: 16,
      paddingBottom: 80,
    },
    emptyListContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    loadMoreContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },

    // Card
    visitCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 12,
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
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
      gap: 2,
    },
    metaText: {
      fontSize: 11,
    },
    metaSpacer: {
      marginLeft: 4,
    },
    cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusPill: {
      padding: 6,
      borderRadius: 12,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    moreButton: {
      padding: 4,
    },
    syncBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF3E0',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 2,
    },
    syncBadgeText: {
      fontSize: 10,
      color: '#F57C00',
      fontWeight: '500',
    },
    syncBadgeTextFailed: {
      fontSize: 10,
      color: '#D32F2F',
      fontWeight: '500',
    },

    // Empty State
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