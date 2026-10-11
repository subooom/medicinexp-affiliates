// app/(app)/organizations/[id].tsx
import { callLogApi } from '@/api/call-logs';
import { organizationApi } from '@/api/organizations';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog, Distribution, Organization, Visit } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrganizationDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitCount, setVisitCount] = useState(0);
  const [distributionCount, setDistributionCount] = useState(0);
  const [callLogCount, setCallLogCount] = useState(0);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const response = await organizationApi.getById(parseInt(id));
      setOrganization(response.data.data.organization);
      setVisitCount(parseInt(response.data.data.stats.total_visits + '') || 0);
      setDistributionCount(parseInt(response.data.data.stats.total_distributions + '') || 0);
      
      const visitsResponse = await organizationApi.getVisits(parseInt(id));
      setVisits(visitsResponse.data.data.data || []);
      
      const distResponse = await organizationApi.getDistributions(parseInt(id));
      setDistributions(distResponse.data.data.data || []);
      
      const callLogsResponse = await callLogApi.getByOrganization(parseInt(id));
      const callLogsData = callLogsResponse.data.data || [];
      setCallLogs(callLogsData);
      setCallLogCount(callLogsData.length || 0);
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: any) => {
    return type?.color || colors.primary;
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!organization) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>Organization not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={[styles.iconContainer, { backgroundColor: getTypeColor(organization.type) + '15' }]}>
            <Ionicons 
              name={organization.type?.icon || 'business-outline'} 
              size={32} 
              color={getTypeColor(organization.type)} 
            />
          </View>
          <TouchableOpacity
            style={[styles.editButton, { borderColor: colors.border }]}
            onPress={() => router.push({
              pathname: '/(app)/organizations/edit/[id]',
              params: { id: organization.id }
            })}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            <Text style={[typography.caption, styles.editText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={[typography.h3, styles.orgName, { color: colors.foreground }]}>
          {organization.name}
        </Text>

        {organization.type && (
          <View style={[styles.typeBadge, { backgroundColor: organization.type.color + '15' }]}>
            <Text style={[typography.caption, styles.typeText, { color: organization.type.color }]}>
              {organization.type.name}
            </Text>
          </View>
        )}

        <Text style={[typography.body2, styles.orgAddress, { color: colors.mutedForeground }]}>
          {organization.address}
        </Text>
        <Text style={[typography.body2, styles.orgCity, { color: colors.mutedForeground }]}>
          {organization.city}, {organization.state || 'N/A'} {organization.zip_code}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => {
            if (visits.length > 0) {
              router.push({
                pathname: '/(app)/visits',
                params: { organization_id: organization.id }
              });
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>{visitCount}</Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Visits</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => {
            if (distributions.length > 0) {
              router.push({
                pathname: '/(app)/distributions',
                params: { organization_id: organization.id }
              });
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>{distributionCount}</Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Distributions</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => {
            if (callLogs.length > 0) {
              router.push({
                pathname: '/(app)/call-logs',
                params: { organization_id: organization.id }
              });
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>{callLogCount}</Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Call Logs</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>
            {organization.is_active ? '✅' : '❌'}
          </Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Status</Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Contact Information</Text>
        
        {organization.phone && (
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={18} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.contactText, { color: colors.foreground }]}>{organization.phone}</Text>
          </View>
        )}
        
        {organization.email && (
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.contactText, { color: colors.foreground }]}>{organization.email}</Text>
          </View>
        )}
        
        {organization.website && (
          <View style={styles.contactItem}>
            <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.contactText, { color: colors.foreground }]}>{organization.website}</Text>
          </View>
        )}

        {organization.latitude && organization.longitude && (
          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.contactText, { color: colors.mutedForeground }]}>
              {organization.latitude.toFixed(6)}, {organization.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Created</Text>
          <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
            {new Date(organization.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.detailRow, styles.detailRowLast]}>
          <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Last Updated</Text>
          <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
            {new Date(organization.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Recent Visits */}
      {visits.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Recent Visits</Text>
            <TouchableOpacity 
              onPress={() => router.push({
                pathname: '/(app)/visits',
                params: { organization_id: organization.id }
              })}
            >
              <Text style={[typography.caption, styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {visits.slice(0, 3).map((visit) => (
            <TouchableOpacity 
              key={visit.id} 
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push({
                pathname: '/(app)/visits/[id]',
                params: { id: visit.id }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.listItemLeft}>
                <View style={[styles.listItemIcon, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={[typography.body2, styles.listItemTitle, { color: colors.foreground }]}>
                    {visit.organization?.name || 'Unknown'}
                  </Text>
                  <Text style={[typography.caption, styles.listItemSubtext, { color: colors.mutedForeground }]}>
                    {new Date(visit.visit_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) + '15' }]}>
                <Text style={[typography.caption, styles.statusText, { color: getStatusColor(visit.status) }]}>
                  {getStatusLabel(visit.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Distributions */}
      {distributions.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Recent Distributions</Text>
            <TouchableOpacity 
              onPress={() => router.push({
                pathname: '/(app)/distributions',
                params: { organization_id: organization.id }
              })}
            >
              <Text style={[typography.caption, styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {distributions.slice(0, 3).map((dist) => (
            <TouchableOpacity 
              key={dist.id} 
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push({
                pathname: '/(app)/distributions/[id]',
                params: { id: dist.id }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.listItemLeft}>
                <View style={[styles.listItemIcon, { backgroundColor: colors.accent + '10' }]}>
                  <Ionicons name="cube-outline" size={16} color={colors.accent} />
                </View>
                <View>
                  <Text style={[typography.body2, styles.listItemTitle, { color: colors.foreground }]}>
                    {dist.material?.name || 'Unknown Material'}
                  </Text>
                  <Text style={[typography.caption, styles.listItemSubtext, { color: colors.mutedForeground }]}>
                    Qty: {dist.quantity} • {new Date(dist.distribution_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Call Logs */}
      {callLogs.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Recent Call Logs</Text>
            <TouchableOpacity 
              onPress={() => router.push({
                pathname: '/(app)/call-logs',
                params: { organization_id: organization.id }
              })}
            >
              <Text style={[typography.caption, styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {callLogs.slice(0, 3).map((callLog) => (
            <TouchableOpacity 
              key={callLog.id} 
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push({
                pathname: '/(app)/call-logs/[id]',
                params: { id: callLog.id }
              })}
              activeOpacity={0.7}
            >
              <View style={styles.listItemLeft}>
                <View style={[styles.listItemIcon, { backgroundColor: colors.success + '10' }]}>
                  <Ionicons name="call-outline" size={16} color={colors.success} />
                </View>
                <View>
                  <Text style={[typography.body2, styles.listItemTitle, { color: colors.foreground }]}>
                    {callLog.notes || 'Call logged'}
                  </Text>
                  <Text style={[typography.caption, styles.listItemSubtext, { color: colors.mutedForeground }]}>
                    {new Date(callLog.call_date).toLocaleDateString()} • {callLog.call_time}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(callLog.status) + '15' }]}>
                <Text style={[typography.caption, styles.statusText, { color: getStatusColor(callLog.status) }]}>
                  {getStatusLabel(callLog.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push({
            pathname: '/(app)/visits/checkin',
            params: { organization_id: organization.id }
          })}
          activeOpacity={0.7}
        >
          <Ionicons name="location" size={20} color={colors.primaryForeground} />
          <Text style={[typography.button, styles.actionText, { color: colors.primaryForeground }]}>
            Check In
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => router.push({
            pathname: '/(app)/call-logs/create',
            params: { organization_id: organization.id }
          })}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={20} color={colors.primary} />
          <Text style={[typography.button, styles.secondaryActionText, { color: colors.primary }]}>
            Log Call
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    // ... styles remain the same ...
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
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      gap: 4,
    },
    editText: {
      fontWeight: '500',
    },
    orgName: {
      fontWeight: '700',
      marginTop: 12,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      marginTop: 4,
    },
    typeText: {
      fontWeight: '500',
    },
    orgAddress: {
      marginTop: 8,
    },
    orgCity: {
      marginTop: 2,
    },
    statsGrid: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontWeight: '700',
    },
    statLabel: {
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontWeight: '600',
    },
    viewAllText: {
      fontWeight: '500',
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      gap: 10,
    },
    contactText: {
      flex: 1,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontWeight: '400',
    },
    detailValue: {
      fontWeight: '500',
    },
    listItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    listItemIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listItemTitle: {
      fontWeight: '500',
    },
    listItemSubtext: {
      fontSize: 11,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    statusText: {
      fontSize: 9,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    actionsContainer: {
      paddingHorizontal: 16,
      marginBottom: 24,
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    secondaryButton: {
      borderWidth: 1,
    },
    actionText: {
      fontWeight: '600',
    },
    secondaryActionText: {
      fontWeight: '600',
    },
  });