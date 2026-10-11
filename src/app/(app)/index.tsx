// app/(app)/index.tsx — Dashboard
import { SyncBanner } from '@/components/ui/sync-banner';
import { dashboardApi } from '@/api/dashboard';
import { Logo } from '@/components/common/logo';
import { ProgramSwitcher } from '@/components/programs/program-switcher';
import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { DashboardData } from '@/types/models';
import { IconName } from '@/utils/icons';
import { leadStatusLabel } from '@/utils/lead-types';
import { formatPaisa } from '@/utils/money';
import { requirementLabel } from '@/utils/tiers';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const payoutDayLabel = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, activeMembership, activeMemberships, needsProgramChoice } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const load = useCallback(async () => {
    if (!activeMembership) {
      setLoading(false);
      return;
    }
    try {
      const response = await dashboardApi.get();
      setData(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not load your dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMembership]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Signed in, but no program to work in yet
  if (!activeMembership && !needsProgramChoice) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="hourglass-outline" size={48} color={colors.primary} />
        <Text style={[typography.h5, { color: colors.foreground, textAlign: 'center' }]}>Waiting for approval</Text>
        <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>
          Hi {user?.name}. Your account is being reviewed. You'll be able to start once a program approves you.
        </Text>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ProgramSwitcher visible={needsProgramChoice} required onClose={() => undefined} onSwitched={() => load()} />
      </View>
    );
  }

  const earnings = data?.earnings;
  const quickActions: { label: string; icon: IconName; route: Href }[] = [
    { label: 'Check in', icon: 'location', route: '/(app)/visits/checkin' },
    { label: 'New lead', icon: 'person-add', route: '/(app)/leads/create' },
    { label: 'Log call', icon: 'call', route: '/(app)/call-logs/create' },
    { label: 'Near me', icon: 'map', route: '/(app)/map' as Href },
    { label: 'Pitch kit', icon: 'easel', route: '/(app)/pitch' as Href },
    { label: 'My stock', icon: 'bag-handle', route: '/(app)/inventory' },
    { label: 'Coupons', icon: 'pricetag', route: '/(app)/coupons' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Only shows when offline or something is waiting to sync */}
      <SyncBanner topInset />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <LinearGradient colors={['#6C3CE1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerTop}>
            <Logo size="large" backdropColor="darker" />
            <TouchableOpacity style={styles.qrButton} onPress={() => router.push('/(app)/referral')}>
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.programPill}
              onPress={() => setShowSwitcher(true)}
              disabled={activeMemberships.length < 2}
            >
              <Text style={styles.programPillText} numberOfLines={1}>
                {activeMembership?.program?.name}
                {activeMembership?.tier ? ` • ${activeMembership.tier.name}` : ''}
              </Text>
              {activeMemberships.length > 1 && <Ionicons name="chevron-down" size={14} color="#fff" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.greeting}>Namaste, {(data?.mr.name ?? user?.name ?? '').split(' ')[0]}!</Text>

          {earnings && (
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Earned this week</Text>
              <Text style={styles.heroValue}>{formatPaisa(earnings.this_week_paisa)}</Text>
              <Text style={styles.heroSub}>
                {earnings.payout_delayed
                  ? `Payout delayed${earnings.delay_reason ? `: ${earnings.delay_reason}` : ''}`
                  : earnings.next_payout_paisa > 0
                    ? `${formatPaisa(earnings.next_payout_paisa)} paid ${payoutDayLabel(earnings.next_payout_date)}`
                    : `Next payout ${payoutDayLabel(earnings.next_payout_date)}`}
              </Text>
              <View style={styles.heroDivider} />
              <View style={styles.heroRow}>
                <HeroStat label="Lifetime" value={formatPaisa(earnings.lifetime_paisa)} />
                <HeroStat label="Being verified" value={formatPaisa(earnings.pending_paisa)} />
                <HeroStat label="Signed up" value={String(data?.counts.sales ?? 0)} />
              </View>
            </View>
          )}
        </LinearGradient>

        {error && (
          <Text style={[typography.body2, { color: colors.destructive, margin: 16 }]}>{error}</Text>
        )}

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(action.route)}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={action.icon} size={22} color={colors.primary} />
              </View>
              <Text style={[typography.caption, { color: colors.foreground, fontWeight: '600' }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {data && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[typography.body1, styles.cardTitle, { color: colors.foreground }]}>Today</Text>
              <View style={styles.todayRow}>
                <TodayStat icon="location-outline" label="Visits" value={data.today.visits} colors={colors} />
                <TodayStat icon="call-outline" label="Calls" value={data.today.calls} colors={colors} />
                <TodayStat icon="alarm-outline" label="Follow-ups due" value={data.follow_ups_due.length} colors={colors} />
              </View>
            </View>

            {(data.follow_ups_due.length > 0 || data.scheduled_calls_today.length > 0) && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[typography.body1, styles.cardTitle, { color: colors.foreground }]}>To do</Text>
                {data.scheduled_calls_today.map((call) => (
                  <TouchableOpacity
                    key={`c${call.id}`}
                    style={[styles.todoRow, { borderTopColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/(app)/call-logs/[id]', params: { id: call.id } })}
                  >
                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                    <Text style={[typography.body2, { flex: 1, color: colors.foreground }]} numberOfLines={1}>
                      Call {call.lead?.display_name || call.venue?.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>{call.call_time.slice(0, 5)}</Text>
                  </TouchableOpacity>
                ))}
                {data.follow_ups_due.map((lead) => (
                  <TouchableOpacity
                    key={`l${lead.id}`}
                    style={[styles.todoRow, { borderTopColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
                  >
                    <Ionicons name="alarm-outline" size={18} color={colors.warning} />
                    <Text style={[typography.body2, { flex: 1, color: colors.foreground }]} numberOfLines={1}>
                      Follow up with {lead.display_name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>{leadStatusLabel(lead.status)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {data.progress && (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(app)/tiers')}
              >
                <View style={styles.progressHeader}>
                  <Text style={[typography.body1, styles.cardTitle, { color: colors.foreground }]}>
                    Road to {data.progress.next_tier.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]}>{data.progress.percent}%</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${data.progress.percent}%`, backgroundColor: colors.primary }]} />
                </View>
                {Object.entries(data.progress.requirements).map(([key, requirement]) => (
                  <Text key={key} style={[typography.caption, { color: requirement.met ? colors.success : colors.mutedForeground }]}>
                    {requirement.met ? '✓ ' : ''}
                    {Math.min(requirement.current, requirement.required)} / {requirement.required} {requirementLabel(key)}
                  </Text>
                ))}
              </TouchableOpacity>
            )}

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[typography.body1, styles.cardTitle, { color: colors.foreground }]}>Recent visits</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/visits')}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>See all</Text>
                </TouchableOpacity>
              </View>
              {data.recent_visits.length === 0 ? (
                <Text style={[typography.body2, { color: colors.mutedForeground }]}>No visits yet. Tap Check in when you reach a pharmacy.</Text>
              ) : (
                data.recent_visits.map((visit) => (
                  <TouchableOpacity
                    key={visit.id}
                    style={[styles.todoRow, { borderTopColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/(app)/visits/[id]', params: { id: visit.id } })}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                    <Text style={[typography.body2, { flex: 1, color: colors.foreground }]} numberOfLines={1}>{visit.venue?.name}</Text>
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>{new Date(visit.visited_at).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[typography.body1, styles.cardTitle, { color: colors.foreground }]}>Recent leads</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/leads')}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>See all</Text>
                </TouchableOpacity>
              </View>
              {data.recent_leads.length === 0 ? (
                <Text style={[typography.body2, { color: colors.mutedForeground }]}>No leads yet.</Text>
              ) : (
                data.recent_leads.map((lead) => (
                  <TouchableOpacity
                    key={lead.id}
                    style={[styles.todoRow, { borderTopColor: colors.border }]}
                    onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
                  >
                    <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
                    <Text style={[typography.body2, { flex: 1, color: colors.foreground }]} numberOfLines={1}>{lead.display_name}</Text>
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>{leadStatusLabel(lead.status)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ProgramSwitcher
        visible={showSwitcher || needsProgramChoice}
        required={needsProgramChoice}
        onClose={() => setShowSwitcher(false)}
        onSwitched={() => {
          setData(null);
          setLoading(true);
        }}
      />
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function TodayStat({ icon, label, value, colors }: { icon: IconName; label: string; value: number; colors: AppColors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[typography.h5, { color: colors.foreground, fontWeight: '700' }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
    header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    qrButton: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    programPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      maxWidth: '55%',
    },
    programPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    greeting: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16 },
    hero: { marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)' },
    heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    heroValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 2 },
    heroSub: { color: '#fff', fontSize: 13, marginTop: 2 },
    heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 12 },
    heroRow: { flexDirection: 'row', gap: 8 },
    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 16 },
    quickAction: { width: '23%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    card: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
    cardTitle: { fontWeight: '600' },
    todayRow: { flexDirection: 'row' },
    todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4 },
  });
