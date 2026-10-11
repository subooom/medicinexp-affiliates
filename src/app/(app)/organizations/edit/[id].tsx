// app/(app)/organizations/edit/[id].tsx
import { organizationApi } from '@/api/organizations';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { OrganizationType } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditOrganizationScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState<OrganizationType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgResponse, typesResponse] = await Promise.all([
        organizationApi.getById(parseInt(id)),
        organizationApi.getTypes(),
      ]);

      const org = orgResponse.data;
      setFormData({
        name: org.name || '',
        address: org.address || '',
        city: org.city || '',
        state: org.state || '',
        zip_code: org.zip_code || '',
        phone: org.phone || '',
        email: org.email || '',
        website: org.website || '',
        latitude: org.latitude ? org.latitude.toString() : '',
        longitude: org.longitude ? org.longitude.toString() : '',
      });

      setTypes(typesResponse.data.data || []);
      if (org.organization_type_id) {
        const type = typesResponse.data.data.find((t: OrganizationType) => t.id === org.organization_type_id);
        if (type) setSelectedType(type);
      } else if (typesResponse.data.data.length > 0) {
        setSelectedType(typesResponse.data.data[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.city) {
      Alert.alert('Error', 'Please fill in name, address, and city');
      return;
    }

    if (!selectedType) {
      Alert.alert('Error', 'Please select an organization type');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        organization_type_id: selectedType.id,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      await organizationApi.update(parseInt(id), payload);
      Alert.alert('Success', 'Organization updated successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update organization');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeColor = (type: OrganizationType) => {
    return type.color || colors.primary;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        {/* Organization Type */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Organization Type *</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowTypeModal(true)}
          >
            {selectedType ? (
              <View style={styles.selectorContent}>
                <View style={[styles.typeIcon, { backgroundColor: selectedType.color + '15' }]}>
                  <Ionicons name={selectedType.icon || 'business-outline'} size={18} color={selectedType.color} />
                </View>
                <Text style={[typography.body1, styles.selectorText, { color: colors.foreground }]}>
                  {selectedType.name}
                </Text>
              </View>
            ) : (
              <Text style={[typography.body1, styles.selectorPlaceholder, { color: colors.mutedForeground }]}>
                Select organization type
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Organization Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter organization name"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Address */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Address *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* City */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>City *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            placeholder="Enter city"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* State & Zip Code */}
        <View style={styles.row}>
          <View style={[styles.rowField, { flex: 1 }]}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>State</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
              placeholder="State"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={[styles.rowField, { flex: 1 }]}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Zip Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={formData.zip_code}
              onChangeText={(text) => setFormData({ ...formData, zip_code: text })}
              placeholder="Zip code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Phone & Email */}
        <View style={styles.row}>
          <View style={[styles.rowField, { flex: 1 }]}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Phone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Phone number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.rowField, { flex: 1 }]}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Website */}
        <View style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Website</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={formData.website}
            onChangeText={(text) => setFormData({ ...formData, website: text })}
            placeholder="Website URL"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
        </View>

        {/* Location */}
        <View style={styles.row}>
          <View style={[styles.rowField, { flex: 1 }]}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Latitude</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={formData.latitude}
              onChangeText={(text) => setFormData({ ...formData, latitude: text })}
              placeholder="e.g., 27.7172"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.rowField, { flex: 1 }]}>
            <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Longitude</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={formData.longitude}
              onChangeText={(text) => setFormData({ ...formData, longitude: text })}
              placeholder="e.g., 85.3240"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Submit */}
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
                Update Organization
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Type Modal - Same as create */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>Select Organization Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {types.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    { borderColor: colors.border },
                    selectedType?.id === type.id && styles.typeOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedType(type);
                    setShowTypeModal(false);
                  }}
                >
                  <View style={styles.typeOptionContent}>
                    <View style={[styles.typeOptionIcon, { backgroundColor: type.color + '15' }]}>
                      <Ionicons name={type.icon || 'business-outline'} size={24} color={type.color} />
                    </View>
                    <View>
                      <Text style={[typography.body1, styles.typeOptionName, { color: colors.foreground }]}>
                        {type.name}
                      </Text>
                      {type.description && (
                        <Text style={[typography.caption, styles.typeOptionDesc, { color: colors.mutedForeground }]}>
                          {type.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedType?.id === type.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      fontSize: 14,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    rowField: {
      marginBottom: 16,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
    },
    selectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    typeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectorText: {
      fontWeight: '500',
    },
    selectorPlaceholder: {
      fontWeight: '400',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
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
    typeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
    },
    typeOptionSelected: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    typeOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    typeOptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeOptionName: {
      fontWeight: '500',
    },
    typeOptionDesc: {
      fontSize: 12,
    },
  });