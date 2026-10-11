// app/(app)/leads/[id].tsx
import { callLogApi } from '@/api/call-logs';
import { leadApi } from '@/api/leads';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { toLocalDateString } from '@/utils/time';
import { CallLog, Lead } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type LeadType = 'customer' | 'associate' | 'organization' | 'contact';

const getLeadTypeIcon = (type: LeadType): string => {
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

export default function LeadDetailsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [saleAmount, setSaleAmount] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Call Logs
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [editingCallLog, setEditingCallLog] = useState<CallLog | null>(null);
  const [callLogForm, setCallLogForm] = useState({
    notes: '',
    call_date: toLocalDateString(new Date()),
    call_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    duration: '',
    status: 'completed' as 'scheduled' | 'completed' | 'missed' | 'cancelled',
    direction: 'outgoing' as 'incoming' | 'outgoing',
  });

  // Edit Note
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editNoteText, setEditNoteText] = useState('');

  useEffect(() => {
    loadLead();
    loadCallLogs();
  }, []);

  const loadLead = async () => {
    try {
      const response = await leadApi.getById(parseInt(id));
      setLead(response.data.data);
      if (response.data.data?.notes) {
        setEditNoteText(response.data.data.notes);
      }
    } catch (error) {
      console.error('Error loading lead:', error);
      Alert.alert('Error', 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const loadCallLogs = async () => {
    try {
      const response = await callLogApi.getByLead(parseInt(id));
      console.log(response)
      setCallLogs(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading call logs:', error);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await leadApi.updateStatus(parseInt(id), status);
      loadLead();
      Alert.alert('Success', `Lead marked as ${status}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleConvert = async () => {
    if (!saleAmount || !tenantId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await leadApi.convert(parseInt(id), {
        amount: parseFloat(saleAmount),
        tenant_id: parseInt(tenantId, 10),
      });
      Alert.alert('Success', 'Lead converted to sale!');
      setShowConvertModal(false);
      setSaleAmount('');
      setTenantId('');
      loadLead();
    } catch (error) {
      Alert.alert('Error', 'Failed to convert lead');
    }
  };

  const handleCreateCallLog = async () => {
    if (!callLogForm.notes) {
      Alert.alert('Error', 'Please add call notes');
      return;
    }

    try {
      if (editingCallLog) {
        await callLogApi.update(editingCallLog.id, {
          ...callLogForm,
          duration: parseInt(callLogForm.duration) || 0,
        });
        Alert.alert('Success', 'Call log updated');
      } else {
        const resp = await callLogApi.create({
          lead_id: parseInt(id),
          notes: callLogForm.notes,
          call_date: callLogForm.call_date,
          call_time: callLogForm.call_time,
          duration: parseInt(callLogForm.duration) || 0,
          status: callLogForm.status,
          direction: callLogForm.direction,
        });

        console.log(resp)
        Alert.alert('Success', 'Call log created');
      }
      setShowCallLogModal(false);
      setEditingCallLog(null);
      setCallLogForm({
        notes: '',
        call_date: toLocalDateString(new Date()),
        call_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        duration: '',
        status: 'completed',
        direction: 'outgoing',
      });
      loadCallLogs();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save call log');
    }
  };

  const handleEditNote = async () => {
    try {
      await leadApi.update(parseInt(id), { notes: editNoteText });
      Alert.alert('Success', 'Note updated');
      setShowEditNoteModal(false);
      loadLead();
    } catch (error) {
      Alert.alert('Error', 'Failed to update note');
    }
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
    if (!status) return 'NA';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success || '#10B981';
      case 'scheduled': return colors.primary || '#3B82F6';
      case 'missed': return colors.warning || '#F59E0B';
      case 'cancelled': return colors.destructive || '#EF4444';
      default: return colors.mutedForeground || '#6B7280';
    }
  };

  const getCallStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'incoming' ? 'call-sharp' : 'call-outline';
  };

  const getDirectionLabel = (direction: string) => {
    return direction === 'incoming' ? 'Incoming' : 'Outgoing';
  };

  const getDirectionColor = (direction: string, colors: AppColors) => {
    return direction === 'incoming' ? colors.primary || '#3B82F6' : colors.accent || '#8B5CF6';
  };

  // Helper functions to set today/now
  const setToday = () => {
    const today = toLocalDateString(new Date());
    setCallLogForm({ ...callLogForm, call_date: today });
  };

  const setNow = () => {
    const now = new Date().toTimeString().split(' ')[0].slice(0, 5);
    setCallLogForm({ ...callLogForm, call_time: now });
  };

  const renderCallLog = ({ item }: { item: CallLog }) => (
    <TouchableOpacity 
      style={[styles.callLogItem, { borderBottomColor: colors.border }]}
      onPress={() => {
        router.push({
          pathname: '/call-logs/[id]',
          params: { id: item.id }
        });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.callLogHeader}>
        <View style={styles.callLogLeft}>
          <View style={[styles.callLogStatusDot, { backgroundColor: getCallStatusColor(item.status) }]} />
          <Ionicons 
            name={getDirectionIcon(item.direction || 'outgoing')} 
            size={14} 
            color={getDirectionColor(item.direction || 'outgoing', colors)} 
          />
          <Text style={[typography.body2, styles.callLogText, { color: colors.foreground }]}>
            {item.notes?.substring(0, 40) || 'No notes'}
          </Text>
        </View><View style={styles.callLogActions}>
          <TouchableOpacity 
            style={styles.callLogEditButton}
            onPress={() => {
              setEditingCallLog(item);
              setCallLogForm({
                notes: item.notes || '',
                call_date: item.call_date || toLocalDateString(new Date()),
                call_time: item.call_time || new Date().toTimeString().split(' ')[0].slice(0, 5),
                duration: item.duration?.toString() || '',
                status: item.status || 'completed',
                direction: item.direction || 'outgoing',
              });
              setShowCallLogModal(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={14} color={colors.primary} />
            <Text style={[typography.caption, styles.callLogEditText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          
        </View>
        <View style={[styles.callLogStatusBadge, { backgroundColor: getCallStatusColor(item.status) + '15' }]}>
          <Text style={[typography.caption, styles.callLogStatusText, { color: getCallStatusColor(item.status) }]}>
            {getCallStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.callLogFooter}>
        <View style={styles.callLogMeta}>
          <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
          <Text style={[typography.caption, styles.callLogMetaText, { color: colors.mutedForeground }]}>
            {new Date(item.call_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.callLogMeta}>
          <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
          <Text style={[typography.caption, styles.callLogMetaText, { color: colors.mutedForeground }]}>
            {item.call_time}
          </Text>
        </View>
        {item.duration > 0 && (
          <View style={styles.callLogMeta}>
            <Ionicons name="hourglass-outline" size={12} color={colors.mutedForeground} />
            <Text style={[typography.caption, styles.callLogMetaText, { color: colors.mutedForeground }]}>
              {item.duration} min
            </Text>
          </View>
        )}
        <View style={styles.callLogMeta}>
          <Text style={[typography.caption, styles.callLogMetaText, { color: getDirectionColor(item.direction || 'outgoing', colors) }]}>
            {getDirectionLabel(item.direction || 'outgoing')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>Lead not found</Text>
      </View>
    );
  }

  const leadType = lead.lead_type as LeadType || 'customer';
  const typeColor = getLeadTypeColor(leadType, colors);
  const typeIcon = getLeadTypeIcon(leadType);
  const typeLabel = getLeadTypeLabel(leadType);

  const fullAddress = lead.customer_address 
    ? lead.customer_address
    : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Customer Info Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.customerHeader}>
          <View style={styles.customerNameContainer}>
            <View style={[styles.typeIconContainer, { backgroundColor: typeColor + '15' }]}>
              <Ionicons name={typeIcon} size={18} color={typeColor} />
            </View>
            <Text style={[typography.h4, styles.customerName, { color: colors.foreground }]}>
              {lead.customer_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
            <Text style={[typography.caption, styles.statusText, { color: colors.primaryForeground }]}>
              {getStatusLabel(lead.status)}
            </Text>
          </View>
        </View>

        <View style={styles.customerDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.customerEmail, { color: colors.mutedForeground }]}>
              {lead.customer_email || 'N/A'}
            </Text>
          </View>

          {lead.customer_phone && (
            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={16} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.customerPhone, { color: colors.mutedForeground }]}>
                {lead.customer_phone}
              </Text>
            </View>
          )}

          {fullAddress && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
              <Text style={[typography.body2, styles.customerAddress, { color: colors.mutedForeground }]}>
                {fullAddress}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.typeAndOrganizationContainer}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '10' }]}>
            <Ionicons name={typeIcon} size={12} color={typeColor} />
            <Text style={[typography.caption, styles.typeBadgeText, { color: typeColor }]}>
              {typeLabel}
            </Text>
          </View>
          {lead.organization && (
            <Text style={[typography.body2, styles.organizationName, { color: colors.primary }]}>
              {lead.organization.name}
            </Text>
          )}
        </View>

        {lead.associated_entity && (
          <View style={styles.associatedEntityContainer}>
            <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.associatedEntityText, { color: colors.mutedForeground }]}>
              {lead.associated_entity}
            </Text>
          </View>
        )}

        {lead.visit && (
          <View style={styles.linkedVisitContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.linkedVisitText, { color: colors.mutedForeground }]}>
              Visit: {lead.visit.organization?.name || 'N/A'} on {new Date(lead.visit.visit_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Notes Card with Edit */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.notesHeader}>
          <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
            Notes
          </Text>
          <TouchableOpacity onPress={() => {
            setEditNoteText(lead.notes || '');
            setShowEditNoteModal(true);
          }} style={styles.editNoteButton}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={[typography.caption, styles.editNoteText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={[typography.body2, styles.notesText, { color: colors.mutedForeground }]}>
          {lead.notes || 'No notes added yet'}
        </Text>
      </View>

      {/* Call Logs Section */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.callLogsHeader}>
          <View style={styles.callLogsHeaderLeft}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
              Call Logs
            </Text>
            <View style={[styles.callLogCount, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[typography.caption, styles.callLogCountText, { color: colors.primary }]}>
                {callLogs.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.addCallLogButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setEditingCallLog(null);
              setCallLogForm({
                notes: '',
                call_date: toLocalDateString(new Date()),
                call_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
                duration: '',
                status: 'completed',
                direction: 'outgoing',
              });
              setShowCallLogModal(true);
            }}
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground} />
            <Text style={[typography.caption, styles.addCallLogText, { color: colors.primaryForeground }]}>
              Add Call
            </Text>
          </TouchableOpacity>
        </View>

        {callLogs.length > 0 ? (
          <FlatList
            data={callLogs}
            renderItem={renderCallLog}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            style={styles.callLogsList}
          />
        ) : (
          <View style={styles.noCallLogsContainer}>
            <Ionicons name="call-outline" size={32} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.noCallLogsText, { color: colors.mutedForeground }]}>
              No call logs yet
            </Text>
            <TouchableOpacity 
              style={[styles.noCallLogsButton, { borderColor: colors.border }]}
              onPress={() => {
                setEditingCallLog(null);
                setCallLogForm({
                  notes: '',
                  call_date: toLocalDateString(new Date()),
                  call_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
                  duration: '',
                  status: 'completed',
                  direction: 'outgoing',
                });
                setShowCallLogModal(true);
              }}
            >
              <Text style={[typography.body2, styles.noCallLogsButtonText, { color: colors.primary }]}>
                Log your first call
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Details Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
          Details
        </Text>
        
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
            Created
          </Text>
          <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
            {new Date(lead.created_at).toLocaleString()}
          </Text>
        </View>
        
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
            Last Updated
          </Text>
          <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
            {new Date(lead.updated_at).toLocaleString()}
          </Text>
        </View>

        {lead.converted_at && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
              Converted
            </Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.success }]}>
              {new Date(lead.converted_at).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
            Type
          </Text>
          <View style={[styles.detailTypeBadge, { backgroundColor: typeColor + '10' }]}>
            <Ionicons name={typeIcon} size={12} color={typeColor} />
            <Text style={[typography.caption, styles.detailTypeText, { color: typeColor }]}>
              {typeLabel}
            </Text>
          </View>
        </View>

        {lead.organization && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
              Organization
            </Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
              {lead.organization.name}
            </Text>
          </View>
        )}

        {lead.associated_entity && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
              Associated Entity
            </Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
              {lead.associated_entity}
            </Text>
          </View>
        )}

        {lead.visit && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>
              Linked Visit
            </Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>
              {lead.visit.organization?.name || 'N/A'} • {new Date(lead.visit.visit_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Convert Button */}
      {lead.status !== 'converted' && lead.status !== 'lost' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.convertButton, { backgroundColor: colors.success || '#10B981' }]} 
            onPress={() => setShowConvertModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={20} color={colors.primaryForeground} />
            <Text style={[typography.button, styles.actionButtonText, { color: colors.primaryForeground }]}>
              Convert to Sale
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Convert Modal */}
      <Modal 
        visible={showConvertModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowConvertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>
                Convert to Sale
              </Text>
              <TouchableOpacity onPress={() => setShowConvertModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[typography.body2, styles.modalLabel, { color: colors.foreground }]}>
                Sale Amount *
              </Text>
              <TextInput 
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} 
                value={saleAmount} 
                onChangeText={setSaleAmount} 
                placeholder="Enter sale amount" 
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric" 
              />

              <Text style={[typography.body2, styles.modalLabel, styles.modalLabelTop, { color: colors.foreground }]}>
                Tenant ID *
              </Text>
              <TextInput 
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} 
                value={tenantId} 
                onChangeText={setTenantId} 
                placeholder="Enter tenant ID" 
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric" 
              />

              <TouchableOpacity 
                style={[styles.modalConvertButton, { backgroundColor: colors.success || '#10B981' }]} 
                onPress={handleConvert}
                activeOpacity={0.7}
              >
                <Ionicons name="cash-outline" size={20} color={colors.primaryForeground} />
                <Text style={[typography.button, styles.modalConvertText, { color: colors.primaryForeground }]}>
                  Confirm Conversion
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => setShowConvertModal(false)}
              >
                <Text style={[typography.body2, styles.modalCancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        visible={showEditNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>
                Edit Note
              </Text>
              <TouchableOpacity onPress={() => setShowEditNoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.editNoteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={editNoteText}
                onChangeText={setEditNoteText}
                placeholder="Enter note..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.modalConvertButton, { backgroundColor: colors.primary }]}
                onPress={handleEditNote}
              >
                <Text style={[typography.button, styles.modalConvertText, { color: colors.primaryForeground }]}>
                  Save Note
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditNoteModal(false)}
              >
                <Text style={[typography.body2, styles.modalCancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Call Log Modal */}
      <Modal
        visible={showCallLogModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCallLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>
                {editingCallLog ? 'Edit Call Log' : 'Log Call'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCallLogModal(false);
                setEditingCallLog(null);
              }}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Direction Selector */}
              <Text style={[typography.body2, styles.modalLabel, { color: colors.foreground }]}>
                Direction *
              </Text>
              <View style={styles.directionOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.directionOption,
                    { borderColor: colors.border },
                    callLogForm.direction === 'outgoing' && { 
                      borderColor: colors.accent || '#8B5CF6', 
                      backgroundColor: (colors.accent || '#8B5CF6') + '10' 
                    },
                  ]}
                  onPress={() => setCallLogForm({ ...callLogForm, direction: 'outgoing' })}
                >
                  <Ionicons name="call-outline" size={18} color={callLogForm.direction === 'outgoing' ? (colors.accent || '#8B5CF6') : colors.mutedForeground} />
                  <Text style={[typography.body2, { color: callLogForm.direction === 'outgoing' ? (colors.accent || '#8B5CF6') : colors.mutedForeground }]}>
                    Outgoing
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.directionOption,
                    { borderColor: colors.border },
                    callLogForm.direction === 'incoming' && { 
                      borderColor: colors.primary || '#3B82F6', 
                      backgroundColor: (colors.primary || '#3B82F6') + '10' 
                    },
                  ]}
                  onPress={() => setCallLogForm({ ...callLogForm, direction: 'incoming' })}
                >
                  <Ionicons name="call-sharp" size={18} color={callLogForm.direction === 'incoming' ? (colors.primary || '#3B82F6') : colors.mutedForeground} />
                  <Text style={[typography.body2, { color: callLogForm.direction === 'incoming' ? (colors.primary || '#3B82F6') : colors.mutedForeground }]}>
                    Incoming
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[typography.body2, styles.modalLabel, styles.modalLabelTop, { color: colors.foreground }]}>
                Call Notes *
              </Text>
              <TextInput
                style={[styles.editNoteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={callLogForm.notes}
                onChangeText={(text) => setCallLogForm({ ...callLogForm, notes: text })}
                placeholder="What was discussed?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[typography.body2, styles.modalLabel, styles.modalLabelTop, { color: colors.foreground }]}>
                Date
              </Text>
              <View style={styles.dateInputRow}>
                <TextInput
                  style={[styles.modalInput, styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={callLogForm.call_date}
                  onChangeText={(text) => setCallLogForm({ ...callLogForm, call_date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                />
                <TouchableOpacity 
                  style={[styles.helperButton, { borderColor: colors.border }]}
                  onPress={setToday}
                >
                  <Text style={[typography.caption, styles.helperButtonText, { color: colors.primary }]}>
                    Today
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalRow}>
                <View style={styles.modalRowField}>
                  <Text style={[typography.body2, styles.modalLabel, { color: colors.foreground }]}>
                    Time
                  </Text>
                  <View style={styles.dateInputRow}>
                    <TextInput
                      style={[styles.modalInput, styles.dateInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      value={callLogForm.call_time}
                      onChangeText={(text) => setCallLogForm({ ...callLogForm, call_time: text })}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <TouchableOpacity 
                      style={[styles.helperButton, { borderColor: colors.border }]}
                      onPress={setNow}
                    >
                      <Text style={[typography.caption, styles.helperButtonText, { color: colors.primary }]}>
                        Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.modalRowField}>
                  <Text style={[typography.body2, styles.modalLabel, { color: colors.foreground }]}>
                    Duration (min)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    value={callLogForm.duration}
                    onChangeText={(text) => setCallLogForm({ ...callLogForm, duration: text })}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[typography.body2, styles.modalLabel, styles.modalLabelTop, { color: colors.foreground }]}>
                Status
              </Text>
              <View style={styles.statusOptionsContainer}>
                {['completed', 'scheduled', 'missed', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      { borderColor: colors.border },
                      callLogForm.status === status && { borderColor: getCallStatusColor(status), backgroundColor: getCallStatusColor(status) + '10' },
                    ]}
                    onPress={() => setCallLogForm({ ...callLogForm, status: status as any })}
                  >
                    <View style={[styles.statusOptionDot, { backgroundColor: getCallStatusColor(status) }]} />
                    <Text style={[typography.caption, styles.statusOptionText, { color: callLogForm.status === status ? getCallStatusColor(status) : colors.mutedForeground }]}>
                      {getCallStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalConvertButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateCallLog}
              >
                <Text style={[typography.button, styles.modalConvertText, { color: colors.primaryForeground }]}>
                  {editingCallLog ? 'Update Call Log' : 'Save Call Log'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCallLogModal(false);
                  setEditingCallLog(null);
                }}
              >
                <Text style={[typography.body2, styles.modalCancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    customerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    customerNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    typeIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    customerName: {
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
    customerDetails: {
      marginTop: 10,
      marginLeft: 42,
      gap: 4,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    customerEmail: {
      flex: 1,
    },
    customerPhone: {
      flex: 1,
    },
    customerAddress: {
      flex: 1,
    },
    typeAndOrganizationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      marginLeft: 42,
      gap: 8,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      gap: 4,
    },
    typeBadgeText: {
      fontWeight: '500',
    },
    organizationName: {
      fontWeight: '500',
    },
    associatedEntityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginLeft: 42,
      gap: 6,
    },
    associatedEntityText: {
      fontWeight: '400',
    },
    linkedVisitContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginLeft: 42,
      gap: 6,
    },
    linkedVisitText: {
      fontWeight: '400',
    },
    notesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    editNoteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    editNoteText: {
      fontWeight: '500',
    },
    sectionTitle: {
      fontWeight: '600',
    },
    notesText: {
      lineHeight: 20,
    },
    // Call Logs
    callLogsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    callLogsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },callLogActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    callLogEditButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 3,
      backgroundColor: colors.primary + '10',
    },
    callLogCount: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    callLogCountText: {
      fontWeight: '600',
    },
    addCallLogButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    addCallLogText: {
      fontWeight: '600',
    },
    callLogsList: {
      marginTop: 4,
    },
    callLogItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
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
    callLogStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    callLogText: {
      flex: 1,
    },
    callLogStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    callLogStatusText: {
      fontWeight: '500',
    },
    callLogFooter: {
      flexDirection: 'row',
      marginTop: 4,
      marginLeft: 24,
      gap: 12,
      flexWrap: 'wrap',
    },
    callLogMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    callLogMetaText: {
      fontSize: 11,
    },
    noCallLogsContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    noCallLogsText: {
      marginTop: 6,
    },
    noCallLogsButton: {
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderRadius: 8,
    },
    noCallLogsButtonText: {
      fontWeight: '500',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
    },
    detailLabel: {
      fontWeight: '400',
    },
    detailValue: {
      fontWeight: '500',
    },
    detailTypeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      gap: 4,
    },
    detailTypeText: {
      fontWeight: '500',
    },
    actionsContainer: {
      padding: 16,
      marginTop: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      gap: 8,
    },
    convertButton: {
      backgroundColor: '#10B981',
    },
    actionButtonText: {
      fontWeight: '600',
    },
    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontWeight: '600',
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      padding: 16,
    },
    modalLabel: {
      fontWeight: '500',
      marginBottom: 4,
    },
    modalLabelTop: {
      marginTop: 16,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
    },
    modalRow: {
      flexDirection: 'row',
      gap: 12,
    },
    modalRowField: {
      flex: 1,
    },
    modalConvertButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: 12,
      marginTop: 20,
      gap: 8,
    },
    modalConvertText: {
      fontWeight: '600',
    },
    modalCancelButton: {
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 8,
    },
    modalCancelText: {
      fontWeight: '400',
    },
    editNoteInput: {
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    statusOptionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    statusOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
    },
    statusOptionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusOptionText: {
      fontWeight: '500',
    },
    // New styles for direction and helpers
    directionOptionsContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 4,
    },
    directionOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      flex: 1,
      justifyContent: 'center',
    },
    dateInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateInput: {
      flex: 1,
    },
    helperButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    helperButtonText: {
      fontWeight: '600',
    },
  });