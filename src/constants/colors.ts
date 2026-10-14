/**
 * Medicinexp design tokens — mirrored from landing platform globals.css.
 * oklch values converted to hex for React Native compatibility.
 * Web uses CSS variables in global.css; native reads from here.
 */

export type ColorScheme = 'light' | 'dark';

export interface AppColors {
  background: string;
  backgroundForeground: string;
  foreground: string;
  card: string;
  cardForeground: string;
  cardAccent: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  primary50: string;
  primary100: string;
  primary200: string;
  primary300: string;
  primary400: string;
  primary500: string;
  primary600: string;
  primary700: string;
  primary800: string;
  primary900: string;
  primary950: string;
  green500: string;
  green600: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  inputBackground: string;
  ring: string;
  placeholder: string;
  icon: string;
  tabBar: string;
  tabBarBorder: string;
  header: string;
  headerForeground: string;
  success: string;
  warning: string;
  info: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

/** Light theme — harmonized with primary purple (#5A3DA8) */
export const lightColors: AppColors = {
  background: '#F8F7FC',
  backgroundForeground: '#1F1440',
  foreground: '#1E1B29',
  card: '#FFFFFF',
  cardForeground: '#1E1B29',
  cardAccent: '#704EC6',
  popover: '#FFFFFF',
  popoverForeground: '#1E1B29',
  primary: '#5A3DA8',
  primaryForeground: '#FFFFFF',
  primary50: '#F3F0FA',
  primary100: '#E6E0F5',
  primary200: '#C9BBEA',
  primary300: '#AB96DE',
  primary400: '#8E72D2',
  primary500: '#704EC6',
  primary600: '#5A3DA8',
  primary700: '#452F82',
  primary800: '#31215C',
  primary900: '#1C1336',
  primary950: '#130D24',
  green500: '#16A34A',
  green600: '#15803D',
  // Brand orange (--secondary in global.css): highlights, money and "grow" actions
  secondary: '#FF8A00',
  secondaryForeground: '#FFFFFF',
  muted: '#F1EFF5',
  mutedForeground: '#6E6880',
  accent: '#0D9488', // Teal accent that complements purple nicely
  accentForeground: '#FFFFFF',
  destructive: '#DC2626',
  border: '#E2DFEC',
  input: '#E2DFEC',
  inputBackground: '#FAF9FD',
  ring: '#8E72D2',
  placeholder: '#9CA3AF',
  icon: '#6E6880',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2DFEC',
  header: '#5A3DA8',
  headerForeground: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  info: '#0284C7',
  chart1: '#704EC6',
  chart2: '#0D9488',
  chart3: '#3B82F6',
  chart4: '#F59E0B',
  chart5: '#EC4899',
};

/** Dark theme — harmonized with primary indigo/purple (#7A7AFF) */
export const darkColors: AppColors = {
  background: '#0F0A1F',
  backgroundForeground: '#E4E0F0',
  foreground: '#F3F0FA',
  card: '#171030',
  cardForeground: '#F3F0FA',
  cardAccent: '#7A7AFF',
  popover: '#1E153E',
  popoverForeground: '#F3F0FA',
  primary: '#7A7AFF',
  primaryForeground: '#0F0A1F',
  primary50: '#130D24',
  primary100: '#1C1336',
  primary200: '#31215C',
  primary300: '#452F82',
  primary400: '#5A3DA8',
  primary500: '#704EC6',
  primary600: '#7A7AFF',
  primary700: '#9B87FF',
  primary800: '#BCB0FF',
  primary900: '#E6E0F5',
  primary950: '#F3F0FA',
  green500: '#22C55E',
  green600: '#16A34A',
  // Brand orange, a touch lighter so it pops on the dark background
  secondary: '#FF9A26',
  secondaryForeground: '#1A0F00',
  muted: '#1E153E',
  mutedForeground: '#9E95B8',
  accent: '#2DD4BF', // Vibrant teal contrast for dark mode
  accentForeground: '#0F0A1F',
  destructive: '#EF4444',
  border: '#2A1F52',
  input: '#31215C',
  inputBackground: '#130D24',
  ring: '#7A7AFF',
  placeholder: '#6E6880',
  icon: '#9E95B8',
  tabBar: '#171030',
  tabBarBorder: '#2A1F52',
  header: '#171030',
  headerForeground: '#F3F0FA',
  success: '#22C55E',
  warning: '#FBBF24',
  info: '#38BDF8',
  chart1: '#7A7AFF',
  chart2: '#2DD4BF',
  chart3: '#38BDF8',
  chart4: '#F472B6',
  chart5: '#FBBF24',
};

export const colors = { light: lightColors, dark: darkColors } as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
} as const;