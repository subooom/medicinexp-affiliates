// app/(app)/tiers/[id].tsx
import { tierApi } from '@/api/tiers';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Tier } from '@/types/models';
import { toIconName } from '@/utils/icons';
import { formatRate } from '@/utils/money';
import { requirementLabel } from '@/utils/tiers';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TierDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tier, setTier] = useState<(Tier & { is_current: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tierApi
      .getById(parseInt(id))
      .then((response) => setTier(response.data.data))
      .catch((err) => setError(err.message || 'Could not load this tier'));
  }, [id]);

  if (!tier) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        {error ? <Text style={[typography.body1, { color: colors.mutedForeground }]}>{error}</Text> : <ActivityIndicator size="large" color={colors.primary} />}
      </View>
    );
  }

  const tierColor = tier.color || colors.primary;
  const schedule = [...tier.commission_schedule].sort((a, b) => a.from_year - b.from_year);
  const requirements = Object.entries(tier.requirements).filter(([, value]) => value > 0);
  const couponCount = tier.perks?.coupon_count;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: tierColor, alignItems: 'center' }]}>
        <View style={[styles.icon, { backgroundColor: tierColor + '25' }]}>
          <Ionicons name={toIconName(tier.icon, 'medal-outline')} size={36} color={tierColor} />
        </View>
        <Text style={[typography.h3, { color: colors.foreground, fontWeight: '700' }]}>{tier.name}</Text>
        {tier.is_current && <Text style={[typography.caption, { color: tierColor, fontWeight: '700' }]}>YOUR TIER</Text>}
        {tier.description ? <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>{tier.description}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.body1, styles.title, { color: colors.foreground }]}>What you earn</Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          A share of each yearly subscription a pharmacy you signed up pays.
        </Text>
        {schedule.map((entry, index) => {
          const next = schedule[index + 1];
          const years = next
            ? next.from_year - 1 === entry.from_year
              ? `Year ${entry.from_year}`
              : `Years ${entry.from_year}–${next.from_year - 1}`
            : `Year ${entry.from_year} onwards`;
          return (
            <View key={entry.from_year} style={styles.row}>
              <Text style={[typography.body2, { color: colors.foreground, flex: 1 }]}>{years}</Text>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700' }]}>{formatRate(entry.rate_bp)}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.body1, styles.title, { color: colors.foreground }]}>How to reach it</Text>
        {requirements.length === 0 ? (
          <Text style={[typography.body2, { color: colors.mutedForeground }]}>Everyone starts here.</Text>
        ) : (
          requirements.map(([key, value]) => (
            <View key={key} style={styles.row}>
              <Ionicons name="flag-outline" size={16} color={colors.primary} />
              <Text style={[typography.body2, { color: colors.foreground }]}>{value} {requirementLabel(key)}</Text>
            </View>
          ))
        )}
      </View>

      {couponCount ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.body1, styles.title, { color: colors.foreground }]}>Perks</Text>
          <View style={styles.row}>
            <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
            <Text style={[typography.body2, { color: colors.foreground }]}>
              {couponCount} discount coupon{couponCount > 1 ? 's' : ''} to offer pharmacies
            </Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});
