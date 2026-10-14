// app/(app)/meetups/[id].tsx — a meetup: reply, directions, "I'm here"
import { meetupApi } from '@/api/meetups';
import { Badge, Button, Card, EmptyState, ScreenHeader, formatDateTime } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Meetup } from '@/types/models';
import { openMaps } from '@/utils/maps';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MeetupDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMeetup((await meetupApi.getById(Number(id))).data.data);
    } catch {
      // Not found
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (call: () => Promise<{ data: { data: Meetup } }>) => {
    setBusy(true);
    try {
      setMeetup((await call()).data.data);
    } catch (error: any) {
      Alert.alert('Could not update', error.status ? error.message : 'You need internet for this.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !meetup) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Meetup" />
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : <EmptyState icon="calendar-outline" title="Not found" />}
      </View>
    );
  }

  const row = (icon: any, text: string) => (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[typography.body1, { color: colors.foreground, flex: 1 }]}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Meetup" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '700' }]}>{meetup.title}</Text>
        {meetup.status === 'requested' && <Badge label="Waiting to be scheduled" tone="warning" />}
        {meetup.status === 'cancelled' && <Badge label="Cancelled" tone="danger" />}
        {meetup.status === 'done' && <Badge label="Done" tone="success" />}

        <Card style={{ gap: 10 }}>
          {row('time-outline', meetup.starts_at ? formatDateTime(meetup.starts_at) : 'Time to be set')}
          {!!meetup.location_name && row('location-outline', [meetup.location_name, meetup.address].filter(Boolean).join('\n'))}
          {!!meetup.organizer && row('person-outline', `Organised by ${meetup.organizer}`)}
          {!!meetup.purpose && <Text style={[typography.body2, { color: colors.mutedForeground }]}>{meetup.purpose}</Text>}
          {!!meetup.cancellation_reason && <Text style={[typography.body2, { color: colors.destructive }]}>{meetup.cancellation_reason}</Text>}
          {meetup.latitude != null && (
            <Button title="Directions" variant="outline" icon="navigate-outline" onPress={() => openMaps(meetup.latitude, meetup.longitude, meetup.location_name ?? meetup.title)} />
          )}
        </Card>

        {meetup.status === 'scheduled' && !meetup.requested_by_me && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title={meetup.my_response === 'accepted' ? "I'm coming ✓" : "I'm coming"}
              variant={meetup.my_response === 'accepted' ? 'primary' : 'outline'}
              onPress={() => run(() => meetupApi.respond(meetup.id, 'accepted'))}
              style={{ flex: 1 }}
            />
            <Button
              title="Can't come"
              variant={meetup.my_response === 'declined' ? 'danger' : 'outline'}
              onPress={() => run(() => meetupApi.respond(meetup.id, 'declined'))}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {meetup.status === 'scheduled' &&
          (meetup.my_arrived_at ? (
            <Badge label={`You arrived ${new Date(meetup.my_arrived_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`} tone="success" />
          ) : (
            <Button title="I'm here" icon="location" onPress={() => run(() => meetupApi.arrived(meetup.id))} loading={busy} />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});
