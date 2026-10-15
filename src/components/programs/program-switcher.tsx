// src/components/programs/program-switcher.tsx
import { isUsableMembership, suspensionText, useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Membership } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProgramSwitcherProps {
  visible: boolean;
  onClose: () => void;
  // Called after a successful switch so screens can reload their data
  onSwitched?: (membership: Membership) => void;
  // When the MR must choose before continuing, hide the close button
  required?: boolean;
}

/**
 * Pick which program (MedicineXP, a pharma company, ...) the MR is working in.
 * Every list, check-in and earning in the app belongs to the active program.
 */
export function ProgramSwitcher({ visible, onClose, onSwitched, required }: ProgramSwitcherProps) {
  const { colors } = useAppTheme();
  const { user, activeMembership, switchProgram, refreshUser } = useAuth();
  const [switching, setSwitching] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Programs the rep left aren't listed; suspended ones show why
  const memberships = (user?.memberships ?? []).filter((m) => m.status !== 'left');

  // Fresh statuses each time it opens: a program may have been paused since login
  useEffect(() => {
    if (!visible) return;
    setRefreshing(true);
    refreshUser().finally(() => setRefreshing(false));
  }, [visible, refreshUser]);

  const choose = async (membership: Membership) => {
    if (!membership.program || !isUsableMembership(membership)) return;
    if (membership.program.id === activeMembership?.program?.id) {
      onClose();
      return;
    }
    setSwitching(membership.program.id);
    try {
      await switchProgram(membership.program.id);
      onSwitched?.(membership);
      onClose();
    } catch (error: any) {
      Alert.alert('Could not switch', error.message || 'Please try again.');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={required ? undefined : onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.titleRow}>
            <Text style={[typography.h5, { color: colors.foreground, flex: 1 }]}>
              {required ? 'Which program are you working for?' : 'Switch program'}
            </Text>
            {refreshing && <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginRight: 8 }} />}
            {!required && (
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {memberships.map((membership) => {
            const program = membership.program;
            if (!program) return null;
            const active = program.id === activeMembership?.program?.id;
            const usable = isUsableMembership(membership);
            const paused = membership.status === 'active' && program.is_active === false;

            return (
              <TouchableOpacity
                key={membership.id}
                style={[
                  styles.row,
                  { borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.primary + '10' },
                  !usable && { opacity: 0.6 },
                ]}
                disabled={!usable || switching !== null}
                onPress={() => choose(membership)}
              >
                <View style={[styles.logo, { backgroundColor: (paused ? colors.mutedForeground : colors.primary) + '15' }]}>
                  <Text style={[typography.body1, { color: paused ? colors.mutedForeground : colors.primary, fontWeight: '700' }]}>{program.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>{program.name}</Text>
                  <Text style={[typography.caption, { color: paused ? colors.warning : colors.mutedForeground }]}>
                    {usable
                      ? [membership.tier?.name, `Code ${membership.referral_code}`].filter(Boolean).join(' • ')
                      : paused
                        ? 'Paused by MedicineXP. You can switch to it once it is back on.'
                        : membership.status === 'suspended'
                          ? `Suspended${suspensionText(membership) ? ` ${suspensionText(membership)}` : ''}`
                          : membership.status === 'invited'
                            ? 'Invitation waiting'
                            : 'Waiting for approval'}
                  </Text>
                </View>
                {switching === program.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : active ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : paused ? (
                  <View style={[styles.statusPill, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="pause" size={12} color={colors.warning} />
                    <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>Paused</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 36, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  logo: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
});
