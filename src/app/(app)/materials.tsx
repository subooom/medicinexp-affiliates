// app/(app)/materials.tsx — the program's materials and what the MR is carrying
import { materialApi } from '@/api/materials';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { MaterialWithStock } from '@/types/models';
import { toIconName } from '@/utils/icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MaterialsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await materialApi.getAll();
      setMaterials(response.data.data);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const carrying = materials.reduce((sum, material) => sum + material.in_bag, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>My materials</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="bag-handle-outline" size={24} color={colors.primary} />
            <Text style={[typography.body1, { flex: 1, color: colors.foreground }]}>
              {carrying > 0 ? `You're carrying ${carrying} item${carrying > 1 ? 's' : ''}` : 'Your bag is empty'}
            </Text>
          </View>
          {carrying === 0 && (
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Pick up materials from your program's office to leave them at pharmacies when you check in.
            </Text>
          )}

          {materials.map((material) => {
            const typeColor = material.type?.color || colors.primary;
            return (
              <View key={material.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  {material.image_url ? (
                    <Image source={{ uri: material.image_url }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: typeColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name={toIconName(material.type?.icon, 'cube-outline')} size={24} color={typeColor} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{material.name}</Text>
                    {material.description ? (
                      <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={2}>{material.description}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.stats}>
                  <Stat label="In your bag" value={material.in_bag} colors={colors} highlight={material.in_bag > 0} />
                  <Stat label="You've left" value={material.total_dropped_off} colors={colors} />
                  <Stat label="Max per visit" value={material.max_per_venue ?? '—'} colors={colors} />
                </View>
                {material.recent_dropoffs.length > 0 && (
                  <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                    Last left at {material.recent_dropoffs[0].venue?.name ?? 'a pharmacy'} on{' '}
                    {new Date(material.recent_dropoffs[0].occurred_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ label, value, colors, highlight }: { label: string; value: number | string; colors: AppColors; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[typography.h5, { color: highlight ? colors.primary : colors.foreground, fontWeight: '700' }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
    card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
    cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    thumb: { width: 52, height: 52, borderRadius: 10 },
    stats: { flexDirection: 'row' },
  });
