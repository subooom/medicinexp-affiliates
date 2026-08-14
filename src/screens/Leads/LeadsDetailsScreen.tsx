// src/screens/Leads/LeadDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { leadApi } from '../../api/leads';
import { Lead } from '../../types/models';

export function LeadDetailsScreen({ route }: any) {
  const { id } = route.params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [saleAmount, setSaleAmount] = useState('');
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    loadLead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLead = async () => {
    try {
      const response = await leadApi.getById(id);
      setLead(response.data);
    } catch (error) {
      console.error('Error loading lead:', error);
      Alert.alert('Error', 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await leadApi.updateStatus(id, status);
      loadLead();
      Alert.alert('Success', `Lead marked as ${status}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleConvert = async () => {
    if (!saleAmount || !tenantId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amount = parseFloat(saleAmount);
    const tenant = parseInt(tenantId, 10);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid sale amount');
      return;
    }

    if (isNaN(tenant) || tenant <= 0) {
      Alert.alert('Error', 'Please enter a valid tenant ID');
      return;
    }

    try {
      await leadApi.convert(id, {
        amount: amount,
        tenant_id: tenant,
      });
      Alert.alert('Success', 'Lead converted to sale!');
      setShowConvertModal(false);
      setSaleAmount('');
      setTenantId('');
      loadLead();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to convert lead');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return '#10B981';
      case 'qualified': return '#3B82F6';
      case 'contacted': return '#F59E0B';
      case 'new': return '#8B5CF6';
      case 'lost': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Text>Lead not found</Text>
      </View>
    );
  }

  const statusOptions = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  const currentStatusIndex = statusOptions.indexOf(lead.status);

  return (
    <ScrollView style={styles.container}>
      {/* Customer Info */}
      <View style={styles.card}>
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{lead.customer_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
            <Text style={styles.statusText}>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.customerEmail}>{lead.customer_email}</Text>
        {lead.customer_phone && (
          <Text style={styles.customerPhone}>{lead.customer_phone}</Text>
        )}
        {lead.organization && (
          <Text style={styles.organizationName}>{lead.organization.name}</Text>
        )}
      </View>

      {/* Status Flow */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusFlow}>
          {statusOptions.map((status, index) => {
            const isActive = index === currentStatusIndex;
            const isCompleted = index < currentStatusIndex;
            return (
              <React.Fragment key={status}>
                <TouchableOpacity
                  style={[
                    styles.statusStep,
                    isActive && styles.statusStepActive,
                    isCompleted && styles.statusStepCompleted,
                  ]}
                  onPress={() => {
                    if (status !== 'converted' && status !== lead.status) {
                      handleStatusUpdate(status);
                    }
                  }}
                  disabled={status === 'converted' || status === lead.status}
                >
                  <View style={styles.statusStepContent}>
                    <View
                      style={[
                        styles.statusDot,
                        isActive && styles.statusDotActive,
                        isCompleted && styles.statusDotCompleted,
                      ]}
                    >
                      {isCompleted ? (
                        <Icon name="checkmark" size={12} color="white" />
                      ) : (
                        <Text style={styles.statusStepNumber}>{index + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.statusStepLabel,
                        isActive && styles.statusStepLabelActive,
                        isCompleted && styles.statusStepLabelCompleted,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
                {index < statusOptions.length - 1 && (
                  <View
                    style={[
                      styles.statusLine,
                      index < currentStatusIndex && styles.statusLineCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Additional Info */}
      {lead.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{lead.notes}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created</Text>
          <Text style={styles.detailValue}>
            {new Date(lead.created_at).toLocaleString()}
          </Text>
        </View>
        {lead.converted_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Converted</Text>
            <Text style={styles.detailValue}>
              {new Date(lead.converted_at).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {lead.status !== 'converted' && lead.status !== 'lost' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.convertButton]}
            onPress={() => setShowConvertModal(true)}
          >
            <Icon name="cash-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Convert to Sale</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Convert Modal */}
      <Modal
        visible={showConvertModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConvertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Convert to Sale</Text>
              <TouchableOpacity
                onPress={() => setShowConvertModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Sale Amount *</Text>
              <TextInput
                style={styles.modalInput}
                value={saleAmount}
                onChangeText={setSaleAmount}
                placeholder="Enter sale amount"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={[styles.modalLabel, styles.modalLabelTop]}>Tenant ID *</Text>
              <TextInput
                style={styles.modalInput}
                value={tenantId}
                onChangeText={setTenantId}
                placeholder="Enter tenant ID"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={styles.modalConvertButton}
                onPress={handleConvert}
              >
                <Icon name="cash-outline" size={20} color="white" />
                <Text style={styles.modalConvertText}>Confirm Conversion</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConvertModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  organizationName: {
    fontSize: 14,
    color: '#2563EB',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusFlow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusStep: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusStepActive: {
    // Active styles
  },
  statusStepCompleted: {
    // Completed styles
  },
  statusStepContent: {
    alignItems: 'center',
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDotActive: {
    backgroundColor: '#2563EB',
  },
  statusDotCompleted: {
    backgroundColor: '#10B981',
  },
  statusStepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusStepLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusStepLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  statusStepLabelCompleted: {
    color: '#10B981',
  },
  statusLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  statusLineCompleted: {
    backgroundColor: '#10B981',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  modalLabelTop: {
    marginTop: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalConvertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    gap: 8,
  },
  modalConvertText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
});