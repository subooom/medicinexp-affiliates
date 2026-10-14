// components/team-up/split-modal.tsx — the commission split bar both reps see. They talk it
// over in person; one sets the split, the other's bar moves within a few seconds and they agree.
import { teamUpApi } from '@/api/team-ups';
import { Button } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { sharePercent, teamUpStore, useTeamUp } from '@/hooks/use-team-up';
import { apiErrorMessage } from '@/utils/errors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const POLL_MS = 3000;
// Stop polling after a while so a forgotten open modal doesn't keep hitting the server
const POLL_CUTOFF_MS = 5 * 60 * 1000;
const BACKOFF_MS = 15000;
const STEP_BP = 500;
const MIN_BP = 1000;
const MAX_BP = 9000;
const PRESETS = [5000, 6000, 7000];

export function SplitModal() {
  const { colors } = useAppTheme();
  const { running, splitOpenFor } = useTeamUp();
  const visible = !!running && splitOpenFor === running.id;
  const split = running?.split;

  const [draft, setDraft] = useState(5000);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const pollStarted = useRef(0);

  // The bar follows the server unless the rep is in the middle of choosing their own number
  useEffect(() => {
    if (split && !editing) setDraft(split.my_share_bp);
  }, [split?.my_share_bp, split?.proposed_by_me, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates: poll while open (and the app is in front), up to the cutoff
  useEffect(() => {
    if (!visible || split?.agreed) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    pollStarted.current = Date.now();
    setPaused(false);

    const tick = async () => {
      if (stopped) return;
      if (Date.now() - pollStarted.current > POLL_CUTOFF_MS) {
        setPaused(true);
        return;
      }
      let wait = POLL_MS;
      if (AppState.currentState === 'active') {
        try {
          await teamUpStore.refresh();
        } catch (err: any) {
          if (err?.status === 429) wait = BACKOFF_MS;
        }
      }
      if (!stopped) timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [visible, split?.agreed, paused]);

  if (!running || !split) return null;
  const partnerName = running.partner?.name ?? 'Teammate';
  const partnerProposed = split.proposed_by_me === false;
  const canAgree = partnerProposed && !editing && draft === split.my_share_bp;

  const nudge = (delta: number) => {
    setEditing(true);
    setDraft((d) => Math.min(MAX_BP, Math.max(MIN_BP, d + delta)));
  };

  const act = async (fn: () => Promise<any>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fn();
      teamUpStore.apply(res.data.data);
      setEditing(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the split. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setEditing(false);
    teamUpStore.closeSplit();
  };

  const status = split.agreed
    ? 'Agreed. Locked for today.'
    : partnerProposed
      ? `${partnerName} set this split. Agree, or set your own.`
      : split.proposed_by_me
        ? `Waiting for ${partnerName} to agree…`
        : 'Talk it over, then set the split. It stays 50/50 until you both agree.';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Commission split</Text>
            <TouchableOpacity onPress={close} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            You and {partnerName} today. Sales from today's shared work are split like this.
          </Text>

          {/* The bar: me on the left, teammate on the right */}
          <View style={styles.names}>
            <Text style={[styles.name, { color: colors.primary }]}>You {sharePercent(draft)}</Text>
            <Text style={[styles.name, { color: colors.secondary }]}>
              {partnerName} {sharePercent(10000 - draft)}
            </Text>
          </View>
          <View style={[styles.bar, { backgroundColor: colors.muted }]}>
            <View style={{ flex: draft, backgroundColor: colors.primary }} />
            <View style={{ flex: 10000 - draft, backgroundColor: colors.secondary }} />
          </View>

          {!split.agreed && (
            <>
              <View style={styles.controls}>
                <TouchableOpacity style={[styles.step, { borderColor: colors.border }]} onPress={() => nudge(-STEP_BP)} disabled={draft <= MIN_BP}>
                  <Ionicons name="remove" size={22} color={colors.foreground} />
                </TouchableOpacity>
                <View style={styles.presets}>
                  {PRESETS.map((bp) => (
                    <TouchableOpacity
                      key={bp}
                      onPress={() => {
                        setEditing(true);
                        setDraft(bp);
                      }}
                      style={[styles.preset, { borderColor: draft === bp ? colors.primary : colors.border, backgroundColor: draft === bp ? colors.primary + '1A' : 'transparent' }]}
                    >
                      <Text style={{ color: colors.foreground }}>{bp / 100}/{100 - bp / 100}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[styles.step, { borderColor: colors.border }]} onPress={() => nudge(STEP_BP)} disabled={draft >= MAX_BP}>
                  <Ionicons name="add" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              {canAgree ? (
                <Button title={`Agree ${sharePercent(draft)} / ${sharePercent(10000 - draft)}`} icon="checkmark-circle" onPress={() => act(() => teamUpApi.agree(running.id))} loading={saving} />
              ) : (
                <Button
                  title="Set commission split"
                  icon="swap-horizontal"
                  onPress={() => act(() => teamUpApi.setSplit(running.id, draft))}
                  loading={saving}
                  disabled={split.changes_left <= 0 || (!editing && split.proposed_by_me === true)}
                />
              )}
              {editing && (
                <TouchableOpacity onPress={() => setEditing(false)} style={styles.reset}>
                  <Text style={{ color: colors.mutedForeground }}>Back to what's on the bar</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.statusRow}>
            {!split.agreed && !paused && <ActivityIndicator size="small" color={colors.mutedForeground} />}
            {split.agreed && <Ionicons name="lock-closed" size={16} color={colors.green500} />}
            <Text style={[styles.status, { color: split.agreed ? colors.green500 : colors.mutedForeground }]}>{status}</Text>
          </View>
          {paused && !split.agreed && (
            <TouchableOpacity onPress={() => setPaused(false)}>
              <Text style={[styles.link, { color: colors.primary }]}>Live updates paused. Tap to refresh.</Text>
            </TouchableOpacity>
          )}
          {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
          {!split.agreed && split.changes_left <= 3 && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{split.changes_left} changes left today.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  names: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  name: { fontSize: 16, fontWeight: '700' },
  bar: { flexDirection: 'row', height: 28, borderRadius: 14, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presets: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'center' },
  preset: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  reset: { alignItems: 'center', paddingVertical: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { fontSize: 14, flex: 1 },
  link: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 14 },
  hint: { fontSize: 12 },
});
