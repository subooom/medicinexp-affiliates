// app/(app)/venues/[id].tsx
import { useCallLogger } from '@/hooks/use-call-logger';
import { venueApi } from '@/api/venues';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog, Dropoff, Venue, VenueStats, Visit } from '@/types/models';
import { toIconName } from '@/utils/icons';
import { getCallStatusColor, getVisitStatusColor } from '@/utils/status-colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VenueDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const venueId = parseInt(id);

  const [venue, setVenue] = useState<Venue | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, visitPage, dropoffPage, callPage] = await Promise.all([
        venueApi.getById(venueId),
        venueApi.getVisits(venueId),
        venueApi.getDropoffs(venueId),
        venueApi.getCallLogs(venueId),
      ]);
      setVenue(detail.data.data.venue);
      setStats(detail.data.data.stats);
      setVisits(visitPage.data.data.data);
      setDropoffs(dropoffPage.data.data.data);
      setCallLogs(callPage.data.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not load this place');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Tap to call, then one tap to log it when back in the app
  const logger = useCallLogger(load);

  const handleDelete = () => {
    Alert.alert('Delete this place?', 'You can only delete places with no visits, leads, calls or drop-offs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await venueApi.delete(venueId);
            router.back();
          } catch (err: any) {
            Alert.alert('Could not delete', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>{error || 'Place not found'}</Text>
      </View>
    );
  }

  const typeColor = venue.type?.color || colors.primary;
  const statItems = [
    { label: 'Visits', value: stats?.my_visits ?? 0, icon: 'location-outline' as const },
    { label: 'Dropped off', value: stats?.my_dropoffs ?? 0, icon: 'cube-outline' as const },
    { label: 'Calls', value: stats?.my_call_logs ?? 0, icon: 'call-outline' as const },
    { label: 'Open leads', value: stats?.my_open_leads ?? 0, icon: 'people-outline' as const },
  ];
  const actions = [
    {
      label: 'Check in',
      icon: 'log-in-outline' as const,
      onPress: () => router.push({ pathname: '/(app)/visits/checkin', params: { venueId: venue.id } }),
    },
    {
      label: 'Log call',
      icon: 'call-outline' as const,
      onPress: () => router.push({ pathname: '/(app)/call-logs/create', params: { venueId: venue.id } }),
    },
    {
      label: 'Add lead',
      icon: 'person-add-outline' as const,
      onPress: () => router.push({ pathname: '/(app)/leads/create', params: { venueId: venue.id } }, { withAnchor: true }),
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={[styles.iconContainer, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={toIconName(venue.type?.icon, 'business-outline')} size={30} color={typeColor} />
          </View>
          {venue.can_edit && (
            <View style={styles.ownerActions}>
              <TouchableOpacity
                style={[styles.smallButton, { borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/(app)/venues/edit/[id]', params: { id: venue.id } })}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallButton, { borderColor: colors.border }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[typography.h3, styles.name, { color: colors.foreground }]}>{venue.name}</Text>
        <View style={styles.badges}>
          {venue.type && (
            <View style={[styles.badge, { backgroundColor: typeColor + '15' }]}>
              <Text style={[typography.caption, { color: typeColor }]}>{venue.type.name}</Text>
            </View>
          )}
          {venue.is_customer && (
            <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
              <Text style={[typography.caption, { color: '#10B981', fontWeight: '600' }]}>MedicineXP customer</Text>
            </View>
          )}
        </View>
        <Text style={[typography.body2, { color: colors.mutedForeground }]}>
          {[venue.address, venue.city, venue.district].filter(Boolean).join(', ')}
        </Text>

        {venue.phone && (
          <TouchableOpacity style={styles.phoneRow} onPress={() => logger.call({ phone: venue.phone!, name: venue.name, venueId: venue.id })}>
            <Ionicons name="call" size={16} color={colors.primary} />
            <Text style={[typography.body2, { color: colors.primary }]}>{venue.phone}</Text>
          </TouchableOpacity>
        )}
        {venue.latitude == null && (
          <Text style={[typography.caption, { color: colors.warning }]}>
            No map pin yet{venue.can_edit ? ': edit and use your location while at the shop.' : '.'}
          </Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={action.onPress}
          >
            <Ionicons name={action.icon} size={18} color={colors.primaryForeground} />
            <Text style={[typography.caption, { color: colors.primaryForeground, fontWeight: '600' }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsRow}>
        {statItems.map((item) => (
          <View key={item.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
            <Text style={[typography.h4, { color: colors.foreground }]}>{item.value}</Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Section title="Your visits" empty="No visits here yet" colors={colors}>
        {visits.slice(0, 5).map((visit) => (
          <Row
            key={visit.id}
            colors={colors}
            title={new Date(visit.visited_at).toLocaleString()}
            subtitle={visit.notes || undefined}
            badge={visit.status}
            badgeColor={getVisitStatusColor(colors, visit.status)}
            onPress={() => router.push({ pathname: '/(app)/visits/[id]', params: { id: visit.id } })}
          />
        ))}
      </Section>

      <Section title="Materials you left here" empty="Nothing dropped off yet" colors={colors}>
        {dropoffs.slice(0, 5).map((dropoff) => (
          <Row
            key={dropoff.id}
            colors={colors}
            title={`${dropoff.quantity} × ${dropoff.material?.name ?? 'Material'}`}
            subtitle={new Date(dropoff.occurred_at).toLocaleDateString()}
          />
        ))}
      </Section>

      <Section title="Your calls" empty="No calls logged" colors={colors}>
        {callLogs.slice(0, 5).map((call) => (
          <Row
            key={call.id}
            colors={colors}
            title={call.notes || (call.direction === 'incoming' ? 'Incoming call' : 'Outgoing call')}
            subtitle={`${call.call_date} • ${call.call_time.slice(0, 5)}`}
            badge={call.status}
            badgeColor={getCallStatusColor(colors, call.status)}
            onPress={() => router.push({ pathname: '/(app)/call-logs/[id]', params: { id: call.id } })}
          />
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({ title, empty, colors, children }: { title: string; empty: string; colors: AppColors; children: React.ReactNode[] }) {
  return (
    <View style={[sectionStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', marginBottom: 6 }]}>{title}</Text>
      {children.length > 0 ? children : <Text style={[typography.body2, { color: colors.mutedForeground }]}>{empty}</Text>}
    </View>
  );
}

function Row(props: { title: string; subtitle?: string; badge?: string; badgeColor?: string; colors: AppColors; onPress?: () => void }) {
  const { title, subtitle, badge, badgeColor, colors, onPress } = props;
  return (
    <TouchableOpacity style={[sectionStyles.row, { borderTopColor: colors.border }]} onPress={onPress} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body2, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      {badge && badgeColor ? (
        <View style={[sectionStyles.badge, { backgroundColor: badgeColor + '15' }]}>
          <Text style={[typography.caption, { color: badgeColor, textTransform: 'capitalize' }]}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const sectionStyles = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    iconContainer: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    ownerActions: { flexDirection: 'row', gap: 8 },
    smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    name: { fontWeight: '700' },
    badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    actionsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
    statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 2 },
  });
