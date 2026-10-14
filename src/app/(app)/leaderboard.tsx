// app/(app)/leaderboard.tsx — this week's top reps in the program
import { fieldApi } from '@/api/field';
import { Card, EmptyState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Leaderboard, LeaderboardRow } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const medal = ['#F59E0B', '#9CA3AF', '#B45309'];

export default function LeaderboardScreen() {
  const { colors } = useAppTheme();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [tab, setTab] = useState<'sales' | 'score'>('sales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBoard((await fieldApi.getLeaderboard()).data.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Could not load the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Stays mounted: reload when the rep switches program
  const programId = useAuth().activeMembership?.program?.id;
  useEffect(() => {
    load();
  }, [load, programId]);

  const rows: LeaderboardRow[] = board ? (tab === 'sales' ? board.by_sales : board.by_score) : [];
  const myRank = board ? (tab === 'sales' ? board.my_rank_sales : board.my_rank_score) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Leaderboard" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error || !board ? (
        <EmptyState icon="podium-outline" title="Not available" message={error ?? undefined} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['sales', 'score'] as const).map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, { backgroundColor: tab === key ? colors.primary : colors.card, borderColor: tab === key ? colors.primary : colors.border }]}
              >
                <Text style={[typography.body2, { color: tab === key ? colors.primaryForeground : colors.foreground, fontWeight: '600' }]}>
                  {key === 'sales' ? 'Pharmacies signed' : 'Most active'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            This week, until {new Date(board.cutoff_at).toLocaleDateString([], { weekday: 'long' })} night
            {myRank ? ` · you're #${myRank} of ${board.total_reps}` : ''}
          </Text>

          {rows.map((row, index) => (
            <Card key={row.membership_id} style={[styles.row, row.is_me && { borderColor: colors.primary, backgroundColor: colors.primary + '0D' }]}>
              <View style={[styles.rank, { backgroundColor: index < 3 ? medal[index] : colors.border }]}>
                <Text style={{ color: index < 3 ? '#fff' : colors.foreground, fontWeight: '800' }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body1, { color: colors.foreground, fontWeight: row.is_me ? '800' : '600' }]}>
                  {row.name}
                  {row.is_me ? ' (you)' : ''}
                </Text>
                {row.tier && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="trophy" size={12} color={row.tier_color ?? colors.mutedForeground} />
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>{row.tier}</Text>
                  </View>
                )}
              </View>
              <Text style={[typography.h5, { color: colors.foreground, fontWeight: '800' }]}>{tab === 'sales' ? row.sales : row.score}</Text>
            </Card>
          ))}
          {rows.length === 0 && <Text style={[typography.body2, { color: colors.mutedForeground }]}>Nobody on the board yet this week. Be first.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rank: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
