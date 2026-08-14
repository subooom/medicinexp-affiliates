// src/screens/Visits/CheckInScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { visitApi } from '../../api/visits';
import { organizationApi } from '../../api/organizations';
import { Organization } from '../../types/models';

export function CheckInScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const response = await organizationApi.getAll();
      setOrganizations(response.data.data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedOrg) {
      Alert.alert('Error', 'Please select an organization');
      return;
    }

    setLoading(true);
    try {
      await visitApi.create({
        organization_id: selectedOrg.id,
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: new Date().toTimeString().split(' ')[0],
        notes,
      });

      Alert.alert('Success', 'Checked in successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search organizations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Organizations List */}
        <Text style={styles.sectionTitle}>Select Organization</Text>
        {loading && !organizations.length ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          filteredOrganizations.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={[
                styles.orgItem,
                selectedOrg?.id === org.id && styles.orgItemSelected,
              ]}
              onPress={() => setSelectedOrg(org)}
            >
              <View style={styles.orgItemContent}>
                <View style={styles.orgIcon}>
                  <Text style={styles.orgIconText}>
                    {org.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.orgInfo}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <Text style={styles.orgAddress}>{org.address}</Text>
                  <Text style={styles.orgCity}>{org.city}, {org.state}</Text>
                </View>
                {selectedOrg?.id === org.id && (
                  <Icon name="checkmark-circle" size={24} color="#2563EB" />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Notes */}
        <Text style={[styles.sectionTitle, styles.notesTitle]}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about your visit..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Check In Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkInButton, (!selectedOrg || loading) && styles.disabled]}
          onPress={handleCheckIn}
          disabled={!selectedOrg || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="location" size={20} color="white" />
              <Text style={styles.checkInText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  notesTitle: {
    marginTop: 16,
  },
  orgItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orgItemSelected: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  orgItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  orgIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orgAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  orgCity: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
    fontSize: 14,
    color: '#1F2937',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  disabled: {
    backgroundColor: '#9CA3AF',
  },
  checkInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});