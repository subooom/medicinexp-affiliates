// src/components/visits/material-picker.tsx
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { MaterialWithStock } from '@/types/models';
import { toIconName } from '@/utils/icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MaterialPickerProps {
  // Materials in the MR's bag (GET /materials?in_bag=1)
  materials: MaterialWithStock[];
  // material_id -> quantity being left at this venue
  quantities: Record<number, number>;
  onChange: (quantities: Record<number, number>) => void;
}

const STEPS = [1, 2, 5];

/**
 * What the MR leaves at a venue during check-in. Each material is capped by what's
 * in their bag and the program's per-visit limit.
 */
export function MaterialPicker({ materials, quantities, onChange }: MaterialPickerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [infoFor, setInfoFor] = useState<MaterialWithStock | null>(null);
  const multiProgram = new Set(materials.map((m) => m.program_id)).size > 1;

  const limitOf = (material: MaterialWithStock) =>
    material.max_per_venue ? Math.min(material.in_bag, material.max_per_venue) : material.in_bag;

  const setQuantity = (material: MaterialWithStock, quantity: number) => {
    const next = { ...quantities };
    const clamped = Math.max(0, Math.min(limitOf(material), quantity));
    if (clamped === 0) {
      delete next[material.id];
    } else {
      next[material.id] = clamped;
    }
    onChange(next);
  };

  if (materials.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.border }]}>
        <Ionicons name="bag-handle-outline" size={28} color={colors.mutedForeground} />
        <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>
          Your bag is empty. Pick up materials from your program to leave them at pharmacies.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {materials.map((material, index) => {
        const quantity = quantities[material.id] ?? 0;
        // Program heading when the bag holds more than one program's materials
        const showProgram = multiProgram && material.program_id !== materials[index - 1]?.program_id;
        const limit = limitOf(material);
        const typeColor = material.type?.color || colors.primary;

        return (
          <View key={material.id} style={{ gap: 8 }}>
          {showProgram && (
            <Text style={[typography.overline, { color: colors.primary, marginTop: index > 0 ? 8 : 0 }]}>{material.program_name ?? 'Program'}</Text>
          )}
          <View
            style={[styles.row, { backgroundColor: colors.card, borderColor: quantity > 0 ? colors.primary : colors.border }]}
          >
            <TouchableOpacity style={styles.info} onPress={() => setInfoFor(material)}>
              {material.image_url ? (
                <Image source={{ uri: material.image_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: typeColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name={toIconName(material.type?.icon, 'cube-outline')} size={22} color={typeColor} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]} numberOfLines={1}>
                  {material.name}
                </Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {material.in_bag} in bag{material.max_per_venue ? ` • max ${material.max_per_venue} per visit` : ''}
                </Text>
              </View>
              <Ionicons name="information-circle-outline" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.stepButton, { borderColor: colors.border }]}
                onPress={() => setQuantity(material, quantity - 1)}
                disabled={quantity === 0}
              >
                <Ionicons name="remove" size={18} color={quantity === 0 ? colors.mutedForeground : colors.foreground} />
              </TouchableOpacity>
              <Text style={[typography.h5, styles.quantity, { color: colors.foreground }]}>{quantity}</Text>
              {STEPS.map((step) => (
                <TouchableOpacity
                  key={step}
                  style={[styles.stepButton, { borderColor: colors.primary, opacity: quantity >= limit ? 0.4 : 1 }]}
                  onPress={() => setQuantity(material, quantity + step)}
                  disabled={quantity >= limit}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>+{step}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          </View>
        );
      })}

      <Modal visible={!!infoFor} transparent animationType="slide" onRequestClose={() => setInfoFor(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setInfoFor(null)}>
          {infoFor && (
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              {infoFor.image_url ? <Image source={{ uri: infoFor.image_url }} style={styles.hero} resizeMode="cover" /> : null}
              <Text style={[typography.h4, { color: colors.foreground }]}>{infoFor.name}</Text>
              {infoFor.description ? (
                <Text style={[typography.body2, { color: colors.mutedForeground }]}>{infoFor.description}</Text>
              ) : null}
              <View style={styles.statsRow}>
                <Stat label="In your bag" value={infoFor.in_bag} colors={colors} />
                <Stat label="You've left" value={infoFor.total_dropped_off} colors={colors} />
                <Stat label="Max per visit" value={infoFor.max_per_venue ?? '—'} colors={colors} />
              </View>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', marginTop: 8 }]}>Where you left it</Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {infoFor.recent_dropoffs.length === 0 ? (
                  <Text style={[typography.body2, { color: colors.mutedForeground }]}>Not dropped off anywhere yet</Text>
                ) : (
                  infoFor.recent_dropoffs.map((dropoff) => (
                    <View key={dropoff.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                      <Text style={[typography.body2, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                        {dropoff.venue?.name ?? 'Unknown'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                        {dropoff.quantity} • {new Date(dropoff.occurred_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: number | string; colors: AppColors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[typography.h5, { color: colors.foreground }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    list: { gap: 10 },
    empty: { alignItems: 'center', gap: 8, padding: 20, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12 },
    row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
    info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    thumb: { width: 44, height: 44, borderRadius: 8 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepButton: { minWidth: 40, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    quantity: { minWidth: 28, textAlign: 'center', fontWeight: '700' },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32, gap: 8 },
    hero: { width: '100%', height: 160, borderRadius: 12 },
    statsRow: { flexDirection: 'row', marginTop: 8 },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  });
