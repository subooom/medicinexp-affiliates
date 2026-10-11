// app/(app)/call-logs/create.tsx - Updated with all requested changes
import { callLogApi } from '@/api/call-logs';
import { leadApi } from '@/api/leads';
import { organizationApi } from '@/api/organizations';
import { visitApi } from '@/api/visits';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { IconName } from '@/utils/icons';
import { toLocalDateString } from '@/utils/time';
import { Lead, Organization, Visit } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type CallStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
type CallDirection = 'incoming' | 'outgoing';

export default function CreateCallLogScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    call_date: toLocalDateString(new Date()),
    call_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    duration: '',
    notes: '',
    status: 'completed' as CallStatus,
    direction: 'outgoing' as CallDirection,
    is_scheduled: false,
    scheduled_at: '',
  });

  // Lead
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  // Organization
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');

  // MR Visits
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitSearchQuery, setVisitSearchQuery] = useState('');

  useEffect(() => {
    loadLeads();
    loadOrganizations();
    loadVisits();
  }, []);

  const loadLeads = async (query?: string) => {
    try {
      const params: any = {};
      if (query) {
        params.search = query;
      }
      const response = await leadApi.getAll(params);
      setLeads(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadOrganizations = async (query?: string) => {
    try {
      const params: any = {};
      if (query) {
        params.search = query;
      }
      const response = await organizationApi.getAll(params);
      setOrganizations(response.data.data?.data || response.data.data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadVisits = async (query?: string) => {
    try {
      const params: any = {};
      if (query) {
        params.search = query;
      }
      const response = await visitApi.getAll(params);
      setVisits(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading visits:', error);
    }
  };

  const handleSearchLeads = (text: string) => {
    setLeadSearchQuery(text);
    if (text.length >= 2) {
      loadLeads(text);
    } else if (text.length === 0) {
      loadLeads();
    }
  };

  const handleSearchOrgs = (text: string) => {
    setOrgSearchQuery(text);
    if (text.length >= 2) {
      loadOrganizations(text);
    } else if (text.length === 0) {
      loadOrganizations();
    }
  };

  const handleSearchVisits = (text: string) => {
    setVisitSearchQuery(text);
    if (text.length >= 2) {
      loadVisits(text);
    } else if (text.length === 0) {
      loadVisits();
    }
  };

  const handleSubmit = async () => {
    if (!formData.notes) {
      Alert.alert('Error', 'Please add call notes');
      return;
    }

    if (!selectedLead && !selectedVisit && !selectedOrg) {
      Alert.alert('Error', 'Please select a lead, visit, or organization');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        lead_id: selectedLead?.id || null,
        mr_visit_id: selectedVisit?.id || null,
        organization_id: selectedOrg?.id || null,
        call_date: formData.call_date,
        call_time: formData.call_time,
        duration: parseInt(formData.duration) || 0,
        notes: formData.notes,
        status: formData.status,
        direction: formData.direction,
        is_scheduled: formData.status === 'scheduled',
        scheduled_at: formData.status === 'scheduled' ? formData.scheduled_at : null,
      };

      await callLogApi.create(payload);
      Alert.alert('Success', 'Call log created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create call log');
    } finally {
      setSubmitting(false);
    }
  };

  const setToday = () => {
    setFormData({ ...formData, call_date: toLocalDateString(new Date()) });
  };

  const setNow = () => {
    setFormData({ ...formData, call_time: new Date().toTimeString().split(' ')[0].slice(0, 5) });
  };

  const statusOptions = [
    { value: 'completed', label: 'Completed', color: colors.success },
    { value: 'scheduled', label: 'Scheduled', color: colors.primary },
    { value: 'missed', label: 'Missed', color: colors.warning },
    { value: 'cancelled', label: 'Cancelled', color: colors.destructive },
  ];

  const directionOptions = [
    { value: 'outgoing', label: 'Outgoing', icon: 'call-outline' as IconName },
    { value: 'incoming', label: 'Incoming', icon: 'call' as IconName },
  ];

  // Get future date/time validation for scheduled calls
  const isScheduled = formData.status === 'scheduled';
  const minDate = toLocalDateString(new Date());

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        {/* Direction Selection - Moved to top, required */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Direction *</Text>
          <View style={styles.directionContainer}>
            {directionOptions.map((dir) => (
              <TouchableOpacity
                key={dir.value}
                style={[
                  styles.directionOption,
                  { borderColor: colors.border },
                  formData.direction === dir.value && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setFormData({ ...formData, direction: dir.value as CallDirection })}
              >
                <Ionicons 
                  name={dir.icon} 
                  size={18} 
                  color={formData.direction === dir.value ? colors.primary : colors.mutedForeground} 
                />
                <Text 
                  style={[
                    typography.body2, 
                    styles.directionText, 
                    { color: formData.direction === dir.value ? colors.primary : colors.mutedForeground }
                  ]}
                >
                  {dir.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lead Selection - Row 1 Column 1 */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Lead (Optional)</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowLeadModal(true)}
          >
            {selectedLead ? (
              <View style={styles.selectorContent}>
                <View style={[styles.selectorIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[typography.body1, styles.selectorIconText, { color: colors.primary }]}>
                    {selectedLead.customer_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[typography.body1, styles.selectorName, { color: colors.foreground }]}>
                    {selectedLead.customer_name}
                  </Text>
                  <Text style={[typography.caption, styles.selectorSubtext, { color: colors.mutedForeground }]}>
                    {selectedLead.customer_email}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[typography.body1, styles.selectorPlaceholder, { color: colors.mutedForeground }]}>
                Select a lead (optional)
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Visit Selection - Row 1 Column 2 */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Visit (Optional)</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowVisitModal(true)}
          >
            {selectedVisit ? (
              <View style={styles.selectorContent}>
                <View style={[styles.selectorIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={[typography.body1, styles.selectorName, { color: colors.foreground }]}>
                    {selectedVisit.organization?.name || 'Unknown'}
                  </Text>
                  <Text style={[typography.caption, styles.selectorSubtext, { color: colors.mutedForeground }]}>
                    {new Date(selectedVisit.visit_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[typography.body1, styles.selectorPlaceholder, { color: colors.mutedForeground }]}>
                Select a visit (optional)
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Organization Selection - Row 2 */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Organization (Optional)</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowOrgModal(true)}
          >
            {selectedOrg ? (
              <View style={styles.selectorContent}>
                <View style={[styles.selectorIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[typography.body1, styles.selectorIconText, { color: colors.primary }]}>
                    {selectedOrg.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[typography.body1, styles.selectorName, { color: colors.foreground }]}>
                    {selectedOrg.name}
                  </Text>
                  <Text style={[typography.caption, styles.selectorSubtext, { color: colors.mutedForeground }]}>
                    {selectedOrg.address}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[typography.body1, styles.selectorPlaceholder, { color: colors.mutedForeground }]}>
                Select an organization (optional)
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Status *</Text>
          <View style={styles.statusContainer}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusOption,
                  { borderColor: colors.border },
                  formData.status === status.value && { borderColor: status.color, backgroundColor: status.color + '10' },
                ]}
                onPress={() => setFormData({ ...formData, status: status.value as CallStatus })}
              >
                <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                <Text style={[typography.caption, styles.statusOptionText, { color: formData.status === status.value ? status.color : colors.mutedForeground }]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date & Time with Today/Now buttons */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeField}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
              {isScheduled ? 'Scheduled Date *' : 'Call Date *'}
            </Text>
            <View style={styles.dateTimeInputWrapper}>
              <TextInput
                style={[styles.dateTimeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={formData.call_date}
                onChangeText={(text) => setFormData({ ...formData, call_date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                editable={!isScheduled}
              />
              {!isScheduled && (
                <TouchableOpacity style={styles.todayButton} onPress={setToday}>
                  <Text style={[typography.caption, styles.todayButtonText, { color: colors.primary }]}>Today</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.dateTimeField}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
              {isScheduled ? 'Scheduled Time *' : 'Call Time *'}
            </Text>
            <View style={styles.dateTimeInputWrapper}>
              <TextInput
                style={[styles.dateTimeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={formData.call_time}
                onChangeText={(text) => setFormData({ ...formData, call_time: text })}
                placeholder="HH:MM"
                placeholderTextColor={colors.mutedForeground}
                editable={!isScheduled}
              />
              {!isScheduled && (
                <TouchableOpacity style={styles.todayButton} onPress={setNow}>
                  <Text style={[typography.caption, styles.todayButtonText, { color: colors.primary }]}>Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Duration */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Duration (minutes)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={formData.duration}
            onChangeText={(text) => setFormData({ ...formData, duration: text })}
            placeholder="Enter duration in minutes"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Notes *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="What was discussed?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabled, { backgroundColor: submitting ? colors.mutedForeground : colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={colors.primaryForeground} />
              <Text style={[typography.button, styles.submitText, { color: colors.primaryForeground }]}>
                Log Call
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Lead Modal */}
      <Modal
        visible={showLeadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeadModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Lead</Text>
              <TouchableOpacity onPress={() => setShowLeadModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={[typography.body1, styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search leads..."
                  placeholderTextColor={colors.mutedForeground}
                  value={leadSearchQuery}
                  onChangeText={handleSearchLeads}
                />
              </View>
              <ScrollView style={styles.listContainer}>
                {leads.map((lead) => (
                  <TouchableOpacity
                    key={lead.id}
                    style={[
                      styles.listItem,
                      { borderColor: colors.border },
                      selectedLead?.id === lead.id && styles.listItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedLead(lead);
                      setShowLeadModal(false);
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <View style={[styles.listItemIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[typography.body1, styles.listItemIconText, { color: colors.primary }]}>
                          {lead.customer_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[typography.body1, styles.listItemName, { color: colors.foreground }]}>
                          {lead.customer_name}
                        </Text>
                        <Text style={[typography.caption, styles.listItemSubtext, { color: colors.mutedForeground }]}>
                          {lead.customer_email}
                        </Text>
                      </View>
                    </View>
                    {selectedLead?.id === lead.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visit Modal */}
      <Modal
        visible={showVisitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisitModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Visit</Text>
              <TouchableOpacity onPress={() => setShowVisitModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={[typography.body1, styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search visits..."
                  placeholderTextColor={colors.mutedForeground}
                  value={visitSearchQuery}
                  onChangeText={handleSearchVisits}
                />
              </View>
              <ScrollView style={styles.listContainer}>
                {visits.map((visit) => (
                  <TouchableOpacity
                    key={visit.id}
                    style={[
                      styles.listItem,
                      { borderColor: colors.border },
                      selectedVisit?.id === visit.id && styles.listItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedVisit(visit);
                      setShowVisitModal(false);
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <View style={[styles.listItemIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="location-outline" size={16} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[typography.body1, styles.listItemName, { color: colors.foreground }]}>
                          {visit.organization?.name || 'Unknown Organization'}
                        </Text>
                        <Text style={[typography.caption, styles.listItemSubtext, { color: colors.mutedForeground }]}>
                          {new Date(visit.visit_date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    {selectedVisit?.id === visit.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Organization Modal */}
      <Modal
        visible={showOrgModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrgModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Organization</Text>
              <TouchableOpacity onPress={() => setShowOrgModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={[typography.body1, styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search organizations..."
                  placeholderTextColor={colors.mutedForeground}
                  value={orgSearchQuery}
                  onChangeText={handleSearchOrgs}
                />
              </View>
              <ScrollView style={styles.listContainer}>
                {organizations.map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    style={[
                      styles.listItem,
                      { borderColor: colors.border },
                      selectedOrg?.id === org.id && styles.listItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedOrg(org);
                      setShowOrgModal(false);
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <View style={[styles.listItemIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[typography.body1, styles.listItemIconText, { color: colors.primary }]}>
                          {org.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[typography.body1, styles.listItemName, { color: colors.foreground }]}>
                          {org.name}
                        </Text>
                        <Text style={[typography.caption, styles.listItemSubtext, { color: colors.mutedForeground }]}>
                          {org.address}
                        </Text>
                      </View>
                    </View>
                    {selectedOrg?.id === org.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
    form: {
      padding: 16,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontWeight: '500',
      marginBottom: 4,
    },
    input: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      fontSize: 14,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
    },
    selectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    selectorIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectorIconText: {
      fontWeight: '700',
    },
    selectorName: {
      fontWeight: '500',
    },
    selectorSubtext: {
      fontSize: 12,
    },
    selectorPlaceholder: {
      fontWeight: '400',
    },
    directionContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    directionOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      flex: 1,
      justifyContent: 'center',
    },
    directionText: {
      fontWeight: '500',
    },
    statusContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
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
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusOptionText: {
      fontWeight: '500',
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateTimeField: {
      flex: 1,
    },
    dateTimeInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dateTimeInput: {
      flex: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      fontSize: 14,
    },
    todayButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    todayButtonText: {
      fontWeight: '500',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 8,
      gap: 8,
      marginTop: 8,
    },
    disabled: {
      opacity: 0.6,
    },
    submitText: {
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '70%',
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
    modalBody: {
      padding: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
    },
    listContainer: {
      maxHeight: 300,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      marginBottom: 6,
      borderWidth: 1,
    },
    listItemSelected: {
      borderWidth: 2,
    },
    listItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    listItemIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listItemIconText: {
      fontWeight: '700',
    },
    listItemName: {
      fontWeight: '500',
    },
    listItemSubtext: {
      fontSize: 12,
    },
  });