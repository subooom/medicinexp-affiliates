// src/components/programs/no-program-state.tsx — the dashboard when the rep has no program to
// work in: suspended (with the admin's reason) or still waiting for approval. The tabs that
// need a program are hidden meanwhile ((app)/_layout), so nothing else fails behind it.
import { suspensionText, useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useSyncState } from '@/offline/sync-provider';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function NoProgramState() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const { pending, failed } = useSyncState();
  const [refreshing, setRefreshing] = useState(false);

  const memberships = user?.memberships ?? [];
  const suspended = memberships.filter((m) => m.status === 'suspended' && m.program);
  const waiting = memberships.filter((m) => (m.status === 'pending' || m.status === 'invited') && m.program);
  const unsent = pending + failed;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      {suspended.length > 0 ? (
        <>
          <Ionicons name="ban-outline" size={48} color={colors.destructive} />
          <Text style={[typography.h5, styles.center, { color: colors.foreground }]}>
            Suspended from {suspended.map((m) => m.program!.name).join(', ')}
          </Text>
          {suspended.map((m) => (
            <View key={m.id} style={[styles.reason, { backgroundColor: colors.destructive + '14', borderColor: colors.destructive + '40' }]}>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>Reason from your program admin</Text>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{suspensionText(m) || 'No reason given.'}</Text>
            </View>
          ))}
          <Text style={[typography.body2, styles.center, { color: colors.mutedForeground }]}>
            Hi {user?.name}. Your code doesn't work and you can't log work there for now. Talk to your program admin to get back
            in. Questions about money you've earned? Ask them too.
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="hourglass-outline" size={48} color={colors.primary} />
          <Text style={[typography.h5, styles.center, { color: colors.foreground }]}>Waiting for approval</Text>
          <Text style={[typography.body2, styles.center, { color: colors.mutedForeground }]}>
            Hi {user?.name}. Your account is being reviewed. You'll be able to start once a program approves you.
          </Text>
        </>
      )}

      {waiting.length > 0 && (
        <Text style={[typography.body2, styles.center, { color: colors.foreground }]}>
          {waiting.some((m) => m.status === 'invited') ? 'Invitations and requests' : 'Waiting for approval'}:{' '}
          {waiting.map((m) => m.program!.name).join(', ')}
        </Text>
      )}

      {unsent > 0 && (
        <Text style={[typography.caption, styles.center, { color: colors.warning }]}>
          {unsent} thing{unsent > 1 ? 's' : ''} you did offline {unsent > 1 ? 'are' : 'is'} still on this phone and can't be sent
          while you have no program.
        </Text>
      )}

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={refresh} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
            <Text style={[typography.button, { color: colors.primaryForeground }]}>Check again</Text>
          </>
        )}
      </TouchableOpacity>
      <View style={styles.links}>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.link}>
          <Ionicons name="enter-outline" size={16} color={colors.primary} />
          <Text style={[typography.body2, { color: colors.primary, fontWeight: '600' }]}>Join a program</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(app)/guide')} style={styles.link}>
          <Ionicons name="book-outline" size={16} color={colors.primary} />
          <Text style={[typography.body2, { color: colors.primary, fontWeight: '600' }]}>Guide</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  center: { textAlign: 'center' },
  reason: { alignSelf: 'stretch', padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, marginTop: 6 },
  links: { flexDirection: 'row', gap: 24 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
});
