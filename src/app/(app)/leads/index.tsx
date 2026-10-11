// app/(app)/leads/index.tsx
import { leadApi } from '@/api/leads';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { IconName } from '@/utils/icons';
import { Lead } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type LeadType = 'customer' | 'associate' | 'organization' | 'contact';

const getLeadTypeIcon = (type: LeadType): IconName => {
  switch (type) {
    case 'customer': return 'person-outline';
    case 'associate': return 'people-outline';
    case 'organization': return 'business-outline';
    case 'contact': return 'call-outline';
    default: return 'person-outline';
  }
};

const getLeadTypeLabel = (type: LeadType): string => {
  switch (type) {
    case 'customer': return 'Customer';
    case 'associate': return 'Associate';
    case 'organization': return 'Organization';
    case 'contact': return 'Contact';
    default: return 'Customer';
  }
};

const getLeadTypeColor = (type: LeadType, colors: AppColors): string => {
  switch (type) {
    case 'customer': return colors.primary || '#2563EB';
    case 'associate': return colors.accent || '#8B5CF6';
    case 'organization': return colors.success || '#10B981';
    case 'contact': return colors.warning || '#F59E0B';
    default: return colors.mutedForeground || '#6B7280';
  }
};

// Helper function to format time ago
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export default function LeadsListScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const response = await leadApi.getAll();
      setLeads(response.data.data.data || []); // paginated
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return colors.success || '#10B981';
      case 'qualified': return colors.primary || '#3B82F6';
      case 'contacted': return colors.warning || '#F59E0B';
      case 'new': return '#8B5CF6';
      case 'lost': return colors.destructive || '#EF4444';
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
        <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>Leads</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]} 
          onPress={() => router.push('/(app)/leads/create')}
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
          />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const leadType = item.lead_type as LeadType || 'customer';
          const typeColor = getLeadTypeColor(leadType, colors);
          
          // Grab the most recent call log if available
          const latestCallLog = item.call_logs && item.call_logs.length > 0 ? item.call_logs[0] : null;
          
          return (
            <TouchableOpacity 
              style={[styles.leadCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
              onPress={() => router.push({
                pathname: '/(app)/leads/[id]',
                params: { id: item.id }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.leadHeader}>
                <View style={styles.leadNameContainer}>
                  <View style={[styles.leadTypeIcon, { backgroundColor: typeColor + '15' }]}>
                    <Ionicons 
                      name={getLeadTypeIcon(leadType)} 
                      size={14} 
                      color={typeColor} 
                    />
                  </View>
                  <Text style={[typography.body1, styles.customerName, { color: colors.foreground }]}>
                    {item.customer_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={[typography.caption, styles.statusText, { color: colors.primaryForeground }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              
              <Text style={[typography.body2, styles.customerEmail, { color: colors.mutedForeground }]}>
                {item.customer_email}
              </Text>
              
              {/* Lead Type Label */}
              <View style={styles.leadTypeContainer}>
                <View style={[styles.leadTypeBadge, { backgroundColor: typeColor + '10' }]}>
                  <Ionicons 
                    name={getLeadTypeIcon(leadType)} 
                    size={12} 
                    color={typeColor} 
                  />
                  <Text style={[typography.caption, styles.leadTypeText, { color: typeColor }]}>
                    {getLeadTypeLabel(leadType)}
                  </Text>
                </View>
                {item.organization && (
                  <Text style={[typography.caption, styles.organizationName, { color: colors.mutedForeground }]}>
                    • {item.organization.name}
                  </Text>
                )}
              </View>

              {/* Latest Call Log Snippet */}
              {latestCallLog ? (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: '/(app)/call-logs/[id]',
                      params: { id: latestCallLog.id.toString() }
                    });
                  }} 
                  style={[styles.callLogCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={styles.callLogHeader}>
                    <View style={styles.callLogMeta}>
                      <Ionicons 
                        name={latestCallLog.direction === 'incoming' ? 'call-sharp' : 'call-outline'} 
                        size={12} 
                        color={latestCallLog.direction === 'incoming' ? '#22C55E' : '#3B82F6'} 
                      />
                      <Text style={[typography.caption, styles.callLogTitle, { color: colors.foreground }]}>
                        {latestCallLog.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.mutedForeground, fontSize: 10 }]}>
                        • {getTimeAgo(latestCallLog.created_at || latestCallLog.call_date)}
                      </Text>
                    </View>
                    <View style={[styles.miniStatusBadge, { 
                      backgroundColor: latestCallLog.status === 'completed' ? '#22C55E20' : 
                                       latestCallLog.status === 'scheduled' ? '#F59E0B20' : 
                                       latestCallLog.status === 'missed' ? '#EF444420' : '#6B728020'
                    }]}>
                      <Text style={[typography.caption, styles.miniStatusText, { 
                        color: latestCallLog.status === 'completed' ? '#22C55E' : 
                               latestCallLog.status === 'scheduled' ? '#F59E0B' : 
                               latestCallLog.status === 'missed' ? '#EF4444' : '#6B7280' 
                      }]}>
                        {latestCallLog.status}
                      </Text>
                    </View>
                  </View>

                  {/* Notes snippet */}
                  {latestCallLog.notes ? (
                    <Text 
                      style={[typography.caption, styles.callLogNotes, { color: colors.mutedForeground }]} 
                      numberOfLines={1}
                    >
                      {latestCallLog.notes}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ) : (
                <View style={[styles.callLogCardEmpty, { borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={11} color={colors.mutedForeground} />
                  <Text style={[typography.caption, { color: colors.mutedForeground, fontStyle: 'italic', fontSize: 11 }]}>
                    No call logs recorded yet
                  </Text>
                </View>
              )}
              
              <View style={styles.leadFooter}>
                <View style={styles.leadMeta}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[typography.caption, styles.metaText, { color: colors.mutedForeground }]}>
                    Created {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {item.status === 'converted' && item.converted_at && (
                  <View style={styles.leadMeta}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[typography.caption, styles.metaText, styles.convertedText, { color: colors.success }]}>
                      Converted
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
            <Text style={[typography.h4, styles.emptyTitle, { color: colors.foreground }]}>No leads yet</Text>
            <Text style={[typography.body2, styles.emptyText, { color: colors.mutedForeground }]}>
              Start generating leads by creating your first lead
            </Text>
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: colors.primary }]} 
              onPress={() => router.push('/(app)/leads/create')}
            >
              <Text style={[typography.buttonSmall, styles.emptyButtonText, { color: colors.primaryForeground }]}>
                Create Lead
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
    listContent: {
      padding: 16,
      flexGrow: 1,
    },
    leadCard: {
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    leadHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leadNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    leadTypeIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    customerName: {
      fontWeight: '600',
      flex: 1,
    },
    customerEmail: {
      marginTop: 2,
      marginLeft: 32,
    },
    leadTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      marginLeft: 32,
      gap: 6,
    },
    leadTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      gap: 4,
    },
    leadTypeText: {
      fontWeight: '500',
    },
    organizationName: {
      fontWeight: '400',
    },
    callLogCard: {
      marginTop: 10,
      marginLeft: 32,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      gap: 4,
    },
    callLogCardEmpty: {
      marginTop: 10,
      marginLeft: 32,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    callLogHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    callLogMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    callLogTitle: {
      fontWeight: '600',
      fontSize: 11,
    },
    callLogNotes: {
      fontSize: 11,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    miniStatusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
    },
    miniStatusText: {
      fontSize: 9,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    leadFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      marginLeft: 32,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: 'rgba(150, 150, 150, 0.15)',
    },
    leadMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontWeight: '400',
    },
    convertedText: {
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