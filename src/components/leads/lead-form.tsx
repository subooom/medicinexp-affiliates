// src/components/leads/lead-form.tsx
import { fieldApi } from '@/api/field';
import { venueApi } from '@/api/venues';
import { queuedMessage, sendOrQueue } from '@/offline/send';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Lead, LeadInput, LeadType, Product, Venue } from '@/types/models';
import { LEAD_TYPES, leadTypeColor } from '@/utils/lead-types';
import { uuidv4 } from '@/utils/uuid';
import { contactSyncAvailable, saveDefault, syncLeadContact } from '@/utils/contact-sync';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface LeadFormProps {
  // Editing an existing lead; omit to create one
  lead?: Lead | null;
  // Pre-selected when coming from a venue or a visit
  venueId?: number;
  visitId?: number;
  // null: saved on the phone, waiting to sync (no server id yet)
  onSaved: (lead: Lead | null) => void;
}

const CREATE_STATUSES: { value: 'new' | 'contacted' | 'qualified'; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Interested' },
];

export function LeadForm({ lead, venueId, visitId, onSaved }: LeadFormProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [leadType, setLeadType] = useState<LeadType>(lead?.lead_type ?? (venueId ? 'organization' : 'customer'));
  const [status, setStatus] = useState<'new' | 'contacted' | 'qualified'>('new');
  const [venue, setVenue] = useState<Venue | null>(lead?.venue ?? null);
  const [venueSearch, setVenueSearch] = useState('');
  const [venueResults, setVenueResults] = useState<Venue[]>([]);
  const [values, setValues] = useState({
    contact_name: lead?.contact_name ?? '',
    contact_phone: lead?.contact_phone ?? '',
    contact_email: lead?.contact_email ?? '',
    contact_address: lead?.contact_address ?? '',
    associated_entity: lead?.associated_entity ?? '',
    notes: lead?.notes ?? '',
  });
  const [interest, setInterest] = useState<number | null>(lead?.interest_level ?? null);
  // Which product they're interested in (the program's catalogue, cached for offline)
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | null>(lead?.product_id ?? null);

  useEffect(() => {
    fieldApi.getProducts().then((r) => setProducts(r.data.data)).catch(() => undefined);
  }, []);
  const [followUp, setFollowUp] = useState<Date | null>(lead?.next_follow_up_at ? new Date(lead.next_follow_up_at) : null);
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  // Save the contact to the phone (MedicineXP account) when the lead saves; remembers the last choice
  const [saveToPhone, setSaveToPhone] = useState(true);
  useEffect(() => {
    saveDefault.get().then(setSaveToPhone);
  }, []);
  const clientUuid = useRef(uuidv4());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (venueId && !venue) {
      venueApi
        .getById(venueId)
        .then((response) => setVenue(response.data.data.venue))
        .catch((error) => console.error('Error loading venue:', error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const searchVenues = (text: string) => {
    setVenueSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) {
      setVenueResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const response = await venueApi.getAll({ search: text, per_page: 10 });
        setVenueResults(response.data.data.data);
      } catch (error) {
        console.error('Venue search failed:', error);
      }
    }, 300);
  };

  const set = (key: keyof typeof values, value: string) => setValues({ ...values, [key]: value });

  const save = async () => {
    if (leadType === 'organization' && !venue) {
      Alert.alert('Choose the pharmacy', 'Pick the pharmacy or clinic this lead is for.');
      return;
    }
    if (leadType !== 'organization' && !values.contact_name.trim()) {
      Alert.alert('Add a name', 'Who did you talk to?');
      return;
    }
    if (leadType === 'associate' && !values.associated_entity.trim()) {
      Alert.alert('Associated with?', 'Add the pharmacy or company this person is associated with.');
      return;
    }

    const clean = (value: string) => value.trim() || null;
    const payload: LeadInput = {
      lead_type: leadType,
      venue_id: venue?.id ?? null,
      contact_name: clean(values.contact_name),
      contact_phone: clean(values.contact_phone),
      contact_email: clean(values.contact_email),
      contact_address: clean(values.contact_address),
      associated_entity: leadType === 'associate' ? clean(values.associated_entity) : null,
      interest_level: interest,
      product_id: productId,
      next_follow_up_at: followUp ? followUp.toISOString() : null,
      notes: clean(values.notes),
    };

    setSaving(true);
    try {
      const who = payload.contact_name || venue?.name || 'lead';
      const result = lead
        ? await sendOrQueue<Lead>({ method: 'put', url: `/leads/${lead.id}`, data: payload, label: `Edit lead: ${who}` })
        : await sendOrQueue<Lead>({
            method: 'post',
            url: '/leads',
            data: { ...payload, status, visit_id: visitId ?? null, client_uuid: clientUuid.current },
            label: `New lead: ${who}`,
          });
      // Contact on the phone: saved now even if the lead itself is still waiting to sync
      const contactPhone = payload.contact_phone || venue?.phone;
      if (contactSyncAvailable && contactPhone) {
        if (saveToPhone || lead) {
          await syncLeadContact(
            {
              contactName: payload.contact_name,
              phone: contactPhone,
              venueName: venue?.name,
              status: lead?.status ?? status,
              productName: products.find((p) => p.id === productId)?.name ?? null,
              followUpAt: payload.next_follow_up_at,
              notes: payload.notes,
            },
            // Editing only refreshes a saved contact unless the rep ticked "Save"
            { create: saveToPhone, event: lead ? null : 'New lead' }
          );
        }
      }

      if (result.queued) {
        Alert.alert('Saved on your phone', queuedMessage);
        onSaved(null);
      } else {
        onSaved(result.data);
      }
    } catch (error: any) {
      if (error.status === 409 && error.data?.lead_id) {
        Alert.alert('Already a lead', 'You already have an open lead for this contact.');
      } else {
        Alert.alert('Could not save', error.message || 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const input = (key: keyof typeof values, placeholder: string, options: Partial<React.ComponentProps<typeof TextInput>> = {}) => (
    <TextInput
      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }, options.multiline && styles.multiline]}
      value={values[key]}
      onChangeText={(text) => set(key, text)}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      {...options}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>What kind of lead?</Text>
      <View style={styles.typeGrid}>
        {LEAD_TYPES.map((type) => {
          const selected = leadType === type.value;
          const color = leadTypeColor(type.value, colors);
          return (
            <TouchableOpacity
              key={type.value}
              style={[styles.typeCard, { backgroundColor: colors.card, borderColor: selected ? color : colors.border }, selected && { backgroundColor: color + '10' }]}
              onPress={() => setLeadType(type.value)}
            >
              <Ionicons name={type.icon} size={22} color={selected ? color : colors.mutedForeground} />
              <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>{type.label}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>{type.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
        Pharmacy / clinic{leadType === 'organization' ? ' *' : ' (optional)'}
      </Text>
      {venue ? (
        <View style={[styles.input, styles.selected, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <Ionicons name="business-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>{venue.name}</Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>{venue.address}</Text>
          </View>
          <TouchableOpacity onPress={() => setVenue(null)}>
            <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={venueSearch}
            onChangeText={searchVenues}
            placeholder="Search pharmacies"
            placeholderTextColor={colors.mutedForeground}
          />
          {venueResults.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={[styles.result, { borderColor: colors.border }]}
              onPress={() => {
                setVenue(result);
                setVenueResults([]);
                setVenueSearch('');
              }}
            >
              <Text style={[typography.body2, { color: colors.foreground }]}>{result.name}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>{result.address}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>
        {leadType === 'organization' ? 'Person you spoke to (optional)' : 'Name *'}
      </Text>
      {input('contact_name', 'Full name', { autoCapitalize: 'words' })}

      {leadType === 'associate' && (
        <>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Associated with *</Text>
          {input('associated_entity', 'Pharmacy or company name', { autoCapitalize: 'words' })}
        </>
      )}

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Phone</Text>
      {input('contact_phone', '98XXXXXXXX', { keyboardType: 'phone-pad' })}
      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Email (optional)</Text>
      {input('contact_email', 'name@example.com', { keyboardType: 'email-address', autoCapitalize: 'none' })}

      {!lead && (
        <>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Where are things at?</Text>
          <View style={styles.chips}>
            {CREATE_STATUSES.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.chip, { borderColor: status === option.value ? colors.primary : colors.border }, status === option.value && { backgroundColor: colors.primary }]}
                onPress={() => setStatus(option.value)}
              >
                <Text style={[typography.caption, { color: status === option.value ? colors.primaryForeground : colors.foreground }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>How interested? (1 cold – 5 ready)</Text>
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.chip, styles.interestChip, { borderColor: interest === level ? colors.primary : colors.border }, interest === level && { backgroundColor: colors.primary }]}
            onPress={() => setInterest(interest === level ? null : level)}
          >
            <Text style={[typography.body2, { color: interest === level ? colors.primaryForeground : colors.foreground, fontWeight: '600' }]}>{level}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {products.length > 0 && (
        <>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Interested in</Text>
          <View style={styles.chips}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[styles.chip, { borderColor: productId === product.id ? colors.primary : colors.border }, productId === product.id && { backgroundColor: colors.primary }]}
                onPress={() => setProductId(productId === product.id ? null : product.id)}
              >
                <Text style={[typography.body2, { color: productId === product.id ? colors.primaryForeground : colors.foreground, fontWeight: '600' }]}>{product.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Follow up on</Text>
      <TouchableOpacity
        style={[styles.input, styles.selected, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowFollowUpPicker(true)}
      >
        <Ionicons name="alarm-outline" size={18} color={colors.primary} />
        <Text style={[typography.body2, { flex: 1, color: followUp ? colors.foreground : colors.mutedForeground }]}>
          {followUp ? followUp.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No follow-up set'}
        </Text>
        {followUp && (
          <TouchableOpacity onPress={() => setFollowUp(null)}>
            <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Notes</Text>
      {input('notes', 'What did they say? Objections? What do they use now?', { multiline: true })}

      {contactSyncAvailable && !!(values.contact_phone.trim() || venue?.phone) && (
        <TouchableOpacity
          style={styles.saveContact}
          onPress={() => {
            setSaveToPhone(!saveToPhone);
            saveDefault.set(!saveToPhone);
          }}
        >
          <Ionicons name={saveToPhone ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Save to phone contacts</Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>Shows who's calling, with the lead's status. Removed if you leave.</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.submit, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[typography.button, { color: colors.primaryForeground }]}>{lead ? 'Save changes' : 'Create lead'}</Text>
        )}
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={showFollowUpPicker}
        mode="datetime"
        date={followUp ?? new Date(Date.now() + 24 * 60 * 60 * 1000)}
        onConfirm={(date) => {
          setFollowUp(date);
          setShowFollowUpPicker(false);
        }}
        onCancel={() => setShowFollowUpPicker(false)}
      />
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    form: { padding: 16, gap: 8, paddingBottom: 40 },
    saveContact: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    label: { fontWeight: '600', marginTop: 8 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeCard: { width: '48%', flexGrow: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, gap: 4 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    selected: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    result: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
    interestChip: { width: 48, alignItems: 'center' },
    submit: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  });
