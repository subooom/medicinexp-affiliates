/**
 * Medicinexp theme tokens — shared between web (CSS vars) and native (TS).
 */

import '@/global.css';

import { AppColors, colors, radius } from '@/constants/colors';
import { Platform } from 'react-native';

export { AppColors, colors, radius, lightColors, darkColors } from '@/constants/colors';
export type { ColorScheme } from '@/constants/colors';

/** @deprecated Use useAppTheme() for full token access */
export const Colors = {
  light: {
    text: colors.light.foreground,
    background: colors.light.background,
    backgroundElement: colors.light.muted,
    backgroundSelected: colors.light.primary100,
    textSecondary: colors.light.mutedForeground,
    primary: colors.light.primary,
  },
  dark: {
    text: colors.dark.foreground,
    background: colors.dark.background,
    backgroundElement: colors.dark.muted,
    backgroundSelected: colors.dark.primary200,
    textSecondary: colors.dark.mutedForeground,
    primary: colors.dark.primary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'JosefinSans-Regular',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'JosefinSans-Regular',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export function getColors(scheme: 'light' | 'dark'): AppColors {
  return colors[scheme];
}
