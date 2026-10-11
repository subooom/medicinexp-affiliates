// app/(app)/call-logs/[id].tsx
import { callLogApi } from '@/api/call-logs';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CallLogDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [callLog, setCallLog] = useState<CallLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallLog();
  }, []);

  const loadCallLog = async () => {
    try {
      const response = await callLogApi.getById(parseInt(id));
      console.log(response)
      setCallLog(response.data.data);
    } catch (error) {
      console.error('Error loading call log:', error);
      Alert.alert('Error', 'Failed to load call log details');
    } finally {
      setLoading(false);
    }
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
    if(!status) return 'NA'
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Call Log',
      'Are you sure you want to delete this call log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await callLogApi.delete(parseInt(id));
              Alert.alert('Success', 'Call log deleted');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete call log');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!callLog) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>Call log not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(callLog.status) }]} />
            <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>
              {callLog.lead?.customer_name || callLog.organization?.name || 'Unknown'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(callLog.status) + '15' }]}>
            <Text style={[typography.caption, styles.statusText, { color: getStatusColor(callLog.status) }]}>
              {getStatusLabel(callLog.status)}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
              {new Date(callLog.call_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
              {callLog.call_time}
            </Text>
          </View>
          {callLog.duration > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="timer-outline" size={18} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                {callLog.duration} minutes
              </Text>
            </View>
          )}
          {callLog.is_scheduled && callLog.scheduled_at && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[typography.body2, styles.detailText, { color: colors.primary }]}>
                Scheduled: {new Date(callLog.scheduled_at).toLocaleString()}
              </Text>
            </View>
          )}
          {callLog.lead && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                Lead: {callLog.lead.customer_name}
              </Text>
            </View>
          )}
          {callLog.organization && (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={18} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                Organization: {callLog.organization.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Notes Card */}
      {callLog.notes && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
            Notes
          </Text>
          <Text style={[typography.body2, styles.notesText, { color: colors.mutedForeground }]}>
            {callLog.notes}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/call-logs/${callLog.id}/edit`)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.primaryForeground} />
          <Text style={[typography.button, styles.actionButtonText, { color: colors.primaryForeground }]}>
            Edit Call Log
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.destructive }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={colors.primaryForeground} />
          <Text style={[typography.button, styles.actionButtonText, { color: colors.primaryForeground }]}>
            Delete Call Log
          </Text>
        </TouchableOpacity>
      </View>

      {/* Created At */}
      <Text style={[typography.caption, styles.createdAt, { color: colors.mutedForeground }]}>
        Created: {new Date(callLog.created_at).toLocaleString()}
      </Text>
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
    card: {
      borderRadius: 12,
      padding: 16,
      margin: 16,
      marginBottom: 0,
      borderWidth: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    headerTitle: {
      fontWeight: '600',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    details: {
      marginTop: 12,
      gap: 6,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    detailText: {
      fontWeight: '400',
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: 8,
    },
    notesText: {
      lineHeight: 20,
    },
    actionsContainer: {
      padding: 16,
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      gap: 8,
    },
    editButton: {
      backgroundColor: '#2563EB',
    },
    deleteButton: {
      backgroundColor: '#EF4444',
    },
    actionButtonText: {
      fontWeight: '600',
    },
    createdAt: {
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
  });