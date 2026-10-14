// app/(app)/team-up.tsx — work with another rep today: show your code (QR), enter theirs,
// or find a teammate nearby. While teamed up, check-ins and new leads count for both of you
// and a sale from them is split the way you agree.
import { NearbyRep, TeamUp, teamUpApi, teamUpLink } from '@/api/team-ups';
import { QrCode } from '@/components/common/qr-code';
import { Button, Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { sharePercent, teamUpStore, useTeamUp } from '@/hooks/use-team-up';
import { apiErrorMessage } from '@/utils/errors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Waiting for the other phone (code shown / request sent): poll fast, but not forever
const WAIT_POLL_MS = 3000;
const WAIT_CUTOFF_MS = 10 * 60 * 1000;
// "Find teammate": position goes to the server only while this is on, and only to its memory
const NEARBY_POLL_MS = 5000;
const NEARBY_CUTOFF_MS = 3 * 60 * 1000;

type Mode = 'choose' | 'show' | 'enter';

export default function TeamUpScreen() {
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const { running, incoming, outgoing, loaded } = useTeamUp();
  const [mode, setMode] = useState<Mode>(params.code ? 'enter' : 'choose');
  const [code, setCode] = useState((params.code ?? '').toUpperCase());
  const [busy, setBusy] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      teamUpStore.refresh().catch(() => undefined);
      return () => setFocused(false);
    }, [])
  );

  // Opened from a scanned QR (medicinexp://team-up?code=...)
  useEffect(() => {
    if (params.code) {
      setCode(params.code.toUpperCase());
      setMode('enter');
    }
  }, [params.code]);

  const waitingForOther = !running && !!outgoing && focused;
  useEffect(() => {
    if (!waitingForOther) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > WAIT_CUTOFF_MS) return clearInterval(timer);
      teamUpStore.refresh().catch(() => undefined);
    }, WAIT_POLL_MS);
    return () => clearInterval(timer);
  }, [waitingForOther, outgoing?.id]);

  const run = async (label: string, fn: () => Promise<{ data: { data: TeamUp } }>, after?: (t: TeamUp) => void) => {
    setBusy(label);
    try {
      const teamUp = (await fn()).data.data;
      teamUpStore.apply(teamUp);
      after?.(teamUp);
    } catch (err) {
      Alert.alert('Team up', apiErrorMessage(err, 'That didn\'t work. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const showCode = () => {
    setMode('show');
    if (!outgoing?.join_code || isExpired(outgoing.join_code_expires_at)) run('code', teamUpApi.showCode);
  };

  const join = () =>
    run('join', () => teamUpApi.join(code.trim()), (t) => {
      if (t.status === 'active') teamUpStore.openSplit(t.id);
    });

  const end = (teamUp: TeamUp) =>
    Alert.alert('End team-up?', 'New check-ins and leads will be yours alone again. Today\'s shared work stays shared.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => run('end', () => teamUpApi.end(teamUp.id), () => setMode('choose')) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Team up" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!loaded && <ActivityIndicator color={colors.primary} />}

        {running ? (
          <Card style={styles.gap}>
            <View style={styles.row}>
              <Ionicons name="people" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.big, { color: colors.foreground }]}>With {running.partner?.name} today</Text>
                <Text style={{ color: colors.mutedForeground }}>Your check-ins and new leads count for both of you until midnight.</Text>
              </View>
            </View>
            <View style={[styles.bar, { backgroundColor: colors.muted }]}>
              <View style={{ flex: running.split.my_share_bp, backgroundColor: colors.primary }} />
              <View style={{ flex: running.split.partner_share_bp, backgroundColor: colors.secondary }} />
            </View>
            <Text style={{ color: colors.foreground }}>
              You {sharePercent(running.split.my_share_bp)} · {running.partner?.name} {sharePercent(running.split.partner_share_bp)}
              {running.split.agreed ? ' · agreed' : ' · not agreed yet (50/50 until you both agree)'}
            </Text>
            <Button title={running.split.agreed ? 'See split' : 'Agree commission split'} icon="swap-horizontal" onPress={() => teamUpStore.openSplit(running.id)} />
            <Button title="End team-up" variant="ghost" onPress={() => end(running)} loading={busy === 'end'} />
          </Card>
        ) : (
          <>
            {incoming.map((request) => (
              <Card key={request.id} style={styles.gap}>
                <Text style={[styles.big, { color: colors.foreground }]}>{request.partner?.name} wants to team up</Text>
                <View style={styles.row}>
                  <Button title="Not now" variant="outline" style={{ flex: 1 }} onPress={() => run('no', () => teamUpApi.respond(request.id, false))} />
                  <Button
                    title="Team up"
                    style={{ flex: 1 }}
                    loading={busy === 'yes'}
                    onPress={() => run('yes', () => teamUpApi.respond(request.id, true), (t) => teamUpStore.openSplit(t.id))}
                  />
                </View>
              </Card>
            ))}

            {outgoing && outgoing.partner && (
              <Card style={styles.gap}>
                <View style={styles.row}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={{ color: colors.foreground, flex: 1 }}>Waiting for {outgoing.partner.name} to accept…</Text>
                </View>
                <Button title="Cancel request" variant="ghost" onPress={() => run('end', () => teamUpApi.end(outgoing.id))} />
              </Card>
            )}

            <View style={styles.row}>
              <Choice icon="qr-code" label="Show my code" active={mode === 'show'} onPress={showCode} />
              <Choice icon="keypad" label="Enter their code" active={mode === 'enter'} onPress={() => setMode('enter')} />
            </View>

            {mode === 'show' && (
              <Card style={[styles.gap, styles.center]}>
                {outgoing?.join_code && !isExpired(outgoing.join_code_expires_at) ? (
                  <>
                    <View style={styles.qrWrap}>
                      <QrCode value={teamUpLink(outgoing.join_code)} size={220} />
                    </View>
                    <Text style={[styles.code, { color: colors.foreground }]}>{outgoing.join_code}</Text>
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                      Your teammate scans this with their phone camera, or types the code in their app. It works for 10 minutes.
                    </Text>
                    <View style={styles.row}>
                      <ActivityIndicator size="small" color={colors.mutedForeground} />
                      <Text style={{ color: colors.mutedForeground }}>Waiting for your teammate…</Text>
                    </View>
                  </>
                ) : (
                  <Button title="Get a new code" icon="refresh" onPress={() => run('code', teamUpApi.showCode)} loading={busy === 'code'} />
                )}
              </Card>
            )}

            {mode === 'enter' && (
              <Card style={styles.gap}>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABC123"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  style={[styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                />
                <Button title="Team up" icon="people" onPress={join} loading={busy === 'join'} disabled={code.length !== 6} />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>Or scan their QR with your phone camera: it opens this screen with the code filled in.</Text>
              </Card>
            )}

            <SectionTitle>Teammates nearby</SectionTitle>
            <NearbyFinder enabled={focused} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Choice({ icon, label, active, onPress }: { icon: 'qr-code' | 'keypad'; label: string; active: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.choice, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '1A' : colors.card }]}
    >
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={{ color: colors.foreground, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Lists reps who also have this open within ~200 m. Off until tapped; sends the position
 * every few seconds while on, stops by itself, and tells the server to forget it on the way out.
 */
function NearbyFinder({ enabled }: { enabled: boolean }) {
  const { colors } = useAppTheme();
  const [on, setOn] = useState(false);
  const [reps, setReps] = useState<NearbyRep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const started = useRef(0);

  useEffect(() => {
    if (!on || !enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    started.current = Date.now();

    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started.current > NEARBY_CUTOFF_MS) {
        setOn(false);
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (stopped) return;
        setReps((await teamUpApi.nearby(position.coords.latitude, position.coords.longitude)).data.data);
        setError(null);
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not look for teammates.'));
      }
      if (!stopped) timer = setTimeout(tick, NEARBY_POLL_MS);
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to find teammates nearby.');
        setOn(false);
        return;
      }
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      teamUpApi.leaveNearby().catch(() => undefined);
    };
  }, [on, enabled]);

  const ask = async (rep: NearbyRep) => {
    setAsking(rep.membership_id);
    try {
      const teamUp = (await teamUpApi.ask(rep.membership_id, 'nearby')).data.data;
      teamUpStore.apply(teamUp);
      if (teamUp.status === 'active') teamUpStore.openSplit(teamUp.id);
      setOn(false);
    } catch (err) {
      Alert.alert('Team up', apiErrorMessage(err, 'Could not ask.'));
    } finally {
      setAsking(null);
    }
  };

  if (!on) {
    return (
      <Card style={styles.gap}>
        <Text style={{ color: colors.mutedForeground }}>Both of you open this and tap below. Your location is only used while it's on.</Text>
        <Button title="Find teammates nearby" icon="locate" variant="outline" onPress={() => setOn(true)} />
        {error && <Text style={{ color: colors.destructive }}>{error}</Text>}
      </Card>
    );
  }

  return (
    <Card style={styles.gap}>
      {reps.length === 0 ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>Looking… ask your teammate to open Team up and tap "Find teammates nearby".</Text>
        </View>
      ) : (
        reps.map((rep) => (
          <View key={rep.membership_id} style={styles.row}>
            <Ionicons name="person-circle" size={28} color={colors.primary} />
            <Text style={{ color: colors.foreground, flex: 1 }}>
              {rep.name} · {rep.distance_m} m
            </Text>
            <Button title="Ask" onPress={() => ask(rep)} loading={asking === rep.membership_id} />
          </View>
        ))
      )}
      {error && <Text style={{ color: colors.destructive }}>{error}</Text>}
      <Button title="Stop looking" variant="ghost" onPress={() => setOn(false)} />
    </Card>
  );
}

const isExpired = (iso: string | null) => !iso || new Date(iso).getTime() <= Date.now();

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  gap: { gap: 12 },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: 17, fontWeight: '700' },
  bar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden' },
  choice: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 18, borderRadius: 14, borderWidth: 1.5 },
  qrWrap: { padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12 },
  code: { fontSize: 32, fontWeight: '800', letterSpacing: 6 },
  codeInput: { fontSize: 28, fontWeight: '700', letterSpacing: 6, textAlign: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  hint: { fontSize: 13, textAlign: 'center' },
});
