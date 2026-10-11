// app/(app)/profile/index.tsx
import { earningsApi } from '@/api/earnings';
import { tierApi } from '@/api/tiers';
import { ProgramSwitcher } from '@/components/programs/program-switcher';
import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { ActivityCounts } from '@/types/models';
import { IconName } from '@/utils/icons';
import { formatPaisa } from '@/utils/money';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, activeMembership, activeMemberships } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [counts, setCounts] = useState<ActivityCounts | null>(null);
  const [lifetimePaisa, setLifetimePaisa] = useState<number | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const load = useCallback(async () => {
    if (!activeMembership) return;
    try {
      const [tier, earnings] = await Promise.all([tierApi.getCurrent(), earningsApi.getSummary()]);
      setCounts(tier.data.data.counts);
      setLifetimePaisa(earnings.data.data.lifetime_paisa);
    } catch (error) {
      console.error('Error loading profile stats:', error);
    }
  }, [activeMembership]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pendingCount = (user?.memberships ?? []).filter((m) => m.status === 'pending' || m.status === 'invited').length;
  const canSwitch = activeMemberships.length > 1 || pendingCount > 0;

  const shareCode = () => {
    if (!activeMembership) return;
    Share.share({
      message: `Sign up for ${activeMembership.program?.name ?? 'MedicineXP'} with my code ${activeMembership.referral_code}`,
    });
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const menu: { icon: IconName; label: string; route: Href; hint?: string }[] = [
    { icon: 'trophy-outline', label: 'Tiers & rewards', route: '/(app)/tiers', hint: activeMembership?.tier?.name },
    { icon: 'business-outline', label: 'Pharmacies & clinics', route: '/(app)/venues' },
    { icon: 'bag-handle-outline', label: 'My materials', route: '/(app)/materials' },
    { icon: 'cube-outline', label: 'Drop-offs', route: '/(app)/distributions' },
    { icon: 'call-outline', label: 'Calls', route: '/(app)/call-logs' },
    { icon: 'pricetag-outline', label: 'Coupons', route: '/(app)/coupons' },
    { icon: 'people-circle-outline', label: 'Meetups', route: '/(app)/meetups' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[typography.h3, { color: colors.primaryForeground }]}>{user?.name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <Text style={[typography.h5, { color: colors.foreground, fontWeight: '700' }]}>{user?.name}</Text>
        <Text style={[typography.body2, { color: colors.mutedForeground }]}>{user?.email}</Text>
        {user?.contact ? <Text style={[typography.body2, { color: colors.mutedForeground }]}>{user.contact}</Text> : null}
      </View>

      {/* Program */}
      <TouchableOpacity
        style={[styles.programCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
        onPress={() => setShowSwitcher(true)}
        disabled={!canSwitch}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Working for</Text>
          <Text style={[typography.h5, { color: colors.foreground, fontWeight: '700' }]}>
            {activeMembership?.program?.name ?? 'No active program'}
          </Text>
          {activeMembership?.tier && (
            <Text style={[typography.caption, { color: colors.primary }]}>{activeMembership.tier.name} tier</Text>
          )}
          {pendingCount > 0 && (
            <Text style={[typography.caption, { color: colors.warning }]}>
              {pendingCount} program{pendingCount > 1 ? 's' : ''} waiting for approval
            </Text>
          )}
        </View>
        {canSwitch && (
          <View style={[styles.switchPill, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Switch</Text>
          </View>
        )}
      </TouchableOpacity>

      {activeMembership && (
        <TouchableOpacity style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={shareCode}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>Your referral code</Text>
            <Text style={[styles.code, { color: colors.foreground }]}>{activeMembership.referral_code}</Text>
          </View>
          <Ionicons name="share-social-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}

      <View style={[styles.stats, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Stat label="Pharmacies signed" value={counts?.sales ?? '—'} colors={colors} />
        <Stat label="Earned" value={lifetimePaisa != null ? formatPaisa(lifetimePaisa) : '—'} colors={colors} />
        <Stat label="Visits" value={counts?.visits ?? '—'} colors={colors} />
      </View>

      <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {menu.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index < menu.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
            onPress={() => router.push(item.route)}
          >
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <Text style={[typography.body1, { flex: 1, color: colors.foreground }]}>{item.label}</Text>
            {item.hint ? <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.hint}</Text> : null}
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.menuItem, styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push('/onboarding?returnTo=/(app)/profile')}
      >
        <Ionicons name="school-outline" size={22} color={colors.primary} />
        <Text style={[typography.body1, { flex: 1, color: colors.foreground }]}>How it works</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.logout, { borderColor: colors.destructive }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[typography.body1, { color: colors.destructive, fontWeight: '600' }]}>Log out</Text>
      </TouchableOpacity>

      <ProgramSwitcher visible={showSwitcher} onClose={() => setShowSwitcher(false)} onSwitched={() => load()} />
    </ScrollView>
  );
}

function Stat({ label, value, colors }: { label: string; value: number | string; colors: AppColors }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={[typography.h6, { color: colors.foreground, fontWeight: '700' }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.mutedForeground, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    content: { padding: 16, paddingTop: 56, gap: 12, paddingBottom: 40 },
    header: { alignItems: 'center', gap: 2, marginBottom: 4 },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    programCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 2 },
    switchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
    codeCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
    code: { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
    stats: { flexDirection: 'row', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
    menu: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  });
