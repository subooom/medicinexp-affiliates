// src/components/venues/venue-form.tsx
import { venueApi } from '@/api/venues';
import { takePhoto } from '@/components/field/photo-capture';
import { guessFromSignboard } from '@/utils/signboard';
import { extractTextFromImage, isSupported as ocrSupported } from 'expo-text-extractor';
import { queuedMessage, sendOrQueue } from '@/offline/send';
import { venueIndex } from '@/offline/venue-index';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Venue, VenueFormData, VenueType } from '@/types/models';
import { toIconName } from '@/utils/icons';
import { uuidv4 } from '@/utils/uuid';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface VenueFormProps {
  // Editing an existing venue; omit to create one
  venue?: Venue | null;
  submitLabel?: string;
  // null: saved on the phone, waiting to sync (no server id yet)
  onSaved: (venue: Venue | null, pending?: Venue) => void;
}

type FieldKey = 'name' | 'address' | 'city' | 'district' | 'phone' | 'email' | 'pan_number';

const FIELDS: { key: FieldKey; label: string; placeholder: string; required?: boolean; keyboard?: 'phone-pad' | 'email-address' }[] = [
  { key: 'name', label: 'Name', placeholder: 'e.g. Sharma Pharmacy', required: true },
  { key: 'address', label: 'Address', placeholder: 'Street / tole, ward', required: true },
  { key: 'city', label: 'City', placeholder: 'e.g. Biratnagar' },
  { key: 'district', label: 'District', placeholder: 'e.g. Morang' },
  { key: 'phone', label: 'Phone', placeholder: 'Shop phone', keyboard: 'phone-pad' },
  { key: 'email', label: 'Email', placeholder: 'Optional', keyboard: 'email-address' },
  { key: 'pan_number', label: 'PAN number', placeholder: 'Optional' },
];

/**
 * Create or edit a pharmacy / clinic. Used by the venue screens and the check-in screen.
 */
export function VenueForm({ venue, submitLabel, onSaved }: VenueFormProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [types, setTypes] = useState<VenueType[]>([]);
  const [typeId, setTypeId] = useState<number | null>(venue?.venue_type_id ?? null);
  const [showTypes, setShowTypes] = useState(false);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    name: venue?.name ?? '',
    address: venue?.address ?? '',
    city: venue?.city ?? '',
    district: venue?.district ?? '',
    phone: venue?.phone ?? '',
    email: venue?.email ?? '',
    pan_number: venue?.pan_number ?? '',
  });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    venue?.latitude != null && venue?.longitude != null ? { latitude: venue.latitude, longitude: venue.longitude } : null
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  // One id per new venue, so a retried save doesn't create it twice
  const clientUuid = useRef(uuidv4());

  useEffect(() => {
    venueApi
      .getTypes()
      .then((response) => {
        setTypes(response.data.data);
        if (!venue && !typeId) {
          const pharmacy = response.data.data.find((t) => t.slug === 'pharmacy');
          if (pharmacy) setTypeId(pharmacy.id);
        }
      })
      .catch((error) => console.error('Error loading venue types:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const [scanning, setScanning] = useState(false);

  // Read the signboard / licence on the phone (no internet, nothing sent anywhere) and
  // fill the empty fields with what it finds
  const scanSignboard = async () => {
    const photo = await takePhoto();
    if (!photo) return;
    setScanning(true);
    try {
      const guess = guessFromSignboard(await extractTextFromImage(photo.uri));
      const filled: string[] = [];
      setValues((prev) => {
        const next = { ...prev };
        (['name', 'address', 'phone', 'pan_number'] as const).forEach((key) => {
          if (!next[key].trim() && guess[key]) {
            next[key] = guess[key]!;
            filled.push(key === 'pan_number' ? 'PAN' : key);
          }
        });
        return next;
      });
      Alert.alert(
        filled.length ? 'Filled in from the photo' : 'Could not read much',
        filled.length ? `Check the ${filled.join(', ')} before saving.` : 'Type the details in, or try a closer, straighter photo.'
      );
    } catch {
      Alert.alert('Could not read the photo', 'Type the details in instead.');
    } finally {
      setScanning(false);
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Allow location access to pin this place on the map.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert('Location unavailable', 'Turn on GPS and try again.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!values.name.trim() || !values.address.trim()) {
      Alert.alert('Missing details', 'Add a name and an address.');
      return;
    }

    const payload: VenueFormData = {
      name: values.name.trim(),
      address: values.address.trim(),
      venue_type_id: typeId,
      city: values.city.trim() || null,
      district: values.district.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      pan_number: values.pan_number.trim() || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };

    setSaving(true);
    try {
      const result = venue
        ? await sendOrQueue<Venue>({ method: 'put', url: `/venues/${venue.id}`, data: payload, label: `Edit ${payload.name}` })
        : await sendOrQueue<Venue>({ method: 'post', url: '/venues', data: { ...payload, client_uuid: clientUuid.current }, label: `New place: ${payload.name}` });
      if (result.queued) {
        // Usable right away offline (check in, add a lead) with a temporary id
        let pending: Venue | undefined;
        if (!venue) {
          pending = await venueIndex.addPending({ ...(payload as any), client_uuid: clientUuid.current, is_active: true, is_customer: false, can_edit: true, distance: null, province: null, type: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
        Alert.alert('Saved on your phone', queuedMessage);
        onSaved(null, pending);
      } else {
        onSaved(result.data);
      }
    } catch (error: any) {
      if (error.status === 409 && error.data?.venue_id) {
        Alert.alert('Already added', 'This pharmacy is already in the list. Search for it instead.');
      } else {
        Alert.alert('Could not save', error.message || 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      {!venue && ocrSupported && (
        <TouchableOpacity
          style={[styles.input, styles.selector, { backgroundColor: colors.primary + '10', borderColor: colors.primary, justifyContent: 'center', gap: 8 }]}
          onPress={scanSignboard}
          disabled={scanning}
        >
          {scanning ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="scan-outline" size={20} color={colors.primary} />}
          <Text style={[typography.body1, { color: colors.primary, fontWeight: '600' }]}>{scanning ? 'Reading…' : 'Scan signboard or licence'}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.field}>
        <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Type</Text>
        <TouchableOpacity
          style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowTypes(true)}
        >
          {selectedType ? (
            <View style={styles.selectorContent}>
              <Ionicons name={toIconName(selectedType.icon, 'business-outline')} size={18} color={selectedType.color || colors.primary} />
              <Text style={[typography.body1, { color: colors.foreground }]}>{selectedType.name}</Text>
            </View>
          ) : (
            <Text style={[typography.body1, { color: colors.mutedForeground }]}>Choose a type</Text>
          )}
          <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {FIELDS.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={values[field.key]}
            onChangeText={(text) => setValues({ ...values, [field.key]: text })}
            placeholder={field.placeholder}
            placeholderTextColor={colors.mutedForeground}
            keyboardType={field.keyboard ?? 'default'}
            autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
          />
        </View>
      ))}

      <View style={styles.field}>
        <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Map pin</Text>
        <TouchableOpacity
          style={[styles.input, styles.selector, { backgroundColor: colors.card, borderColor: coords ? colors.primary : colors.border }]}
          onPress={useCurrentLocation}
          disabled={locating}
        >
          <View style={styles.selectorContent}>
            <Ionicons name={coords ? 'location' : 'location-outline'} size={18} color={colors.primary} />
            <Text style={[typography.body2, { color: coords ? colors.foreground : colors.mutedForeground }]}>
              {coords
                ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                : 'Standing at the shop? Use my location'}
            </Text>
          </View>
          {locating ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="locate" size={18} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submit, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[typography.button, { color: colors.primaryForeground }]}>
            {submitLabel ?? (venue ? 'Save changes' : 'Add pharmacy')}
          </Text>
        )}
      </TouchableOpacity>

      <Modal visible={showTypes} transparent animationType="slide" onRequestClose={() => setShowTypes(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypes(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[typography.h5, { color: colors.foreground, marginBottom: 12 }]}>Type</Text>
            {types.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setTypeId(type.id);
                  setShowTypes(false);
                }}
              >
                <Ionicons name={toIconName(type.icon, 'business-outline')} size={20} color={type.color || colors.primary} />
                <Text style={[typography.body1, { color: colors.foreground, flex: 1 }]}>{type.name}</Text>
                {type.id === typeId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    form: { padding: 16, gap: 14, paddingBottom: 40 },
    field: { gap: 6 },
    label: { fontWeight: '600' },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
    selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    submit: { marginTop: 8, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32, maxHeight: '70%' },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  });
