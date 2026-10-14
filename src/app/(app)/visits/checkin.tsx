// app/(app)/visits/checkin.tsx
import { materialApi } from '@/api/materials';
import { venueApi } from '@/api/venues';
import { fieldApi } from '@/api/field';
import { PhotoCapture } from '@/components/field/photo-capture';
import { PitchKitCard } from '@/components/field/pitch-kit-card';
import { useAuth } from '@/context/AuthContext';
import { VoiceMemo } from '@/components/field/voice-memo';
import { VenueForm } from '@/components/venues/venue-form';
import { CapturedFile, uploadAttachment } from '@/offline/attachments';
import { queuedMessage, sendOrQueue } from '@/offline/send';
import { teamUpApi } from '@/api/team-ups';
import { teamUpStore, useTeamUp } from '@/hooks/use-team-up';
import { apiErrorMessage } from '@/utils/errors';
import { MaterialPicker } from '@/components/visits/material-picker';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { MaterialWithStock, Venue, Visit, VisitInput } from '@/types/models';
import { toIconName } from '@/utils/icons';
import { uuidv4 } from '@/utils/uuid';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

// Warn when the MR is this far from the venue's pin
const FAR_FROM_VENUE_M = 300;

type Fix = { latitude: number; longitude: number; accuracy: number | null };

function metresBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export default function CheckInScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ venueId?: string }>();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Venue[]>([]);
  const [nearby, setNearby] = useState<Venue[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(true);

  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<CapturedFile | null>(null);
  const [memo, setMemo] = useState<CapturedFile | null>(null);

  const [planLater, setPlanLater] = useState(false);
  const [plannedFor, setPlannedFor] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  });
  const [showPicker, setShowPicker] = useState(false);

  // Programs pitched at this shop: the one the rep is working in by default. Ticking another
  // shows its materials and pitch kit, and the server makes a visit for each ticked program.
  const { activeMembership, activeMemberships } = useAuth();
  const activeProgramId = activeMembership?.program?.id ?? null;
  const programs = useMemo(
    () => activeMemberships.map((m) => ({ id: m.program!.id, name: m.program!.name })),
    [activeMemberships]
  );
  const [ticked, setTicked] = useState<number[]>(activeProgramId ? [activeProgramId] : []);
  useEffect(() => {
    setTicked(activeProgramId ? [activeProgramId] : []);
  }, [activeProgramId]);

  const toggleProgram = (programId: number) => {
    if (ticked.includes(programId)) {
      if (ticked.length === 1) return; // something must be pitched
      setTicked(ticked.filter((id) => id !== programId));
      // Its materials leave the list: drop any quantities picked for them
      setQuantities((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => materials.find((m) => m.id === Number(id))?.program_id !== programId))
      );
    } else {
      setTicked([...ticked, programId]);
    }
  };

  // Ticked programs' materials, the active program's first
  const shownMaterials = useMemo(
    () =>
      materials
        .filter((m) => ticked.includes(m.program_id))
        .sort((a, b) => Number(b.program_id === activeProgramId) - Number(a.program_id === activeProgramId) || ticked.indexOf(a.program_id) - ticked.indexOf(b.program_id)),
    [materials, ticked, activeProgramId]
  );

  const [submitting, setSubmitting] = useState(false);
  // Teamed up: this check-in counts for both reps (the server adds the teammate)
  const { running: teamUp } = useTeamUp();
  // One id per check-in so a retried submit is stored once
  const clientUuid = useRef(uuidv4());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const nextFix = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };
      setFix(nextFix);
      const response = await venueApi.getNearby({ latitude: nextFix.latitude, longitude: nextFix.longitude, radius: 2 });
      setNearby(response.data.data.slice(0, 15));
    } catch (error) {
      console.error('Location / nearby failed:', error);
    } finally {
      setLocating(false);
    }
  }, []);

  // Keep every program's pitch kit on the phone, so they open offline at the next shop
  useEffect(() => {
    programs.forEach((program) => {
      fieldApi.getKit(program.id).catch(() => undefined);
      fieldApi.getProducts(program.id).catch(() => undefined);
    });
  }, [programs]);

  useEffect(() => {
    locate();
    materialApi
      // Every program's materials: one check-in can hand out several programs' items
      .getAll({ in_bag: true, all_programs: true })
      .then((response) => setMaterials(response.data.data))
      .catch((error) => console.error('Error loading materials:', error));

    if (params.venueId) {
      venueApi
        .getById(parseInt(params.venueId))
        .then((response) => setVenue(response.data.data.venue))
        .catch((error) => console.error('Error loading venue:', error));
    }
  }, [locate, params.venueId]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await venueApi.getAll({ search: text, per_page: 15 });
        setResults(response.data.data.data);
      } catch (error) {
        console.error('Venue search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const distance = venue && fix && venue.latitude != null && venue.longitude != null
    ? metresBetween(fix, { latitude: venue.latitude, longitude: venue.longitude })
    : null;
  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);

  const submit = async () => {
    if (!venue) {
      Alert.alert('Choose a place', 'Pick the pharmacy or clinic you are at.');
      return;
    }

    const payload: VisitInput = {
      venue_id: venue.id,
      client_uuid: clientUuid.current,
      notes: notes.trim() || undefined,
    };

    if (planLater) {
      payload.status = 'planned';
      payload.visited_at = plannedFor.toISOString();
    } else {
      payload.status = 'completed';
      payload.visited_at = new Date().toISOString();
      if (fix) {
        payload.latitude = fix.latitude;
        payload.longitude = fix.longitude;
        if (fix.accuracy != null) payload.location_accuracy_m = Math.round(fix.accuracy);
      }
      const dropoffs = Object.entries(quantities).map(([materialId, quantity]) => ({
        material_id: Number(materialId),
        quantity,
        client_uuid: uuidv4(),
        // The server files these under each material's own program
        program_id: materials.find((m) => m.id === Number(materialId))?.program_id,
      }));
      if (dropoffs.length > 0) {
        payload.dropoffs = dropoffs;
        payload.received_by = receivedBy.trim() || undefined;
      }
      // One visit per ticked program, with or without materials
      if (ticked.length > 0) payload.programs = ticked;
    }

    setSubmitting(true);
    try {
      const label = `${planLater ? 'Planned visit' : 'Visit'} at ${venue.name}`;
      const result = await sendOrQueue<Visit>({ method: 'post', url: '/visits', data: payload, label });

      // Photo and voice memo go up on their own, attached by the visit's client_uuid
      const target = { type: 'visit' as const, id: result.queued ? undefined : result.data.id, clientUuid: clientUuid.current };
      if (photo) await uploadAttachment('photo', photo, target, `Shop photo: ${venue.name}`).catch(() => undefined);
      if (memo) await uploadAttachment('voice_memo', memo, target, `Voice memo: ${venue.name}`).catch(() => undefined);

      if (result.queued) {
        Alert.alert(planLater ? 'Visit planned' : 'Checked in', queuedMessage);
        router.back();
      } else {
        router.replace({ pathname: '/(app)/visits/[id]', params: { id: result.data.id } });
        // Another rep checked in here at the same time and you're not teamed up
        const suggestion = result.data.team_up_suggestion;
        if (suggestion) askTeamUp(suggestion);
      }
    } catch (error: any) {
      if (error.data?.code === 'visit_too_soon') {
        const availableAt = error.data?.data?.available_at ? new Date(error.data.data.available_at) : null;
        Alert.alert(
          'Too soon',
          availableAt
            ? `Check-ins must be 10 minutes apart. You can check in again at ${availableAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            : error.message
        );
      } else {
        Alert.alert('Could not check in', error.message || 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const askTeamUp = (suggestion: { membership_id: number; name: string }) =>
    Alert.alert('Were you with ' + suggestion.name + '?', 'Team up for today: your check-ins and new leads count for both of you, and you agree how to split the commission.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, team up',
        onPress: async () => {
          try {
            const teamUp = (await teamUpApi.ask(suggestion.membership_id, 'suggested')).data.data;
            teamUpStore.apply(teamUp);
            // They asked first: already teamed up. Otherwise wait for their yes on the Team up screen.
            if (teamUp.status === 'active') teamUpStore.openSplit(teamUp.id);
            else router.push('/(app)/team-up');
          } catch (err) {
            Alert.alert('Team up', apiErrorMessage(err, 'Could not ask.'));
          }
        },
      },
    ]);

  const venueList = search.length >= 2 ? results : nearby;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>Check in</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Where */}
        {teamUp && !planLater && (
          <View style={[styles.teamChip, { backgroundColor: colors.primary + '1A' }]}>
            <Ionicons name="people" size={16} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>With {teamUp.partner?.name}: counts for both of you</Text>
          </View>
        )}

        <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Where are you?</Text>

        {venue ? (
          <View style={[styles.selectedVenue, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Ionicons name={toIconName(venue.type?.icon, 'business-outline')} size={24} color={venue.type?.color || colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{venue.name}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                {[venue.address, venue.city].filter(Boolean).join(', ')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setVenue(null)}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
              <TextInput
                style={[typography.body1, { flex: 1, color: colors.foreground }]}
                placeholder="Search pharmacies"
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={handleSearch}
              />
              {searching && <ActivityIndicator color={colors.primary} />}
            </View>

            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              {search.length >= 2 ? 'Results' : locating ? 'Finding places near you…' : fix ? 'Near you' : 'Turn on location to see places near you'}
            </Text>

            {venueList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.venueRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setVenue(item)}
              >
                <Ionicons name={toIconName(item.type?.icon, 'business-outline')} size={20} color={item.type?.color || colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {[item.address, item.city].filter(Boolean).join(', ')}
                  </Text>
                </View>
                {item.distance != null && (
                  <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                    {item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.addVenue, { borderColor: colors.primary }]} onPress={() => setShowCreate(true)}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[typography.body2, { color: colors.primary, fontWeight: '600' }]}>Not listed? Add this pharmacy</Text>
            </TouchableOpacity>
          </>
        )}

        {/* GPS */}
        <View style={[styles.gps, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name={fix ? 'navigate' : 'navigate-outline'} size={18} color={fix ? colors.success : colors.mutedForeground} />
          <Text style={[typography.caption, { flex: 1, color: colors.foreground }]}>
            {locating
              ? 'Getting your location…'
              : fix
                ? `Location captured${fix.accuracy != null ? ` (±${Math.round(fix.accuracy)} m)` : ''}${distance != null ? ` • ${distance} m from the shop` : ''}`
                : 'No location yet'}
          </Text>
          <TouchableOpacity onPress={locate} disabled={locating}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {distance != null && distance > FAR_FROM_VENUE_M && !planLater && (
          <Text style={[typography.caption, { color: colors.warning }]}>
            You seem to be {distance} m away from this pharmacy. Check you picked the right one.
          </Text>
        )}

        {/* When */}
        <View style={[styles.planRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Plan for later</Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              {planLater ? plannedFor.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Off: checking in now'}
            </Text>
          </View>
          {planLater && (
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ marginRight: 8 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Change</Text>
            </TouchableOpacity>
          )}
          <Switch value={planLater} onValueChange={setPlanLater} trackColor={{ false: colors.border, true: colors.primary }} />
        </View>

        {/* What was pitched: one visit per ticked program (only shown with more than one program) */}
        {!planLater && programs.length > 1 && (
          <>
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Pitching here</Text>
            <View style={styles.programChips}>
              {programs.map((program) => {
                const on = ticked.includes(program.id);
                return (
                  <TouchableOpacity
                    key={program.id}
                    onPress={() => toggleProgram(program.id)}
                    style={[styles.programChip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '1A' : colors.card }]}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18} color={on ? colors.primary : colors.mutedForeground} />
                    <Text style={[typography.body2, { color: colors.foreground, fontWeight: on ? '700' : '400' }]}>{program.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Materials */}
        {!planLater && (
          <>
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>
              Materials left here{totalItems > 0 ? ` (${totalItems})` : ''}
            </Text>
            <MaterialPicker materials={shownMaterials} activeProgramId={activeProgramId} quantities={quantities} onChange={setQuantities} />
            {totalItems > 0 && (
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Received by (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={receivedBy}
                onChangeText={setReceivedBy}
              />
            )}
          </>
        )}

        {/* Pitch kits of the ticked programs, right here instead of a trip back to the dashboard */}
        {!planLater &&
          ticked.map((programId) => (
            <PitchKitCard key={programId} programId={programId} programName={programs.find((p) => p.id === programId)?.name ?? 'Program'} />
          ))}

        {!planLater && (
          <>
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Proof of visit</Text>
            <PhotoCapture photo={photo} onChange={setPhoto} />
            <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Voice memo</Text>
            <VoiceMemo memo={memo} onChange={setMemo} />
          </>
        )}

        {/* Notes */}
        <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notes, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="What happened? Who did you meet? Next steps?"
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.submit, { backgroundColor: colors.primary }, (!venue || submitting) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!venue || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[typography.button, { color: colors.primaryForeground }]}>
              {planLater ? 'Plan visit' : totalItems > 0 ? `Check in & leave ${totalItems} item${totalItems > 1 ? 's' : ''}` : 'Check in'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={showPicker}
        mode="datetime"
        date={plannedFor}
        minimumDate={new Date()}
        onConfirm={(date) => {
          setPlannedFor(date);
          setShowPicker(false);
        }}
        onCancel={() => setShowPicker(false)}
      />

      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.headerSide}>
              <Ionicons name="close" size={26} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>Add a pharmacy</Text>
            <View style={styles.headerSide} />
          </View>
          <VenueForm
            submitLabel="Add and check in here"
            onSaved={(created, pending) => {
              // Offline: the new place is usable right away with a temporary id
              setVenue(created ?? pending ?? null);
              setShowCreate(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    headerSide: { width: 40 },
    body: { padding: 16, gap: 10, paddingBottom: 120 },
    sectionTitle: { fontWeight: '600', marginTop: 8 },
    programChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    programChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
    teamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
    selectedVenue: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 2 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    venueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
    addVenue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed' },
    gps: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 6 },
    planRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
    notes: { minHeight: 90, textAlignVertical: 'top' },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, borderTopWidth: 1 },
    submit: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  });
