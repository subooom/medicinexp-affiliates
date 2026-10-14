// components/team-up/team-up-banner.tsx — dashboard strip while teamed up: who with, the
// split, and a nudge to agree it. Nothing shows when working alone.
import { useAppTheme } from '@/hooks/use-app-theme';
import { sharePercent, teamUpStore, useTeamUp } from '@/hooks/use-team-up';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function TeamUpBanner() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { running } = useTeamUp();
  if (!running) return null;

  const { split } = running;
  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' }]}
      onPress={() => (split.agreed ? router.push('/(app)/team-up') : teamUpStore.openSplit(running.id))}
    >
      <Ionicons name="people" size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>Teamed up with {running.partner?.name}</Text>
        <Text style={{ color: split.agreed ? colors.mutedForeground : colors.secondary, fontSize: 13 }}>
          {split.agreed
            ? `Split ${sharePercent(split.my_share_bp)} / ${sharePercent(split.partner_share_bp)} · until midnight`
            : 'Tap to agree your commission split'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.icon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  title: { fontSize: 15, fontWeight: '700' },
});
