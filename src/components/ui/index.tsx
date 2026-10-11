// src/components/ui/index.tsx — small building blocks shared by the newer screens
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { IconName } from '@/utils/icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SyncBanner } from './sync-banner';

export function ScreenHeader({ title, right, onBack, showSync = true }: { title: string; right?: ReactNode; onBack?: () => void; showSync?: boolean }) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack ?? (() => router.back())} style={styles.headerSide} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600', flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
      </View>
      {showSync && <SyncBanner />}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const cardStyle = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style];
  return onPress ? (
    <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  ) : (
    <View style={cardStyle}>{children}</View>
  );
}

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, border: colors.primary },
    outline: { bg: colors.card, fg: colors.foreground, border: colors.border },
    danger: { bg: colors.destructive, fg: '#fff', border: colors.destructive },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  };
  const p = palette[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: p.bg, borderColor: p.border, opacity: disabled ? 0.5 : 1 }, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={p.fg} />}
          <Text style={[typography.button, { color: p.fg }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function EmptyState({ icon, title, message, children }: { icon: IconName; title: string; message?: string; children?: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[typography.h5, { color: colors.foreground, textAlign: 'center' }]}>{title}</Text>
      {message && <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>{message}</Text>}
      {children}
    </View>
  );
}

const badgeTones = {
  neutral: { bg: '#E5E7EB', fg: '#374151' },
  success: { bg: '#DCFCE7', fg: '#166534' },
  warning: { bg: '#FEF3C7', fg: '#92400E' },
  danger: { bg: '#FEE2E2', fg: '#991B1B' },
  info: { bg: '#E6E0F5', fg: '#452F82' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof badgeTones }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[typography.caption, { color: t.fg, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

export function Field({ label, error, style, ...input }: TextInputProps & { label: string; error?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        {...input}
        style={[
          styles.input,
          { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.inputBackground, color: colors.foreground },
          input.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
          style,
        ]}
      />
      {error && <Text style={[typography.caption, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <Text style={[typography.overline, { color: colors.mutedForeground, marginTop: 8 }]}>{children}</Text>;
}

/** "Fri 12 Oct, 3:30 PM" */
export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerSide: { width: 56 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  button: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, flex: 1 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
});
