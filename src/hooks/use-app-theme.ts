import { AppColors, ColorScheme, colors, radius } from '@/constants/colors';
import { typography } from '@/styles/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppTheme() {
  const scheme = useColorScheme();
  const colorScheme: ColorScheme = scheme === 'dark' ? 'dark' : 'light';
  const themeColors: AppColors = colors[colorScheme];

  return {
    colors: themeColors,
    colorScheme,
    isDark: colorScheme === 'dark',
    typography,
    radius,
  };
}

export type AppTheme = ReturnType<typeof useAppTheme>;
