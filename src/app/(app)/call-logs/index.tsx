// app/(app)/call-logs/index.tsx
import { callLogApi } from '@/api/call-logs';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FilterType = 'all' | 'completed' | 'scheduled' | 'missed' | 'cancelled';

export default function CallLogsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadCallLogs();
  }, []);

  // Takes the filter explicitly: right after setFilter() the state still holds the old value
  const loadCallLogs = async (status: FilterType = filter) => {
    try {
      const params: any = {};
      if (status !== 'all') {
        params.status = status;
      }
      const response = await callLogApi.getAll(params);
      setCallLogs(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading call logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCallLogs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success || '#10B981';
      case 'scheduled': return colors.primary || '#3B82F6';
      case 'missed': return colors.warning || '#F59E0B';
      case 'cancelled': return colors.destructive || '#EF4444';
      default: return colors.mutedForeground || '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return 'person-outline';
      case 'organization':
        return 'business-outline';
      case 'visit':
        return 'calendar-outline';
      default:
        return 'link-outline';
    }
  };

  const getEntityLabel = (item: CallLog) => {
    if (item.lead) {
      return `Lead: ${item.lead.customer_name}`;
    }
    if (item.organization) {
      return `Organization: ${item.organization.name}`;
    }
    if (item.visit) {
      return `Visit: ${new Date(item.visit.visit_date).toLocaleDateString()}`;
    }
    return null;
  };

  const getEntityType = (item: CallLog) => {
    if (item.lead) return 'lead';
    if (item.organization) return 'organization';
    if (item.visit) return 'visit';
    return null;
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'lead':
        return colors.primary || '#3B82F6';
      case 'organization':
        return colors.success || '#10B981';
      case 'visit':
        return colors.warning || '#F59E0B';
      default:
        return colors.mutedForeground || '#6B7280';
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'missed', label: 'Missed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const renderCallLog = ({ item }: { item: CallLog }) => {
    const entityType = getEntityType(item);
    const entityLabel = getEntityLabel(item);
    const entityIcon = entityType ? getEntityIcon(entityType) : null;
    const entityColor = entityType ? getEntityColor(entityType) : colors.mutedForeground;

    return (
      <TouchableOpacity 
        style={[styles.callLogCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
        onPress={() => router.push(`/call-logs/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.callLogHeader}>
          <View style={styles.callLogLeft}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[typography.body1, styles.callLogName, { color: colors.foreground }]}>
              {item.lead?.customer_name || item.organization?.name || 'Unknown'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[typography.caption, styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Linked Entity */}
        {entityType && entityLabel && (
          <TouchableOpacity 
            style={[styles.entityContainer, { backgroundColor: entityColor + '10', borderColor: entityColor + '30' }]}
            onPress={() => {
              if (entityType === 'lead' && item.lead) {
                router.push(`/leads/${item.lead.id}`);
              } else if (entityType === 'organization' && item.organization) {
                router.push(`/organizations/${item.organization.id}`);
              } else if (entityType === 'visit' && item.visit) {
                router.push(`/visits/${item.visit.id}`);
              }
            }}
          >
            {entityIcon && (
              <Ionicons name={entityIcon as any} size={16} color={entityColor} />
            )}
            <Text style={[typography.caption, styles.entityText, { color: entityColor }]}>
              {entityLabel}
            </Text>
            <Ionicons name="chevron-forward-outline" size={14} color={entityColor} />
          </TouchableOpacity>
        )}

        <Text style={[typography.body2, styles.callLogNotes, { color: colors.mutedForeground }]}>
          {item.notes || 'No notes'}
        </Text>

        <View style={styles.callLogFooter}>
          <View style={styles.callLogMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
              {new Date(item.call_date).toLocaleDateString()}
            </Text>
          </View>
          {item.duration > 0 && (
            <View style={styles.callLogMeta}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                {item.duration} min
              </Text>
            </View>
          )}
          {item.is_scheduled && (
            <View style={styles.callLogMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={[typography.caption, styles.metaText, { color: colors.primary }]}>
                Scheduled
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
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
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>Call Logs</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]} 
          onPress={() => router.push('/(app)/call-logs/create')}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === item.key && styles.filterButtonActive,
              ]}
              onPress={() => {
                setFilter(item.key as FilterType);
                loadCallLogs(item.key as FilterType);
              }}
            >
              <Text
                style={[
                  typography.caption,
                  styles.filterText,
                  filter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* List */}
      <FlatList
        data={callLogs}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
        contentContainerStyle={styles.listContent}
        renderItem={renderCallLog}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={64} color={colors.mutedForeground} />
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>No call logs</Text>
            <Text style={[typography.body2, styles.emptyText, { color: colors.mutedForeground }]}>
              Start logging your calls to keep track of your conversations
            </Text>
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: colors.primary }]} 
              onPress={() => router.push('/(app)/call-logs/create')}
            >
              <Text style={[typography.buttonSmall, styles.emptyButtonText, { color: colors.primaryForeground }]}>
                Log First Call
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
      padding: 16,
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontWeight: '600',
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterContainer: {
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    filtersList: {
      paddingHorizontal: 16,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.mutedForeground,
    },
    filterTextActive: {
      color: colors.primaryForeground,
    },
    listContent: {
      padding: 16,
      flexGrow: 1,
    },
    callLogCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },
    callLogHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    callLogLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    callLogName: {
      fontWeight: '600',
      flex: 1,
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
    entityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 8,
      marginLeft: 24,
      borderWidth: 1,
    },
    entityText: {
      fontWeight: '500',
      flex: 1,
    },
    callLogNotes: {
      marginTop: 8,
      marginLeft: 24,
    },
    callLogFooter: {
      flexDirection: 'row',
      marginTop: 8,
      marginLeft: 24,
      gap: 12,
    },
    callLogMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontWeight: '400',
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
    emptyButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    emptyButtonText: {
      fontWeight: '600',
    },
  });