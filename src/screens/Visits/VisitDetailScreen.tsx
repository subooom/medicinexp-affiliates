// src/screens/Visits/VisitDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { visitApi } from '../../api/visits';
import { Visit } from '../../types/models';

export function VisitDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, []);

  const loadVisit = async () => {
    try {
      const response = await visitApi.getById(id);
      setVisit(response.data);
    } catch (error) {
      console.error('Error loading visit:', error);
      Alert.alert('Error', 'Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    Alert.alert(
      'Check Out',
      'Are you sure you want to check out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'default',
          onPress: async () => {
            try {
              await visitApi.checkout(id);
              Alert.alert('Success', 'Checked out successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to check out');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'planned': return '#3B82F6';
      case 'cancelled': return '#EF4444';
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

  if (!visit) {
    return (
      <View style={styles.errorContainer}>
        <Text>Visit not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Organization Info */}
      <View style={styles.card}>
        <View style={styles.organizationHeader}>
          <Text style={styles.organizationName}>{visit.organization?.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visit.status) }]}>
            <Text style={styles.statusText}>
              {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.address}>{visit.organization?.address}</Text>
        <Text style={styles.address}>{visit.organization?.city}, {visit.organization?.state}</Text>
      </View>

      {/* Visit Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Visit Details</Text>
        <View style={styles.detailRow}>
          <Icon name="calendar-outline" size={20} color="#6B7280" />
          <Text style={styles.detailText}>
            Date: {new Date(visit.visit_date).toLocaleDateString()}
          </Text>
        </View>
        {visit.visit_time && (
          <View style={styles.detailRow}>
            <Icon name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.detailText}>Time: {visit.visit_time}</Text>
          </View>
        )}
        {visit.check_in_time && (
          <View style={styles.detailRow}>
            <Icon name="enter-outline" size={20} color="#10B981" />
            <Text style={styles.detailText}>
              Checked In: {new Date(visit.check_in_time).toLocaleString()}
            </Text>
          </View>
        )}
        {visit.check_out_time && (
          <View style={styles.detailRow}>
            <Icon name="exit-outline" size={20} color="#EF4444" />
            <Text style={styles.detailText}>
              Checked Out: {new Date(visit.check_out_time).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {visit.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{visit.notes}</Text>
        </View>
      )}

      {/* Actions */}
      {visit.status !== 'completed' && visit.status !== 'cancelled' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Icon name="exit-outline" size={20} color="white" />
            <Text style={styles.checkoutButtonText}>Check Out</Text>
          </TouchableOpacity>
        </View>
      )}
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
  organizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  organizationName: {
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
  address: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 16,
    marginTop: 8,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});