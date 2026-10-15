// app/(app)/profile/index.tsx
import { programApi } from '@/api/auth';
import { logLoadError } from '@/utils/errors';
import { earningsApi } from '@/api/earnings';
import { tierApi } from '@/api/tiers';
import { ProgramSwitcher } from '@/components/programs/program-switcher';
import { outbox } from '@/offline/outbox';
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
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, activeMembership, activeMemberships, checkAuthStatus } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const invitations = (user?.memberships ?? []).filter((m) => m.status === 'invited' && m.program);

  const join = async () => {
    if (inviteCode.trim().length < 4) return;
    setJoining(true);
    try {
      const response = await programApi.join(inviteCode.trim());
      setInviteCode('');
      Alert.alert('Done', response.data.message || 'Request sent.');
      await checkAuthStatus();
    } catch (error: any) {
      Alert.alert('Could not join', error.status ? error.message : 'You need internet for this.');
    } finally {
      setJoining(false);
    }
  };

  const respond = async (programId: number, response: 'accept' | 'decline') => {
    try {
      const result = await programApi.respond(programId, response);
      Alert.alert(response === 'accept' ? 'Welcome' : 'Declined', result.data.message || '');
      await checkAuthStatus();
    } catch (error: any) {
      Alert.alert('Could not update', error.status ? error.message : 'You need internet for this.');
    }
  };
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
      logLoadError('Error loading profile stats:', error);
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
      message: `Sign up for ${activeMembership.program?.name ?? 'MedicineXP'} here: ${activeMembership.referral_url} (my code ${activeMembership.referral_code} is filled in)`,
    });
  };

  const handleLogout = async () => {
    const waiting = (await outbox.list()).length;
    Alert.alert(
      'Log out',
      waiting > 0
        ? `${waiting} thing${waiting > 1 ? 's' : ''} you did offline ${waiting > 1 ? 'have' : 'has'} not been sent yet and will be lost. Connect to the internet first to keep them.`
        : 'Are you sure you want to log out?',
      [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  type MenuItem = { icon: IconName; label: string; route: Href; hint?: string };
  // Grouped so the list reads in three short blocks instead of one long one
  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Selling',
      items: [
        { icon: 'map-outline', label: 'Pharmacies near me', route: '/(app)/map' },
        { icon: 'business-outline', label: 'Pharmacies & clinics', route: '/(app)/venues' },
        { icon: 'easel-outline', label: 'Pitch kit (tips & demo video)', route: '/(app)/pitch' },
        { icon: 'call-outline', label: 'Calls', route: '/(app)/call-logs' },
        { icon: 'pricetag-outline', label: 'Coupons', route: '/(app)/coupons' },
        { icon: 'trophy-outline', label: 'Tiers & rewards', route: '/(app)/tiers', hint: activeMembership?.tier?.name },
      ],
    },
    {
      title: 'Materials',
      items: [
        { icon: 'bag-handle-outline', label: 'My stock', route: '/(app)/inventory' },
        { icon: 'cube-outline', label: 'Materials pickup', route: '/(app)/pickups' },
        { icon: 'archive-outline', label: 'Drop-offs', route: '/(app)/distributions' },
        { icon: 'people-circle-outline', label: 'Meetups', route: '/(app)/meetups' },
      ],
    },
    {
      title: 'This phone',
      items: [{ icon: 'cloud-upload-outline', label: 'Sync (offline work, phone contacts)', route: '/(app)/sync' }],
    },
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
        <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(app)/referral')}>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>Your referral code</Text>
            <Text style={[styles.code, { color: colors.foreground }]}>{activeMembership.referral_code}</Text>
            <Text style={[typography.caption, { color: colors.primary }]}>Show sign-up QR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(app)/referral')} style={{ marginRight: 16 }}>
            <Ionicons name="qr-code-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareCode}>
            <Ionicons name="share-social-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {invitations.map((m) => (
        <View key={m.id} style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.primary, flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
          <Text style={[typography.body1, { color: colors.foreground }]}>
            <Text style={{ fontWeight: '700' }}>{m.program!.name}</Text> invited you to join their team.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.inviteButton, { backgroundColor: colors.primary }]} onPress={() => respond(m.program!.id, 'accept')}>
              <Text style={[typography.button, { color: colors.primaryForeground }]}>Join</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.inviteButton, { borderWidth: 1, borderColor: colors.border }]} onPress={() => respond(m.program!.id, 'decline')}>
              <Text style={[typography.button, { color: colors.foreground }]}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Stats and the work menu need a program (suspended / waiting reps only get join, help, log out) */}
      {activeMembership && (
      <>
      <View style={[styles.stats, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Stat label="Pharmacies signed" value={counts?.sales ?? '—'} colors={colors} />
        <Stat label="Earned" value={lifetimePaisa != null ? formatPaisa(lifetimePaisa) : '—'} colors={colors} />
        <Stat label="Visits" value={counts?.visits ?? '—'} colors={colors} />
      </View>

      {menuGroups.map((group) => (
        <View key={group.title} style={{ gap: 6 }}>
          <Text style={[typography.caption, styles.groupTitle, { color: colors.mutedForeground }]}>{group.title}</Text>
          <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {group.items.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, index < group.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                onPress={() => router.push(item.route)}
              >
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                <Text style={[typography.body1, { flex: 1, color: colors.foreground }]}>{item.label}</Text>
                {item.hint ? <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.hint}</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      </>
      )}

      <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border, padding: 16, gap: 10 }]}>
        <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>Join another program</Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Got an invite code from a pharma company? Enter it here.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            placeholder="INVITE CODE"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            maxLength={16}
            style={[styles.codeInput, { borderColor: colors.border, color: colors.foreground }]}
          />
          <TouchableOpacity style={[styles.inviteButton, { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 18 }]} onPress={join} disabled={joining}>
            {joining ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[typography.button, { color: colors.primaryForeground }]}>Join</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Help: the full guide (English / नेपाली) and the short welcome tour */}
      <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
          onPress={() => router.push('/(app)/guide')}
        >
          <Ionicons name="book-outline" size={22} color={colors.primary} />
          <Text style={[typography.body1, { flex: 1, color: colors.foreground }]}>Guide</Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>FAQ · EN / ने</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/onboarding?returnTo=/(app)/profile')}>
          <Ionicons name="school-outline" size={22} color={colors.primary} />
          <Text style={[typography.body1, { flex: 1, color: colors.foreground }]}>How it works</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

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
    inviteButton: { flex: 1, minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    codeInput: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, letterSpacing: 2 },
    header: { alignItems: 'center', gap: 2, marginBottom: 4 },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    programCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 2 },
    switchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
    codeCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
    code: { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
    stats: { flexDirection: 'row', paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
    groupTitle: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
    menu: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  });
