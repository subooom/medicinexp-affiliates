// app/(app)/commissions/index.tsx (Earnings tab)
import { EARN_SEEN_KEY, earningsApi } from '@/api/earnings';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Commission, EarningsSummary, Payout } from '@/types/models';
import { formatPaisa, formatRate } from '@/utils/money';
import { getCommissionStatusColor } from '@/utils/status-colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Tab = 'commissions' | 'payments';

const COMMISSION_STATUS_LABEL: Record<Commission['status'], string> = {
  held: 'On hold',
  pending: 'Verifying',
  approved: 'Next payout',
  paid: 'Paid',
  void: 'Void',
};

const commissionTitle = (commission: Commission) => {
  switch (commission.kind) {
    case 'sale':
      return commission.pharmacy_name
        ? `${commission.pharmacy_name}${commission.subscription_year ? `, year ${commission.subscription_year}` : ''}`
        : 'Pharmacy subscription';
    case 'signup_bonus':
      return 'Sign-up bonus';
    case 'custom_bonus':
      return commission.reason || 'Bonus';
    default:
      return commission.reason || 'Adjustment';
  }
};

const payoutDayLabel = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `${date.toLocaleDateString([], { weekday: 'long' })}, ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
};

export default function EarningsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tab, setTab] = useState<Tab>('commissions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // "New here? See how you earn" until the rep has opened that screen or hidden this
  const [showIntro, setShowIntro] = useState(false);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(EARN_SEEN_KEY).then((seen) => setShowIntro(!seen)).catch(() => undefined);
    }, [])
  );
  const dismissIntro = () => {
    setShowIntro(false);
    AsyncStorage.setItem(EARN_SEEN_KEY, '1').catch(() => undefined);
  };

  const load = useCallback(async () => {
    try {
      const [summaryResponse, commissionsResponse, payoutsResponse] = await Promise.all([
        earningsApi.getSummary(),
        earningsApi.getCommissions({ per_page: 50 }),
        earningsApi.getPayouts({ per_page: 50 }),
      ]);
      setSummary(summaryResponse.data.data);
      setCommissions(commissionsResponse.data.data.data);
      setPayouts(payoutsResponse.data.data.data);
    } catch (error) {
      console.error('Error loading earnings:', error);
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={styles.titleRow}>
        <Text style={[typography.h3, { color: colors.foreground, fontWeight: '700', flex: 1 }]}>Earnings</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/earn')} style={[styles.howLink, { borderColor: colors.primary }]}>
          <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>How you earn</Text>
        </TouchableOpacity>
      </View>

      {/* First visits: point new reps at the explanation until they've opened it once */}
      {showIntro && (
        <TouchableOpacity onPress={() => router.push('/(app)/earn')} style={[styles.intro, { backgroundColor: colors.secondary + '1A', borderColor: colors.secondary + '55' }]}>
          <Ionicons name="bulb-outline" size={22} color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body2, { color: colors.foreground, fontWeight: '700' }]}>New here? See how you earn</Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>Every way to earn, with your own numbers. One minute.</Text>
          </View>
          <TouchableOpacity onPress={dismissIntro} hitSlop={10} accessibilityLabel="Hide">
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {summary && (
        <>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <Text style={[typography.caption, styles.heroLabel]}>Earned this week</Text>
            <Text style={styles.heroValue}>{formatPaisa(summary.this_week_paisa)}</Text>
            <View style={styles.heroDivider} />
            <Text style={[typography.body2, styles.heroText]}>
              {summary.next_payout_paisa > 0
                ? `${formatPaisa(summary.next_payout_paisa)} will be paid ${payoutDayLabel(summary.next_payout_date)}`
                : `Next payout: ${payoutDayLabel(summary.next_payout_date)}`}
            </Text>
            {!!summary.cutoff_at && (
              <Text style={[typography.caption, styles.heroText]}>
                Sales by {new Date(summary.cutoff_at).toLocaleDateString([], { weekday: 'long' })} night are paid that day
                {summary.later_payout_paisa > 0 ? ` · ${formatPaisa(summary.later_payout_paisa)} goes in the payout after` : ''}
              </Text>
            )}
          </View>

          {summary.payout_delayed && (
            <View style={[styles.notice, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
              <Ionicons name="time-outline" size={18} color={colors.warning} />
              <Text style={[typography.body2, { flex: 1, color: colors.foreground }]}>
                This week's payout is delayed{summary.delay_reason ? `: ${summary.delay_reason}` : ''}.
              </Text>
            </View>
          )}

          <View style={styles.tiles}>
            <Tile label="Lifetime" value={formatPaisa(summary.lifetime_paisa)} colors={colors} />
            <Tile label="Paid to you" value={formatPaisa(summary.paid_paisa)} colors={colors} />
            <Tile label="Being verified" value={formatPaisa(summary.pending_paisa)} colors={colors} />
            {summary.held_bonus_paisa > 0 && (
              <Tile label="Bonus on first sale" value={formatPaisa(summary.held_bonus_paisa)} colors={colors} />
            )}
          </View>
        </>
      )}

      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['commissions', 'payments'] as Tab[]).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.tab, tab === value && { backgroundColor: colors.primary }]}
            onPress={() => setTab(value)}
          >
            <Text style={[typography.body2, { color: tab === value ? colors.primaryForeground : colors.foreground, fontWeight: '600' }]}>
              {value === 'commissions' ? 'Commissions' : 'Payments'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'commissions' ? (
        commissions.length === 0 ? (
          <Empty
            colors={colors}
            icon="cash-outline"
            text="No commissions yet. When a pharmacy you signed up pays for MedicineXP, your commission shows here."
          />
        ) : (
          commissions.map((commission) => {
            const statusColor = getCommissionStatusColor(colors, commission.status);
            return (
              <View key={commission.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]} numberOfLines={1}>
                    {commissionTitle(commission)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                    {new Date(commission.earned_at).toLocaleDateString()}
                    {commission.rate_bp && commission.sale_amount_paisa
                      ? ` • ${formatRate(commission.rate_bp)} of ${formatPaisa(commission.sale_amount_paisa)}`
                      : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700' }]}>{formatPaisa(commission.amount_paisa)}</Text>
                  <Text style={[typography.caption, { color: statusColor }]}>{COMMISSION_STATUS_LABEL[commission.status]}</Text>
                </View>
              </View>
            );
          })
        )
      ) : payouts.length === 0 ? (
        <Empty colors={colors} icon="wallet-outline" text="No payments yet." />
      ) : (
        payouts.map((payout) => (
          <View key={payout.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>
                {payout.paid_at
                  ? `Paid ${new Date(payout.paid_at).toLocaleDateString()}`
                  : payout.scheduled_for
                    ? `Due ${new Date(`${payout.scheduled_for}T00:00:00`).toLocaleDateString()}`
                    : 'Payout'}
              </Text>
              {payout.reference ? (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {[payout.method, payout.reference].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700' }]}>{formatPaisa(payout.amount_paisa)}</Text>
              <Text style={[typography.caption, { color: payout.status === 'paid' ? colors.success : payout.status === 'failed' ? colors.destructive : colors.warning, textTransform: 'capitalize' }]}>
                {payout.status}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Tile({ label, value, colors }: { label: string; value: string; colors: AppColors }) {
  return (
    <View style={[tileStyles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Empty({ colors, icon, text }: { colors: AppColors; icon: 'cash-outline' | 'wallet-outline'; text: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 16 }}>
      <Ionicons name={icon} size={36} color={colors.mutedForeground} />
      <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const tileStyles = StyleSheet.create({
  tile: { width: '48%', flexGrow: 1, padding: 12, borderRadius: 12, borderWidth: 1, gap: 2 },
});

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingTop: 56, gap: 12, paddingBottom: 40 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    howLink: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    intro: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
    hero: { padding: 18, borderRadius: 16, gap: 4 },
    heroLabel: { color: 'rgba(255,255,255,0.8)' },
    heroValue: { color: '#fff', fontSize: 32, fontWeight: '800' },
    heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 8 },
    heroText: { color: '#fff' },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tabs: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, marginTop: 4 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  });
