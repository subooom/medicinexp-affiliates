// app/(app)/pickups/new.tsx — ask the program for materials
import { materialApi } from '@/api/materials';
import { pickupApi } from '@/api/pickups';
import { Button, Card, Field, ScreenHeader, SectionTitle } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { queuedMessage, sendOrQueue } from '@/offline/send';
import { typography } from '@/styles/typography';
import { Hub, MaterialWithStock } from '@/types/models';
import { uuidv4 } from '@/utils/uuid';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const STEP = 5;

export default function NewPickupScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [hubId, setHubId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const clientUuid = useRef(uuidv4());

  useEffect(() => {
    Promise.all([materialApi.getAll(), pickupApi.getHubs()])
      .then(([m, h]) => {
        setMaterials(m.data.data);
        setHubs(h.data.data);
        if (h.data.data.length === 1) setHubId(h.data.data[0].id);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const change = (id: number, delta: number) =>
    setQuantities((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });

  const items = Object.entries(quantities).map(([material_id, quantity]) => ({ material_id: Number(material_id), quantity }));

  const submit = async () => {
    if (items.length === 0) {
      Alert.alert('Nothing chosen', 'Add at least one material.');
      return;
    }
    setSaving(true);
    try {
      const result = await sendOrQueue({
        method: 'post',
        url: '/pickups',
        label: `Materials request (${items.reduce((sum, i) => sum + i.quantity, 0)} items)`,
        data: { items, notes: notes.trim() || undefined, hub_id: hubId, client_uuid: clientUuid.current },
      });
      Alert.alert('Request sent', result.queued ? queuedMessage : 'You will get a notification with the pickup time and place.');
      router.back();
    } catch (error: any) {
      Alert.alert('Could not send', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Ask for materials" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <SectionTitle>What do you need?</SectionTitle>
          {materials.map((material) => (
            <Card key={material.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{material.name}</Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>You have {material.in_bag} {material.unit ?? ''}</Text>
              </View>
              <TouchableOpacity onPress={() => change(material.id, -STEP)} style={[styles.step, { borderColor: colors.border }]} accessibilityLabel={`Less ${material.name}`}>
                <Ionicons name="remove" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[typography.h5, { color: colors.foreground, minWidth: 36, textAlign: 'center' }]}>{quantities[material.id] ?? 0}</Text>
              <TouchableOpacity onPress={() => change(material.id, STEP)} style={[styles.step, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]} accessibilityLabel={`More ${material.name}`}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </Card>
          ))}

          {hubs.length > 1 && (
            <>
              <SectionTitle>Where would you like to collect?</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {hubs.map((hub) => (
                  <TouchableOpacity
                    key={hub.id}
                    onPress={() => setHubId(hub.id)}
                    style={[styles.chip, { borderColor: hubId === hub.id ? colors.primary : colors.border, backgroundColor: hubId === hub.id ? colors.primary + '15' : colors.card }]}
                  >
                    <Text style={[typography.body2, { color: hubId === hub.id ? colors.primary : colors.foreground, fontWeight: '600' }]}>{hub.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Field label="Note (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. Need them before Sunday's route" multiline />
          <Button title="Send request" icon="send" onPress={submit} loading={saving} disabled={items.length === 0} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
});
