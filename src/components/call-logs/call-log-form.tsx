// src/components/call-logs/call-log-form.tsx
import { callLogApi } from '@/api/call-logs';
import { leadApi } from '@/api/leads';
import { venueApi } from '@/api/venues';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallDirection, CallLog, CallLogFormData, CallStatus, Lead, Venue } from '@/types/models';
import { toLocalDateString } from '@/utils/time';
import { uuidv4 } from '@/utils/uuid';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface CallLogFormProps {
  // Editing an existing call log; omit to create one
  callLog?: CallLog | null;
  // Pre-selected when coming from a lead or a venue
  leadId?: number;
  venueId?: number;
  // Start as a scheduled call (e.g. "Schedule a call" buttons)
  scheduled?: boolean;
  onSaved: (callLog: CallLog) => void;
}

const STATUSES: { value: CallStatus; label: string }[] = [
  { value: 'completed', label: 'Done' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'missed', label: 'Missed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toTimeString = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function CallLogForm({ callLog, leadId, venueId, scheduled, onSaved }: CallLogFormProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialWhen = useMemo(() => {
    if (callLog) return new Date(`${callLog.call_date}T${callLog.call_time}`);
    const now = new Date();
    if (scheduled) {
      now.setDate(now.getDate() + 1);
      now.setHours(11, 0, 0, 0);
    }
    return now;
  }, [callLog, scheduled]);

  const [status, setStatus] = useState<CallStatus>(callLog?.status ?? (scheduled ? 'scheduled' : 'completed'));
  const [direction, setDirection] = useState<CallDirection>(callLog?.direction ?? 'outgoing');
  const [when, setWhen] = useState<Date>(initialWhen);
  const [duration, setDuration] = useState(callLog?.duration_minutes ? String(callLog.duration_minutes) : '');
  const [notes, setNotes] = useState(callLog?.notes ?? '');
  const [lead, setLead] = useState<Pick<Lead, 'id' | 'display_name'> | null>(callLog?.lead ?? null);
  const [venue, setVenue] = useState<Pick<Venue, 'id' | 'name'> | null>(callLog?.venue ?? null);
  const [search, setSearch] = useState('');
  const [leadResults, setLeadResults] = useState<Lead[]>([]);
  const [venueResults, setVenueResults] = useState<Venue[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const clientUuid = useRef(uuidv4());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (leadId && !lead) {
      leadApi.getById(leadId).then((r) => setLead(r.data.data)).catch(() => undefined);
    }
    if (venueId && !venue) {
      venueApi.getById(venueId).then((r) => setVenue(r.data.data.venue)).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, venueId]);

  const runSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) {
      setLeadResults([]);
      setVenueResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const [leads, venues] = await Promise.all([
          leadApi.getAll({ search: text, per_page: 5 }),
          venueApi.getAll({ search: text, per_page: 5 }),
        ]);
        setLeadResults(leads.data.data.data);
        setVenueResults(venues.data.data.data);
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, 300);
  };

  const save = async () => {
    if (!lead && !venue) {
      Alert.alert('Who did you call?', 'Pick a lead or a pharmacy.');
      return;
    }

    const payload: CallLogFormData = {
      direction,
      status,
      call_date: toLocalDateString(when),
      call_time: toTimeString(when),
      duration_minutes: parseInt(duration) || 0,
      notes: notes.trim() || null,
      lead_id: lead?.id ?? null,
      venue_id: venue?.id ?? null,
    };

    setSaving(true);
    try {
      const response = callLog
        ? await callLogApi.update(callLog.id, payload)
        : await callLogApi.create({ ...payload, client_uuid: clientUuid.current });
      onSaved(response.data.data);
    } catch (error: any) {
      Alert.alert('Could not save', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const chip = (selected: boolean) => [
    styles.chip,
    { borderColor: selected ? colors.primary : colors.border },
    selected && { backgroundColor: colors.primary },
  ];

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Who</Text>
      {lead || venue ? (
        <View style={styles.selectedList}>
          {lead && (
            <View style={[styles.input, styles.row, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={[typography.body2, { flex: 1, color: colors.foreground }]}>{lead.display_name}</Text>
              <TouchableOpacity onPress={() => setLead(null)}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}
          {venue && (
            <View style={[styles.input, styles.row, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Ionicons name="business-outline" size={18} color={colors.primary} />
              <Text style={[typography.body2, { flex: 1, color: colors.foreground }]}>{venue.name}</Text>
              <TouchableOpacity onPress={() => setVenue(null)}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={search}
            onChangeText={runSearch}
            placeholder="Search your leads or pharmacies"
            placeholderTextColor={colors.mutedForeground}
          />
          {leadResults.map((result) => (
            <TouchableOpacity key={`l${result.id}`} style={[styles.result, { borderColor: colors.border }]} onPress={() => { setLead(result); setSearch(''); }}>
              <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
              <Text style={[typography.body2, { color: colors.foreground }]}>{result.display_name}</Text>
            </TouchableOpacity>
          ))}
          {venueResults.map((result) => (
            <TouchableOpacity key={`v${result.id}`} style={[styles.result, { borderColor: colors.border }]} onPress={() => { setVenue(result); setSearch(''); }}>
              <Ionicons name="business-outline" size={16} color={colors.mutedForeground} />
              <Text style={[typography.body2, { color: colors.foreground }]}>{result.name}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Call</Text>
      <View style={styles.chips}>
        {STATUSES.map((option) => (
          <TouchableOpacity key={option.value} style={chip(status === option.value)} onPress={() => setStatus(option.value)}>
            <Text style={[typography.caption, { color: status === option.value ? colors.primaryForeground : colors.foreground }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.chips}>
        {(['outgoing', 'incoming'] as CallDirection[]).map((value) => (
          <TouchableOpacity key={value} style={chip(direction === value)} onPress={() => setDirection(value)}>
            <Ionicons name={value === 'outgoing' ? 'arrow-up-outline' : 'arrow-down-outline'} size={14} color={direction === value ? colors.primaryForeground : colors.foreground} />
            <Text style={[typography.caption, { color: direction === value ? colors.primaryForeground : colors.foreground }]}>
              {value === 'outgoing' ? 'I called' : 'They called'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>{status === 'scheduled' ? 'Call on' : 'When'}</Text>
      <TouchableOpacity style={[styles.input, styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[typography.body2, { color: colors.foreground }]}>{when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
      </TouchableOpacity>

      {status === 'completed' && (
        <>
          <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Minutes (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor={colors.mutedForeground}
          />
        </>
      )}

      <Text style={[typography.body2, styles.label, { color: colors.foreground }]}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder={status === 'scheduled' ? 'What is the call about?' : 'What was said? Next step?'}
        placeholderTextColor={colors.mutedForeground}
      />

      <TouchableOpacity style={[styles.submit, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[typography.button, { color: colors.primaryForeground }]}>
            {callLog ? 'Save changes' : status === 'scheduled' ? 'Schedule call' : 'Log call'}
          </Text>
        )}
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={showPicker}
        mode="datetime"
        date={when}
        onConfirm={(date) => {
          setWhen(date);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    form: { padding: 16, gap: 8, paddingBottom: 40 },
    label: { fontWeight: '600', marginTop: 8 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
    multiline: { minHeight: 90, textAlignVertical: 'top' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectedList: { gap: 8 },
    result: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
    submit: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  });
