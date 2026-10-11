// app/(app)/visits/checkin.tsx - Fixed MaterialDropoff Integration
import { distributionApi, marketingMaterialApi, organizationApi } from '@/api';
import { visitApi } from '@/api/visits';
import { MaterialDropoff } from '@/components/dashboard/visits/checkin/MaterialDropOffMarketingMaterials';
import { ProductShowcase } from '@/components/dashboard/visits/checkin/ProductShowcase';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { toIconName } from '@/utils/icons';
import { toLocalDateString } from '@/utils/time';
import { MarketingMaterial, Organization, OrganizationType } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

type VisitStatus = 'planned' | 'completed' | 'cancelled';

interface DroppedMaterial {
  materialId: number;
  quantity: number;
}

export default function CheckInScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Organization Types
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [selectedOrgType, setSelectedOrgType] = useState<OrganizationType | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  
  // Visit Date/Time
  const [visitDate, setVisitDate] = useState(new Date());
  const [visitTime, setVisitTime] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  
  // Location
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [nearbyOrgs, setNearbyOrgs] = useState<Organization[]>([]);
  
  // Marketing Materials
  const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MarketingMaterial | null>(null);
  const [droppedMaterials, setDroppedMaterials] = useState<DroppedMaterial[]>([]);
  const [showMaterialToggle, setShowMaterialToggle] = useState(false);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [selectedMaterialForModal, setSelectedMaterialForModal] = useState<MarketingMaterial | null>(null);
  const [showProducts, setShowProducts] = useState(false);

  // New organization form
  const [newOrg, setNewOrg] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    requestLocationPermission();
    loadOrganizations();
    loadMaterials();
    loadOrganizationTypes();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      
      loadNearbyOrganizations(currentLocation.coords.latitude, currentLocation.coords.longitude);
      
      setNewOrg({
        ...newOrg,
        latitude: currentLocation.coords.latitude.toString(),
        longitude: currentLocation.coords.longitude.toString(),
      });
      
      Alert.alert('Success', 'Location captured successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please enable GPS.');
    }
  };

  const loadOrganizationTypes = async () => {
    try {
      const response = await organizationApi.getTypes();
      setOrgTypes(response.data || []);
    } catch (error) {
      console.error('Error loading organization types:', error);
    }
  };

  const loadNearbyOrganizations = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await organizationApi.getNearby({
        latitude: lat,
        longitude: lng,
        radius: 10,
      });
      setNearbyOrgs(response.data.data || []);
      
      if (response.data.data.length > 0) {
        setOrganizations(response.data.data);
      }
    } catch (error) {
      console.error('Error loading nearby organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async (query?: string) => {
    setLoading(true);
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
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const response = await marketingMaterialApi.getMyMaterials();
      setMaterials(response.data.data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      loadOrganizations(text);
    } else if (text.length === 0) {
      loadOrganizations();
    }
  };

  const handleToggleLocation = async (value: boolean) => {
    setUseCurrentLocation(value);
    if (value) {
      if (locationPermission) {
        await getCurrentLocation();
      } else {
        Alert.alert('Permission Required', 'Please allow location access to use this feature.');
        await requestLocationPermission();
      }
    } else {
      loadOrganizations();
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrg.name || !newOrg.address || !newOrg.city) {
      Alert.alert('Error', 'Please fill in name, address, and city');
      return;
    }

    if (!selectedOrgType) {
      Alert.alert('Error', 'Please select an organization type');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: newOrg.name,
        address: newOrg.address,
        city: newOrg.city,
        state: newOrg.state,
        zip_code: newOrg.zip_code,
        phone: newOrg.phone,
        email: newOrg.email,
        organization_type_id: selectedOrgType.id,
        is_active: true,
      };

      if (newOrg.latitude && newOrg.longitude) {
        payload.latitude = parseFloat(newOrg.latitude);
        payload.longitude = parseFloat(newOrg.longitude);
      }

      const response = await organizationApi.create(payload);

      const createdOrg = response.data.data || response.data;
      setOrganizations([createdOrg, ...organizations]);
      setSelectedOrg(createdOrg);
      setShowCreateModal(false);
      
      // Reset form
      setNewOrg({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        email: '',
        latitude: '',
        longitude: '',
      });
      setSelectedOrgType(null);
      
      Alert.alert('Success', 'Organization created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // MATERIAL DROPOFF HANDLERS
  // ============================================================
  const handleDropoff = (materialId: number, quantity: number) => {
    setDroppedMaterials(prev => {
      // Find if material already exists
      const existing = prev.find(item => item.materialId === materialId);
      if (existing) {
        return prev.map(item =>
          item.materialId === materialId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { materialId, quantity }];
    });
    console.log(`Dropped ${quantity} of material ${materialId}`);
  };

  const handleClearDropoff = () => {
    setDroppedMaterials([]);
  };

  // ============================================================
  // CHECK-IN HANDLER
  // ============================================================
  const handleCheckIn = async () => {
    if (!selectedOrg) {
      Alert.alert('Error', 'Please select an organization');
      return;
    }

    setSubmitting(true);
    try {
      const formattedDate = toLocalDateString(visitDate);
      const formattedTime = visitTime.toTimeString().split(' ')[0];

      const visitPayload: any = {
        organization_id: selectedOrg.id,
        visit_date: formattedDate,
        visit_time: formattedTime,
        notes,
      };

      if (location) {
        visitPayload.latitude = location.coords.latitude;
        visitPayload.longitude = location.coords.longitude;
      }

      const visitResponse = await visitApi.create(visitPayload);
      const visitId = visitResponse.data?.data?.id;

      // Distribute materials if any
      for (const item of droppedMaterials) {
        await distributionApi.create({
          organization_id: selectedOrg.id,
          marketing_material_id: item.materialId,
          quantity: item.quantity,
          distribution_date: formattedDate,
        });
      }

      Alert.alert(
        'Success',
        droppedMaterials.length > 0
          ? `Checked in and ${droppedMaterials.length} material(s) distributed successfully!`
          : 'Checked in successfully!'
      );
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to check in');
    } finally {
      setSubmitting(false);
    }
  };

  const showDatePicker = () => setDatePickerVisible(true);
  const showTimePicker = () => setTimePickerVisible(true);

  const handleDateConfirm = (date: Date) => {
    setVisitDate(date);
    setDatePickerVisible(false);
  };

  const handleTimeConfirm = (date: Date) => {
    setVisitTime(date);
    setTimePickerVisible(false);
  };

  const setToday = () => setVisitDate(new Date());
  const setNow = () => setVisitTime(new Date());

  const openMaterialModal = (material: MarketingMaterial) => {
    setSelectedMaterialForModal(material);
    setMaterialModalVisible(true);
  };

  const getTypeColor = (type: OrganizationType) => {
    return type.color || colors.primary;
  };

  const filteredOrganizations = organizations?.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const displayOrganizations = useCurrentLocation && nearbyOrgs.length > 0 
    ? nearbyOrgs 
    : filteredOrganizations;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[typography.h4, styles.headerTitle, { color: colors.foreground }]}>Check In</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Location Toggle */}
        <View style={[styles.locationContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.locationHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={[typography.body2, styles.locationTitle, { color: colors.foreground }]}>Use Current Location</Text>
          </View>
          <View style={styles.locationControls}>
            <Switch
              value={useCurrentLocation}
              onValueChange={handleToggleLocation}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={useCurrentLocation ? colors.primaryForeground : colors.primaryForeground}
            />
            {useCurrentLocation && location && (
              <View style={styles.locationInfo}>
                <Text style={[typography.caption, styles.locationCoords, { color: colors.mutedForeground }]}>
                  {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                </Text>
                <Text style={[typography.caption, styles.locationAccuracy, { color: colors.mutedForeground }]}>
                  Accuracy: {location.coords.accuracy?.toFixed(0) || 'N/A'}m
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[typography.body1, styles.searchInput, { color: colors.foreground }]}
            placeholder={useCurrentLocation ? "Search nearby organizations..." : "Search organizations..."}
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length === 0 && !useCurrentLocation && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Organizations List */}
        <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
          {useCurrentLocation ? 'Nearby Organizations' : 'Select Organization'}
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : displayOrganizations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
            <Text style={[typography.body2, styles.emptyText, { color: colors.mutedForeground }]}>
              {useCurrentLocation ? 'No nearby organizations found' : 'No organizations found'}
            </Text>
            {useCurrentLocation ? (
              <TouchableOpacity
                style={styles.createOrgButton}
                onPress={() => {
                  setUseCurrentLocation(false);
                  loadOrganizations();
                }}
              >
                <Text style={[typography.body2, styles.createOrgButtonText, { color: colors.primary }]}>
                  Search all organizations
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.createOrgButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={[typography.body2, styles.createOrgButtonText, { color: colors.primary }]}>
                  + Create New Organization
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayOrganizations.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={[
                styles.orgItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedOrg?.id === org.id && styles.orgItemSelected,
              ]}
              onPress={() => setSelectedOrg(org)}
              activeOpacity={0.7}
            >
              <View style={styles.orgItemContent}>
                <View style={[styles.orgIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[typography.h5, styles.orgIconText, { color: colors.primary }]}>
                    {org.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.orgInfo}>
                  <Text style={[typography.body1, styles.orgName, { color: colors.foreground }]}>
                    {org.name}
                  </Text>
                  <Text style={[typography.body2, styles.orgAddress, { color: colors.mutedForeground }]}>
                    {org.address}
                  </Text>
                  <Text style={[typography.caption, styles.orgCity, { color: colors.mutedForeground }]}>
                    {org.city}, {org.state}
                  </Text>
                  {org.distance && (
                    <Text style={[typography.caption, styles.orgDistance, { color: colors.primary }]}>
                      {org.distance.toFixed(1)} km away
                    </Text>
                  )}
                  {org.type && (
                    <View style={[styles.orgTypeBadge, { backgroundColor: org.type.color + '15' }]}>
                      <Text style={[typography.caption, styles.orgTypeText, { color: org.type.color }]}>
                        {org.type.name}
                      </Text>
                    </View>
                  )}
                </View>
                {selectedOrg?.id === org.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Quick Add Button */}
        {!useCurrentLocation && (
          <TouchableOpacity style={styles.quickAddButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[typography.body2, styles.quickAddText, { color: colors.primary }]}>
              Can't find it? Create new organization
            </Text>
          </TouchableOpacity>
        )}

        {/* Visit Date & Time */}
        <View style={styles.dateTimeSection}>
          <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
            Visit Details
          </Text>
          
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeField}>
              <Text style={[typography.caption, styles.dateTimeLabel, { color: colors.mutedForeground }]}>
                Date
              </Text>
              <TouchableOpacity 
                style={[styles.dateTimeInput, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={showDatePicker}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={[typography.body2, styles.dateTimeText, { color: colors.foreground }]}>
                  {visitDate.toLocaleDateString()}
                </Text>
                <TouchableOpacity onPress={setToday} style={styles.nowButton}>
                  <Text style={[typography.caption, styles.nowButtonText, { color: colors.primary }]}>Today</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeField}>
              <Text style={[typography.caption, styles.dateTimeLabel, { color: colors.mutedForeground }]}>
                Time
              </Text>
              <TouchableOpacity 
                style={[styles.dateTimeInput, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={showTimePicker}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[typography.body2, styles.dateTimeText, { color: colors.foreground }]}>
                  {visitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <TouchableOpacity onPress={setNow} style={styles.nowButton}>
                  <Text style={[typography.caption, styles.nowButtonText, { color: colors.primary }]}>Now</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Material Distribution Toggle */}
        <View style={[styles.materialToggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.materialToggleHeader}>
            <View style={styles.materialToggleLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
              <Text style={[typography.body2, styles.materialToggleTitle, { color: colors.foreground }]}>
                Distribute Materials
              </Text>
            </View>
            <Switch
              value={showMaterialToggle}
              onValueChange={setShowMaterialToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={showMaterialToggle ? colors.primaryForeground : colors.primaryForeground}
            />
          </View>
        </View>

        {/* Material Distribution Fields */}
        {showMaterialToggle && (
          <View style={[styles.materialFields, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialDropoff
              selectedOrg={selectedOrg}
              materials={materials}
              onClear={handleClearDropoff}
              onDropoff={handleDropoff}
              colors={colors}
            />
          </View>
        )}
        
      <View style={[styles.materialFields, {borderColor: 'transparent' }]}>
        <ProductShowcase
          products={[]} // You'll need to fetch these from API
          onSelect={(productId) => {
            console.log('Selected product:', productId);
          }}
          colors={colors}
          selectedOrg={selectedOrg}
          onToggle={() => setShowProducts(!showProducts)}
          isVisible={showProducts}
        />
      </View>
        
        {/* Notes */}
        <Text style={[typography.body1, styles.sectionTitle, styles.notesTitle, { color: colors.foreground }]}>
          Visit Notes
        </Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about your visit..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Date/Time Pickers */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisible(false)}
        date={visitDate}
      />
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerVisible(false)}
        date={visitTime}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.checkInButton,
            { backgroundColor: colors.primary },
            (!selectedOrg || submitting) && { backgroundColor: colors.mutedForeground }
          ]}
          onPress={handleCheckIn}
          disabled={!selectedOrg || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name="location" size={20} color={colors.primaryForeground} />
              <Text style={[typography.button, styles.checkInText, { color: colors.primaryForeground }]}>
                {showMaterialToggle ? 'Check In & Distribute' : 'Check In'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Material Detail Modal */}
      <Modal
        visible={materialModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMaterialModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>
                Material Details
              </Text>
              <TouchableOpacity onPress={() => setMaterialModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedMaterialForModal && (
                <>
                  {selectedMaterialForModal.image_url ? (
                    <Image 
                      source={{ uri: selectedMaterialForModal.image_url }} 
                      style={styles.modalMaterialImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.modalMaterialImagePlaceholder, { backgroundColor: colors.primary + '10' }]}>
                      <Ionicons name="cube-outline" size={64} color={colors.primary} />
                    </View>
                  )}

                  <View style={styles.modalMaterialInfo}>
                    <Text style={[typography.h4, styles.modalMaterialName, { color: colors.foreground }]}>
                      {selectedMaterialForModal.name}
                    </Text>
                    <Text style={[typography.body2, styles.modalMaterialDescription, { color: colors.mutedForeground }]}>
                      {selectedMaterialForModal.description || 'No description available'}
                    </Text>
                    <View style={styles.modalMaterialStats}>
                      <View style={styles.modalMaterialStat}>
                        <Text style={[typography.caption, styles.modalStatLabel, { color: colors.mutedForeground }]}>
                          Stock
                        </Text>
                        <Text style={[typography.h5, styles.modalStatValue, { color: colors.foreground }]}>
                          {selectedMaterialForModal.quantity_remaining}
                        </Text>
                      </View>
                      <View style={styles.modalStatDivider} />
                      <View style={styles.modalMaterialStat}>
                        <Text style={[typography.caption, styles.modalStatLabel, { color: colors.mutedForeground }]}>
                          Total Distributed
                        </Text>
                        <Text style={[typography.h5, styles.modalStatValue, { color: colors.foreground }]}>
                          {selectedMaterialForModal.total_distributed}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalHistorySection}>
                    <Text style={[typography.h6, styles.modalHistoryTitle, { color: colors.foreground }]}>
                      Distribution History
                    </Text>
                    
                    {selectedMaterialForModal.distributions && selectedMaterialForModal.distributions.length > 0 ? (
                      selectedMaterialForModal.distributions.slice(0, 10).map((item: any, index: number) => (
                        <View key={index} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                          <View style={styles.historyItemLeft}>
                            <Ionicons name="business-outline" size={16} color={colors.primary} />
                            <View>
                              <Text style={[typography.body2, styles.historyOrgName, { color: colors.foreground }]}>
                                {item.organization?.name || 'Unknown'}
                              </Text>
                              <Text style={[typography.caption, styles.historyQuantity, { color: colors.mutedForeground }]}>
                                Qty: {item.quantity}
                              </Text>
                            </View>
                          </View>
                          <Text style={[typography.caption, styles.historyDate, { color: colors.mutedForeground }]}>
                            {new Date(item.distribution_date).toLocaleDateString()}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.historyEmpty}>
                        <Text style={[typography.body2, styles.historyEmptyText, { color: colors.mutedForeground }]}>
                          No distributions yet
                        </Text>
                      </View>
                    )}
                    {selectedMaterialForModal.distributions && selectedMaterialForModal.distributions.length > 10 && (
                      <Text style={[typography.caption, styles.historyMore, { color: colors.mutedForeground }]}>
                        +{selectedMaterialForModal.distributions.length - 10} more distributions
                      </Text>
                    )}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setSelectedMaterial(selectedMaterialForModal);
                        setMaterialModalVisible(false);
                      }}
                    >
                      <Text style={[typography.button, styles.modalActionText, { color: colors.primaryForeground }]}>
                        Select This Material
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Organization Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>
                Create New Organization
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Organization Type *
                </Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowTypeModal(true)}
                >
                  {selectedOrgType ? (
                    <View style={styles.selectorContent}>
                      <View style={[styles.orgTypeSelectorIcon, { backgroundColor: selectedOrgType.color + '15' }]}>
                        <Ionicons name={toIconName(selectedOrgType.icon, 'business-outline')} size={18} color={selectedOrgType.color || colors.primary} />
                      </View>
                      <Text style={[typography.body1, styles.selectorName, { color: colors.foreground, }]}>
                        {selectedOrgType.name}
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

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Organization Name *
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.name}
                  onChangeText={(text) => setNewOrg({ ...newOrg, name: text })}
                  placeholder="Enter organization name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Address *
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.address}
                  onChangeText={(text) => setNewOrg({ ...newOrg, address: text })}
                  placeholder="Enter address"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  City *
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.city}
                  onChangeText={(text) => setNewOrg({ ...newOrg, city: text })}
                  placeholder="Enter city"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  State
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.state}
                  onChangeText={(text) => setNewOrg({ ...newOrg, state: text })}
                  placeholder="Enter state"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Zip Code
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.zip_code}
                  onChangeText={(text) => setNewOrg({ ...newOrg, zip_code: text })}
                  placeholder="Enter zip code"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Phone
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.phone}
                  onChangeText={(text) => setNewOrg({ ...newOrg, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Email
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={newOrg.email}
                  onChangeText={(text) => setNewOrg({ ...newOrg, email: text })}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.locationFieldsContainer}>
                <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
                  Location (Optional)
                </Text>
                <View style={styles.locationRow}>
                  <View style={styles.locationField}>
                    <Text style={[typography.caption, styles.locationFieldLabel, { color: colors.mutedForeground }]}>
                      Latitude
                    </Text>
                    <TextInput
                      style={[styles.locationInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      value={newOrg.latitude}
                      onChangeText={(text) => setNewOrg({ ...newOrg, latitude: text })}
                      placeholder="e.g., 27.7172"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.locationField}>
                    <Text style={[typography.caption, styles.locationFieldLabel, { color: colors.mutedForeground }]}>
                      Longitude
                    </Text>
                    <TextInput
                      style={[styles.locationInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      value={newOrg.longitude}
                      onChangeText={(text) => setNewOrg({ ...newOrg, longitude: text })}
                      placeholder="e.g., 85.3240"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                {location && (
                  <TouchableOpacity
                    style={styles.useLocationButton}
                    onPress={() => {
                      setNewOrg({
                        ...newOrg,
                        latitude: location.coords.latitude.toString(),
                        longitude: location.coords.longitude.toString(),
                      });
                    }}
                  >
                    <Ionicons name="location" size={16} color={colors.primary} />
                    <Text style={[typography.body2, styles.useLocationText, { color: colors.primary }]}>
                      Use my current location
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  { backgroundColor: colors.primary },
                  submitting && { backgroundColor: colors.mutedForeground }
                ]}
                onPress={handleCreateOrganization}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[typography.button, styles.modalSubmitText, { color: colors.primaryForeground }]}>
                    Create Organization
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Organization Type Modal */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>
                Select Organization Type
              </Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {orgTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    { borderColor: colors.border },
                    selectedOrgType?.id === type.id && styles.typeOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedOrgType(type);
                    setShowTypeModal(false);
                  }}
                >
                  <View style={styles.typeOptionContent}>
                    <View style={[styles.typeOptionIcon, { backgroundColor: type.color + '15' }]}>
                      <Ionicons name={toIconName(type.icon, 'business-outline')} size={24} color={type.color || colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body1, styles.typeOptionName, { color: colors.foreground }]}>
                        {type.name}
                      </Text>
                      {type.description && (
                        <Text style={[typography.caption, styles.typeOptionDescription, { color: colors.mutedForeground }]}>
                          {type.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedOrgType?.id === type.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1, padding: 16 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backButton: { padding: 4 },
    headerTitle: { fontWeight: '600', flex: 1, textAlign: 'center' },

    locationContainer: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
    },
    locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationTitle: { fontWeight: '600' },
    locationControls: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
    locationInfo: { flex: 1 },
    locationCoords: { fontSize: 11 },
    locationAccuracy: { fontSize: 10 },

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    searchInput: { flex: 1, marginLeft: 8 },
    addButton: { padding: 4 },

    sectionTitle: { fontWeight: '600', marginBottom: 12 },
    loader: { marginTop: 20 },

    emptyContainer: { alignItems: 'center', paddingVertical: 30 },
    emptyText: { marginTop: 8, textAlign: 'center' },
    createOrgButton: { marginTop: 12, padding: 8 },
    createOrgButtonText: { fontWeight: '600' },

    orgItem: {
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
    },
    orgItemSelected: { borderWidth: 2, borderColor: colors.primary },
    orgItemContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    orgIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    orgIconText: { fontWeight: '700' },
    orgInfo: { flex: 1 },
    orgName: { fontWeight: '600' },
    orgAddress: { marginTop: 0 },
    orgCity: { marginTop: 0 },
    orgDistance: { marginTop: 2, fontWeight: '500' },
    orgTypeBadge: { 
      marginTop: 4, 
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    orgTypeText: { fontWeight: '500', fontSize: 10 },

    quickAddButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 8 },
    quickAddText: { marginLeft: 8, fontWeight: '500' },

    dateTimeSection: { marginTop: 16 },
    dateTimeRow: { flexDirection: 'row', gap: 12 },
    dateTimeField: { flex: 1 },
    dateTimeLabel: { marginBottom: 4 },
    dateTimeInput: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    dateTimeText: { flex: 1 },
    nowButton: { paddingHorizontal: 8, paddingVertical: 2 },
    nowButtonText: { fontWeight: '600' },

    materialToggleContainer: {
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
      borderWidth: 1,
    },
    materialToggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    materialToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    materialToggleTitle: { fontWeight: '600' },

    materialFields: {
      borderRadius: 12,
      marginTop: 12,
      borderWidth: 1,
    },
    materialFieldGroup: { marginBottom: 12 },
    label: { fontWeight: '500', marginBottom: 6 },
    materialList: { maxHeight: 160 },
    noMaterialsContainer: { padding: 12, alignItems: 'center' },
    noMaterialsText: { fontStyle: 'italic' },

    materialItem: {
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
    },
    materialItemSelected: { borderWidth: 2, borderColor: colors.primary },
    materialItemContent: { flexDirection: 'row', alignItems: 'center' },
    materialImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
    materialImagePlaceholder: { width: 50, height: 50, borderRadius: 8, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    materialItemInfo: { flex: 1 },
    materialItemName: { fontWeight: '500' },
    materialItemStock: { marginTop: 1 },
    materialCheck: { marginLeft: 8 },

    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quantityButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    quantityButtonText: { fontWeight: '700', fontSize: 14 },
    quantityValue: { fontWeight: '700', minWidth: 40, textAlign: 'center' },

    notesTitle: { marginTop: 16 },
    notesInput: {
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      minHeight: 100,
      textAlignVertical: 'top',
    },

    footer: { padding: 16, borderTopWidth: 1 },
    checkInButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    checkInText: { fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    modalTitle: { fontWeight: '600' },
    modalBody: { padding: 16 },

    modalMaterialImage: { width: '100%', height: 200, borderRadius: 12 },
    modalMaterialImagePlaceholder: { width: '100%', height: 200, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalMaterialInfo: { marginTop: 16 },
    modalMaterialName: { fontWeight: '700' },
    modalMaterialDescription: { marginTop: 4 },
    modalMaterialStats: { flexDirection: 'row', marginTop: 12, padding: 12, backgroundColor: colors.background, borderRadius: 10 },
    modalMaterialStat: { flex: 1, alignItems: 'center' },
    modalStatLabel: { fontWeight: '500' },
    modalStatValue: { fontWeight: '700', marginTop: 2 },
    modalStatDivider: { width: 1, backgroundColor: colors.border },

    modalHistorySection: { marginTop: 16 },
    modalHistoryTitle: { fontWeight: '600', marginBottom: 8 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
    historyItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyOrgName: { fontWeight: '500' },
    historyQuantity: { fontSize: 12 },
    historyDate: { fontSize: 11 },
    historyMore: { textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
    historyEmpty: { padding: 20, alignItems: 'center' },
    historyEmptyText: { fontStyle: 'italic' },

    modalActions: { marginTop: 16, marginBottom: 20 },
    modalActionButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    modalActionText: { fontWeight: '600' },

    inputGroup: { marginBottom: 16 },
    input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
    },
    selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    orgTypeSelectorIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    selectorName: { fontWeight: '500' },
    selectorPlaceholder: { fontWeight: '400' },
    locationFieldsContainer: { marginBottom: 16 },
    locationRow: { flexDirection: 'row', gap: 12 },
    locationField: { flex: 1 },
    locationFieldLabel: { marginBottom: 4 },
    locationInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
    useLocationButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
    useLocationText: { fontWeight: '500' },
    modalSubmitButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, marginBottom: 20 },
    modalSubmitText: { fontWeight: '600' },

    typeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
    },
    typeOptionSelected: { borderWidth: 2, borderColor: colors.primary },
    typeOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    typeOptionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    typeOptionName: { fontWeight: '500' },
    typeOptionDescription: { fontSize: 12 },
  });