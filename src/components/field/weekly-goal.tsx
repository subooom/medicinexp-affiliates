// src/components/field/weekly-goal.tsx — the card that brings reps back every day:
// this week's score, the bonus waiting on their next sale, time left before the cutoff,
// their streak and what the next tier pays. Also shows a "you did it" moment once for
// each new sale and tier.
import { fieldApi } from '@/api/field';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { ActivityState } from '@/types/models';
import { formatPaisa } from '@/utils/money';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SEEN_KEY = 'celebrated:v1';

type Celebration = { title: string; body: string; icon: 'trophy' | 'sparkles' };

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closing now';
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} left`;
}

const weekday = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'long' });

export function WeeklyGoal({ refreshKey }: { refreshKey?: number }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [state, setState] = useState<ActivityState | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const celebrate = useCallback(async (next: ActivityState) => {
    try {
      const seen = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) || '{}');
      const firstLook = seen.tier === undefined && seen.sale === undefined;
      const updates: Record<string, number> = { tier: next.tier?.level ?? 0, sale: next.latest_sale?.commission_id ?? 0 };

      // First time on this phone: remember where they are without throwing a party
      if (!firstLook) {
        if (next.tier && next.tier.level > (seen.tier ?? 0)) {
          setCelebration({
            title: `You reached ${next.tier.name}!`,
            body: `You now earn ${next.tier.rates[0]}% on every new pharmacy, and you have ${next.codes_unlocked} codes.`,
            icon: 'trophy',
          });
        } else if (next.latest_sale && next.latest_sale.commission_id > (seen.sale ?? 0)) {
          setCelebration({
            title: 'New pharmacy signed!',
            body: `${next.latest_sale.pharmacy ?? 'A pharmacy'} · +${formatPaisa(next.latest_sale.amount_paisa)}`,
            icon: 'sparkles',
          });
        }
      }
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(updates));
    } catch {
      // Just a nice-to-have
    }
  }, []);

  useEffect(() => {
    fieldApi
      .getActivity()
      .then((response) => {
        setState(response.data.data);
        celebrate(response.data.data);
      })
      .catch(() => undefined);
  }, [refreshKey, celebrate]);

  if (!state) return null;

  // No tier yet: the one thing to do is log a lead
  if (!state.tier) {
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={() => router.push('/(app)/leads/create', { withAnchor: true })}>
        <View style={styles.row}>
          <Ionicons name="lock-open-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700' }]}>Log your first lead</Text>
            <Text style={[typography.body2, { color: colors.mutedForeground }]}>
              It unlocks your code and {state.next_tier ? `${state.next_tier.rates[0]}% commission` : 'your commission'}.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  }

  const progress = Math.min(1, state.score / Math.max(1, state.target));
  const noSaleYet = state.sales_count === 0;

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: noSaleYet && state.score > 0 ? '#F59E0B' : colors.border }]}>
        <View style={styles.row}>
          <Text style={[typography.overline, { color: colors.mutedForeground, flex: 1 }]}>This week</Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Close by {weekday(state.cutoff_at)} · {timeLeft(state.cutoff_at)}</Text>
        </View>

        {noSaleYet ? (
          <Text style={[typography.h5, { color: colors.foreground, fontWeight: '700' }]}>
            {state.bonus_per_sale_paisa > 0
              ? `${formatPaisa(state.bonus_per_sale_paisa)} bonus waiting. Close a sale to unlock it.`
              : 'Visit, call and log leads to build your bonus.'}
          </Text>
        ) : (
          <Text style={[typography.h5, { color: colors.foreground, fontWeight: '700' }]}>
            {state.sales_count} sale{state.sales_count > 1 ? 's' : ''} this week · {formatPaisa(state.bonus_so_far_paisa)} bonus so far
          </Text>
        )}

        <View style={{ gap: 4 }}>
          <View style={[styles.bar, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {state.score} / {state.target} points · {state.counts.visit} visits, {state.counts.lead} leads, {state.counts.call} calls
            {progress < 1 ? ' · more points = bigger bonus' : ' · full bonus!'}
          </Text>
        </View>

        <View style={styles.row}>
          {state.streak_weeks > 0 && (
            <View style={[styles.pill, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="flame" size={14} color="#B45309" />
              <Text style={[typography.caption, { color: '#92400E', fontWeight: '700' }]}>
                {state.streak_weeks}-week streak{state.multiplier_bp > 0 ? ` · +${state.multiplier_bp / 100}%` : ''}
              </Text>
            </View>
          )}
          {state.next_tier && (
            <TouchableOpacity style={[styles.pill, { backgroundColor: colors.primary + '12' }]} onPress={() => router.push('/(app)/tiers')}>
              <Ionicons name="trending-up" size={14} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                {state.next_tier.name}: {state.next_tier.rates[0]}%{state.next_tier.progress ? ` · ${state.next_tier.progress.percent}% there` : ''}
              </Text>
            </TouchableOpacity>
          )}
          {state.leaderboard_enabled && (
            <TouchableOpacity style={[styles.pill, { backgroundColor: colors.primary + '12' }]} onPress={() => router.push('/(app)/leaderboard' as any)}>
              <Ionicons name="podium-outline" size={14} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>Leaderboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={!!celebration} transparent animationType="fade" onRequestClose={() => setCelebration(null)}>
        <Pressable style={styles.overlay} onPress={() => setCelebration(null)}>
          {celebration && (
            <View style={[styles.party, { backgroundColor: colors.card }]}>
              <View style={[styles.partyIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name={celebration.icon} size={44} color="#fff" />
              </View>
              <Text style={[typography.h4, { color: colors.foreground, fontWeight: '800', textAlign: 'center' }]}>{celebration.title}</Text>
              <Text style={[typography.body1, { color: colors.mutedForeground, textAlign: 'center' }]}>{celebration.body}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>Tap to continue</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  party: { borderRadius: 24, padding: 28, gap: 12, alignItems: 'center', width: '100%', maxWidth: 360 },
  partyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
