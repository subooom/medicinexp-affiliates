// app/(app)/leads/create.tsx
import { leadApi } from '@/api/leads';
import { organizationApi } from '@/api/organizations';
import { visitApi } from '@/api/visits';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { IconName } from '@/utils/icons';
import { Organization, Visit } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

type LeadType = 'customer' | 'associate' | 'organization' | 'contact';
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

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

export default function CreateLeadScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Lead type
  const [leadType, setLeadType] = useState<LeadType>('customer');
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Lead status
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('new');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Organization
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [showOrgModal, setShowOrgModal] = useState(false);

  // Visits (for customer lead type)
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    notes: '',
    associated_entity: '', // For associate type
  });

  const leadTypes: { value: LeadType; label: string; icon: IconName; description: string }[] = [
    { value: 'customer', label: 'Customer', icon: 'person-outline', description: 'A potential customer' },
    { value: 'associate', label: 'Associate', icon: 'people-outline', description: 'A business partner or associate' },
    { value: 'organization', label: 'Organization', icon: 'business-outline', description: 'A healthcare organization' },
    { value: 'contact', label: 'Contact', icon: 'call-outline', description: 'A general contact' },
  ];

  const leadStatuses: { value: LeadStatus; label: string; color: string; description: string }[] = [
    { value: 'new', label: 'New', color: '#8B5CF6', description: 'Just created' },
    { value: 'contacted', label: 'Contacted', color: '#F59E0B', description: 'Reached out' },
    { value: 'qualified', label: 'Qualified', color: '#3B82F6', description: 'Sales qualified' },
    { value: 'converted', label: 'Converted', color: '#10B981', description: 'Became a customer' },
    { value: 'lost', label: 'Lost', color: '#EF4444', description: 'Didn\'t convert' },
  ];

  useEffect(() => {
    loadOrganizations();
    loadVisits();
  }, []);

  const loadOrganizations = async (query?: string) => {
    try {
      const params: any = {};
      if (query) {
        params.search = query;
      }
      const response = await organizationApi.getAll(params);
      const orgData = response.data.data?.data || response.data.data || [];
      setOrganizations(orgData);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadVisits = async () => {
    try {
      const response = await visitApi.getAll();
      setVisits(response.data.data.data || []);
    } catch (error) {
      console.error('Error loading visits:', error);
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

  const getStatusColor = (status: LeadStatus) => {
    const found = leadStatuses.find(s => s.value === status);
    return found?.color || '#6B7280';
  };

  const getStatusLabel = (status: LeadStatus) => {
    const found = leadStatuses.find(s => s.value === status);
    return found?.label || status;
  };

  const handleSubmit = async () => {
    // Validate based on lead type
    if (leadType === 'customer' && !formData.customer_name) {
      Alert.alert('Error', 'Please fill in customer name');
      return;
    }

    if (leadType === 'associate' && (!formData.customer_name || !formData.associated_entity)) {
      Alert.alert('Error', 'Please fill in associate name and associated entity');
      return;
    }

    if (leadType === 'organization' && !selectedOrg) {
      Alert.alert('Error', 'Please select an organization');
      return;
    }

    if (leadType === 'contact' && !formData.customer_name) {
      Alert.alert('Error', 'Please fill in contact name');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone || null,
        customer_address: formData.customer_address || null,
        notes: formData.notes || null,
        lead_type: leadType,
        status: leadStatus,
      };

      if (leadType === 'organization' && selectedOrg) {
        payload.organization_id = selectedOrg.id;
      }

      if (leadType === 'associate') {
        payload.associated_entity = formData.associated_entity;
      }

      if (leadType === 'customer' && selectedVisit) {
        payload.mr_visit_id = selectedVisit.id;
      }

      await leadApi.create(payload);
      Alert.alert('Success', 'Lead created successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  const getLeadTypeIconName = (type: LeadType) => {
    const found = leadTypes.find(t => t.value === type);
    return found?.icon || 'person-outline';
  };

  const getLeadTypeLabelName = (type: LeadType) => {
    const found = leadTypes.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        {/* Lead Type Selection */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Lead Type *</Text>
          <TouchableOpacity
            style={[styles.typeSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowTypeModal(true)}
          >
            <View style={styles.typeSelectorContent}>
              <Ionicons name={getLeadTypeIconName(leadType)} size={20} color={colors.primary} />
              <Text style={[typography.body1, styles.typeSelectorText, { color: colors.foreground }]}>
                {getLeadTypeLabelName(leadType)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Lead Status Selection */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Status *</Text>
          <TouchableOpacity
            style={[styles.typeSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowStatusModal(true)}
          >
            <View style={styles.typeSelectorContent}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(leadStatus) }]} />
              <Text style={[typography.body1, styles.typeSelectorText, { color: colors.foreground }]}>
                {getStatusLabel(leadStatus)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Organization Selection (for organization type) */}
        {leadType === 'organization' && (
          <View style={styles.field}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Organization *</Text>
            <TouchableOpacity
              style={[styles.orgSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowOrgModal(true)}
            >
              {selectedOrg ? (
                <View style={styles.orgSelectorContent}>
                  <View style={[styles.orgSelectorIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[typography.h5, styles.orgSelectorIconText, { color: colors.primary }]}>
                      {selectedOrg.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[typography.body1, styles.orgSelectorName, { color: colors.foreground }]}>
                      {selectedOrg.name}
                    </Text>
                    <Text style={[typography.body2, styles.orgSelectorAddress, { color: colors.mutedForeground }]}>
                      {selectedOrg.address}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[typography.body1, styles.orgSelectorPlaceholder, { color: colors.mutedForeground }]}>
                  Select an organization
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Visit Selection (for customer type) */}
        {leadType === 'customer' && (
          <View style={styles.field}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Link to Visit (Optional)</Text>
            <TouchableOpacity
              style={[styles.orgSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowVisitModal(true)}
            >
              {selectedVisit ? (
                <View style={styles.orgSelectorContent}>
                  <View style={[styles.visitSelectorIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[typography.body1, styles.orgSelectorName, { color: colors.foreground }]}>
                      {selectedVisit.organization?.name || 'Unknown'}
                    </Text>
                    <Text style={[typography.body2, styles.orgSelectorAddress, { color: colors.mutedForeground }]}>
                      {new Date(selectedVisit.visit_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[typography.body1, styles.orgSelectorPlaceholder, { color: colors.mutedForeground }]}>
                  Link to a visit (optional)
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Associate Entity (for associate type) */}
        {leadType === 'associate' && (
          <View style={styles.field}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Associated Entity *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={formData.associated_entity}
              onChangeText={(text) => setFormData({ ...formData, associated_entity: text })}
              placeholder="e.g., ABC Medical Store, XYZ Pharmacy"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        )}

        {/* Name - Required for all except organization */}
        {leadType !== 'organization' && (
          <View style={styles.field}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
              {leadType === 'customer' ? 'Customer Name *' :
               leadType === 'associate' ? 'Associate Name *' :
               'Contact Name *'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={formData.customer_name}
              onChangeText={(text) => setFormData({ ...formData, customer_name: text })}
              placeholder={`Enter ${getLeadTypeLabelName(leadType).toLowerCase()} name`}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        )}

        {/* Email */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={formData.customer_email}
            onChangeText={(text) => setFormData({ ...formData, customer_email: text })}
            placeholder="Enter email address"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={formData.customer_phone}
            onChangeText={(text) => setFormData({ ...formData, customer_phone: text })}
            placeholder="Enter phone number"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
          />
        </View>

        {/* Address */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={formData.customer_address}
            onChangeText={(text) => setFormData({ ...formData, customer_address: text })}
            placeholder="Enter address"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Add notes about this lead..."
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
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
              <Text style={[typography.button, styles.submitText, { color: colors.primaryForeground }]}>
                Create Lead
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Lead Type Modal */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Lead Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {leadTypes.map((type) => {
                const typeColor = getLeadTypeColor(type.value, colors);
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      { borderColor: colors.border },
                      leadType === type.value && { borderColor: typeColor, backgroundColor: typeColor + '10' },
                    ]}
                    onPress={() => {
                      setLeadType(type.value);
                      setShowTypeModal(false);
                      if (type.value !== 'organization') setSelectedOrg(null);
                      if (type.value !== 'customer') setSelectedVisit(null);
                      if (type.value !== 'associate') {
                        setFormData({ ...formData, associated_entity: '' });
                      }
                    }}
                  >
                    <Ionicons name={type.icon} size={24} color={leadType === type.value ? typeColor : colors.mutedForeground} />
                    <View style={styles.typeOptionContent}>
                      <Text style={[
                        typography.body1,
                        styles.typeOptionLabel,
                        { color: leadType === type.value ? typeColor : colors.foreground },
                      ]}>
                        {type.label}
                      </Text>
                      <Text style={[typography.caption, styles.typeOptionDescription, { color: colors.mutedForeground }]}>
                        {type.description}
                      </Text>
                    </View>
                    {leadType === type.value && (
                      <Ionicons name="checkmark-circle" size={24} color={typeColor} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Lead Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {leadStatuses.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.typeOption,
                    { borderColor: colors.border },
                    leadStatus === status.value && { borderColor: status.color, backgroundColor: status.color + '10' },
                  ]}
                  onPress={() => {
                    setLeadStatus(status.value);
                    setShowStatusModal(false);
                  }}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.statusDotLarge, { backgroundColor: status.color }]} />
                    <View style={styles.typeOptionContent}>
                      <Text style={[
                        typography.body1,
                        styles.typeOptionLabel,
                        { color: leadStatus === status.value ? status.color : colors.foreground },
                      ]}>
                        {status.label}
                      </Text>
                      <Text style={[typography.caption, styles.typeOptionDescription, { color: colors.mutedForeground }]}>
                        {status.description}
                      </Text>
                    </View>
                  </View>
                  {leadStatus === status.value && (
                    <Ionicons name="checkmark-circle" size={24} color={status.color} />
                  )}
                </TouchableOpacity>
              ))}
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
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: colors.card }]}>
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
              <ScrollView style={styles.orgList}>
                {organizations.map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    style={[
                      styles.orgOption,
                      { borderColor: colors.border },
                      selectedOrg?.id === org.id && styles.orgOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedOrg(org);
                      setShowOrgModal(false);
                    }}
                  >
                    <View style={styles.orgOptionContent}>
                      <View style={[styles.orgOptionIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[typography.body1, styles.orgOptionIconText, { color: colors.primary }]}>
                          {org.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[typography.body1, styles.orgOptionName, { color: colors.foreground }]}>
                          {org.name}
                        </Text>
                        <Text style={[typography.body2, styles.orgOptionAddress, { color: colors.mutedForeground }]}>
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

      {/* Visit Modal */}
      <Modal
        visible={showVisitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisitModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, styles.modalContentLarge, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Visit</Text>
              <TouchableOpacity onPress={() => setShowVisitModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ScrollView style={styles.orgList}>
                {visits?.map((visit) => (
                  <TouchableOpacity
                    key={visit.id}
                    style={[
                      styles.orgOption,
                      { borderColor: colors.border },
                      selectedVisit?.id === visit.id && styles.orgOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedVisit(visit);
                      setShowVisitModal(false);
                    }}
                  >
                    <View style={styles.orgOptionContent}>
                      <View style={[styles.visitOptionIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="location-outline" size={16} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[typography.body1, styles.orgOptionName, { color: colors.foreground }]}>
                          {visit.organization?.name || 'Unknown'}
                        </Text>
                        <Text style={[typography.body2, styles.orgOptionAddress, { color: colors.mutedForeground }]}>
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
    typeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
    },
    typeSelectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    typeSelectorText: {
      fontWeight: '400',
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusDotLarge: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    statusOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    orgSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
    },
    orgSelectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    orgSelectorIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orgSelectorIconText: {
      fontWeight: '700',
    },
    orgSelectorName: {
      fontWeight: '500',
    },
    orgSelectorAddress: {
      fontSize: 12,
    },
    orgSelectorPlaceholder: {
      fontWeight: '400',
    },
    visitSelectorIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
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
    modalContentLarge: {
      maxHeight: '80%',
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
    typeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
    },
    typeOptionContent: {
      flex: 1,
      marginLeft: 12,
    },
    typeOptionLabel: {
      fontWeight: '500',
    },
    typeOptionDescription: {
      fontSize: 12,
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
    orgList: {
      maxHeight: 300,
    },
    orgOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      marginBottom: 6,
      borderWidth: 1,
    },
    orgOptionSelected: {
      borderWidth: 2,
    },
    orgOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    orgOptionIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orgOptionIconText: {
      fontWeight: '700',
    },
    orgOptionName: {
      fontWeight: '500',
    },
    orgOptionAddress: {
      fontSize: 12,
    },
    visitOptionIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });