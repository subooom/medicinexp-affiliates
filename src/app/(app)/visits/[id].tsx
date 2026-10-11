// app/(app)/visits/[id].tsx
import { AppColors } from '@/constants/colors';
import { useVisit } from '@/hooks/data/use-visits';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Visit } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function VisitDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: visit, loading, error, reload, updateVisit, deleteVisit } = useVisit(parseInt(id));

  const [saving, setSaving] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success || '#10B981';
      case 'planned': return colors.primary || '#6C3CE1';
      case 'cancelled': return colors.destructive || '#EF4444';
      default: return colors.mutedForeground || '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'NA';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const changeStatus = (status: Visit['status']) => {
    Alert.alert('Update Status', `Mark this visit as ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          setSaving(true);
          try {
            await updateVisit({ status });
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update visit');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await updateVisit({ notes: notesDraft });
      setShowNotesModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Visit', 'Are you sure you want to delete this visit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVisit();
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete visit');
          }
        },
      },
    ]);
  };

  const header = (
    <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={colors.foreground} />
      </TouchableOpacity>
      <Text style={[typography.h4, styles.topBarTitle, { color: colors.foreground }]}>Visit Details</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.centered}>
          <Text style={[typography.body1, { color: colors.mutedForeground }]}>{error || 'Visit not found'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={reload}>
            <Text style={[typography.button, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(visit.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView>
        {/* Venue */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          disabled={!visit.venue}
          onPress={() => router.push({ pathname: '/(app)/venues/[id]', params: { id: visit.venue_id } })}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>
                {visit.venue?.name || 'Unknown'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[typography.caption, styles.statusText, { color: statusColor }]}>
                {getStatusLabel(visit.status)}
              </Text>
            </View>
          </View>
          {visit.venue && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.detailText, { color: colors.mutedForeground }]}>
                {[visit.venue.address, visit.venue.city].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* When & where */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                {new Date(visit.visited_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </View>
            {visit.checked_out_at && (
              <View style={styles.detailRow}>
                <Ionicons name="log-out-outline" size={18} color={colors.mutedForeground} />
                <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                  Checked out: {new Date(visit.checked_out_at).toLocaleString()}
                </Text>
              </View>
            )}
            {visit.distance_from_venue_m != null && (
              <View style={styles.detailRow}>
                <Ionicons name="walk-outline" size={18} color={colors.mutedForeground} />
                <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                  {visit.distance_from_venue_m} m from the shop at check-in
                </Text>
              </View>
            )}
            {visit.latitude != null && visit.longitude != null && (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={18} color={colors.mutedForeground} />
                <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                  {Number(visit.latitude).toFixed(5)}, {Number(visit.longitude).toFixed(5)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Materials left */}
        {visit.dropoffs && visit.dropoffs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Materials left</Text>
            {visit.dropoffs.map((dropoff) => (
              <View key={dropoff.id} style={styles.detailRow}>
                <Ionicons name="cube-outline" size={18} color={colors.mutedForeground} />
                <Text style={[typography.body2, styles.detailText, { color: colors.foreground }]}>
                  {dropoff.quantity} × {dropoff.material?.name ?? 'Material'}
                  {dropoff.received_by ? ` (received by ${dropoff.received_by})` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
            <TouchableOpacity
              onPress={() => {
                setNotesDraft(visit.notes || '');
                setShowNotesModal(true);
              }}
            >
              <Text style={[typography.caption, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={[typography.body2, styles.notesText, { color: colors.mutedForeground }]}>
            {visit.notes || 'No notes yet'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {visit.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success || '#10B981' }]}
              onPress={() => changeStatus('completed')}
              disabled={saving}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={[typography.button, styles.actionButtonText, { color: '#fff' }]}>Mark Completed</Text>
            </TouchableOpacity>
          )}
          {visit.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineButton, { borderColor: colors.border }]}
              onPress={() => changeStatus('cancelled')}
              disabled={saving}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.foreground} />
              <Text style={[typography.button, styles.actionButtonText, { color: colors.foreground }]}>Cancel Visit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.destructive || '#EF4444' }]}
            onPress={handleDelete}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={[typography.button, styles.actionButtonText, { color: '#fff' }]}>Delete Visit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showNotesModal} transparent animationType="slide" onRequestClose={() => setShowNotesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h5, { color: colors.foreground, marginBottom: 12 }]}>Edit Notes</Text>
            <TextInput
              style={[typography.body2, styles.notesInput, { color: colors.foreground, borderColor: colors.border }]}
              value={notesDraft}
              onChangeText={setNotesDraft}
              multiline
              placeholder="What happened on this visit?"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.outlineButton, styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setShowNotesModal(false)}
              >
                <Text style={[typography.button, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={saveNotes}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[typography.button, { color: colors.primaryForeground }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    backButton: {
      width: 40,
    },
    topBarTitle: {
      fontWeight: '600',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 10,
    },
    card: {
      borderRadius: 12,
      padding: 16,
      margin: 16,
      marginBottom: 0,
      borderWidth: 1,
      gap: 8,
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
    },
    details: {
      gap: 6,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    detailText: {
      fontWeight: '400',
      flexShrink: 1,
    },
    sectionTitle: {
      fontWeight: '600',
    },
    notesText: {
      lineHeight: 20,
    },
    actionsContainer: {
      padding: 16,
      gap: 12,
      marginBottom: 20,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      gap: 8,
    },
    outlineButton: {
      borderWidth: 1,
    },
    actionButtonText: {
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      paddingBottom: 32,
    },
    notesInput: {
      minHeight: 120,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    modalButton: {
      flex: 1,
    },
  });
