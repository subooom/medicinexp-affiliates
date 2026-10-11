// app/(app)/pickups/[id].tsx — one request: when and where to collect, "I'm here"
import { pickupApi } from '@/api/pickups';
import { Badge, Button, Card, EmptyState, ScreenHeader, SectionTitle, formatDateTime } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Pickup } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openMaps } from '@/utils/maps';
import { pickupStatus } from '@/utils/pickups';

export default function PickupDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPickup((await pickupApi.getById(Number(id))).data.data);
    } catch {
      // Shown as not found
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: 'arrived' | 'cancel') => {
    setBusy(true);
    try {
      const response = action === 'arrived' ? await pickupApi.arrived(Number(id)) : await pickupApi.cancel(Number(id));
      setPickup(response.data.data);
      if (action === 'arrived') Alert.alert('They know you are here', 'Someone will hand over your materials.');
    } catch (error: any) {
      Alert.alert('Could not update', error.status ? error.message : 'You need internet for this.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Pickup" />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      </View>
    );
  }
  if (!pickup) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Pickup" />
        <EmptyState icon="cube-outline" title="Not found" />
      </View>
    );
  }

  const status = pickupStatus[pickup.status];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Pickup" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Badge label={status.label} tone={status.tone} />

        {pickup.status === 'approved' && (
          <Card style={{ gap: 8 }}>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{formatDateTime(pickup.pickup_at)}</Text>
            </View>
            {pickup.hub && (
              <View style={styles.row}>
                <Ionicons name="business-outline" size={20} color={colors.primary} />
                <Text style={[typography.body1, { color: colors.foreground, flex: 1 }]}>
                  {pickup.hub.name}
                  {pickup.hub.address ? `\n${pickup.hub.address}` : ''}
                </Text>
              </View>
            )}
            {!!pickup.pickup_location_note && <Text style={[typography.body2, { color: colors.mutedForeground }]}>{pickup.pickup_location_note}</Text>}
            {pickup.hub?.latitude != null && (
              <Button title="Directions" variant="outline" icon="navigate-outline" onPress={() => openMaps(pickup.hub!.latitude, pickup.hub!.longitude, pickup.hub!.name)} />
            )}
            {pickup.mr_arrived_at ? (
              <Badge label={`You arrived ${new Date(pickup.mr_arrived_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`} tone="success" />
            ) : (
              <Button title="I'm here" icon="location" onPress={() => act('arrived')} loading={busy} />
            )}
          </Card>
        )}

        {pickup.status === 'rejected' && !!pickup.rejection_reason && (
          <Card>
            <Text style={[typography.body2, { color: colors.destructive }]}>{pickup.rejection_reason}</Text>
          </Card>
        )}

        <SectionTitle>Items</SectionTitle>
        <Card style={{ gap: 10 }}>
          {pickup.items.map((item) => (
            <View key={item.material_id} style={styles.row}>
              <Text style={[typography.body1, { color: colors.foreground, flex: 1 }]}>{item.material_name}</Text>
              <Text style={[typography.body2, { color: colors.mutedForeground }]}>
                {item.quantity_handed_over != null
                  ? `${item.quantity_handed_over} received`
                  : item.quantity_approved != null
                    ? `${item.quantity_approved} of ${item.quantity_requested}`
                    : `${item.quantity_requested} asked`}
              </Text>
            </View>
          ))}
        </Card>
        {!!pickup.notes && <Text style={[typography.body2, { color: colors.mutedForeground }]}>Your note: {pickup.notes}</Text>}

        {(pickup.status === 'requested' || pickup.status === 'approved') && (
          <Button
            title="Cancel request"
            variant="ghost"
            onPress={() => Alert.alert('Cancel this request?', undefined, [{ text: 'No' }, { text: 'Yes, cancel', style: 'destructive', onPress: () => act('cancel') }])}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
