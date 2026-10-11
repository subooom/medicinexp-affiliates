// app/(app)/tiers/index.tsx
import { tierApi } from '@/api/tiers';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CurrentTier, Tier } from '@/types/models';
import { toIconName } from '@/utils/icons';
import { describeSchedule, requirementLabel } from '@/utils/tiers';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TiersScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [current, setCurrent] = useState<CurrentTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, mine] = await Promise.all([tierApi.getAll(), tierApi.getCurrent()]);
      setTiers(list.data.data.tiers);
      setCurrent(mine.data.data);
    } catch (error) {
      console.error('Error loading tiers:', error);
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

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const myTier = current?.current_tier ?? null;
  const progress = current?.progress ?? null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Where you are */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: myTier?.color || colors.primary }]}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Your tier</Text>
        <Text style={[typography.h3, { color: colors.foreground, fontWeight: '700' }]}>{myTier?.name ?? 'Not assigned yet'}</Text>
        <Text style={[typography.body2, { color: colors.foreground }]}>
          {current && current.commission_schedule.length > 0
            ? `Your commission: ${describeSchedule(current.commission_schedule)}`
            : 'No commission set yet. Your program adds it for you.'}
        </Text>

        {progress ? (
          <View style={{ gap: 6, marginTop: 8 }}>
            <View style={styles.progressHeader}>
              <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Next: {progress.next_tier.name}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>{progress.percent}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${progress.percent}%`, backgroundColor: colors.primary }]} />
            </View>
            {Object.entries(progress.requirements).map(([key, requirement]) => (
              <View key={key} style={styles.requirementRow}>
                <Ionicons
                  name={requirement.met ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={requirement.met ? colors.success : colors.mutedForeground}
                />
                <Text style={[typography.body2, { color: colors.foreground }]}>
                  {Math.min(requirement.current, requirement.required)} / {requirement.required} {requirementLabel(key)}
                </Text>
              </View>
            ))}
          </View>
        ) : myTier ? (
          <Text style={[typography.body2, { color: colors.success, marginTop: 8 }]}>You are at the top tier.</Text>
        ) : null}
      </View>

      <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>All tiers</Text>
      {tiers.map((tier) => {
        const isMine = tier.id === myTier?.id;
        const tierColor = tier.color || colors.primary;
        return (
          <TouchableOpacity
            key={tier.id}
            style={[styles.tierRow, { backgroundColor: colors.card, borderColor: isMine ? tierColor : colors.border }, isMine && { borderWidth: 2 }]}
            onPress={() => router.push({ pathname: '/(app)/tiers/[id]', params: { id: tier.id } })}
          >
            <View style={[styles.tierIcon, { backgroundColor: tierColor + '25' }]}>
              <Ionicons name={toIconName(tier.icon, 'medal-outline')} size={22} color={tierColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.progressHeader}>
                <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{tier.name}</Text>
                {isMine && <Text style={[typography.caption, { color: tierColor, fontWeight: '700' }]}>YOU</Text>}
              </View>
              {tier.description ? <Text style={[typography.caption, { color: colors.mutedForeground }]}>{tier.description}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { padding: 16, borderRadius: 14, borderWidth: 2, gap: 4 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4 },
    requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tierRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    tierIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
