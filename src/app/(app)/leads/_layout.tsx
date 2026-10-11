// app/(app)/leads/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { useResetNavigationOnUnmount } from '@/hooks/use-reset-navigation';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';

export default function LeadsLayout() {
  useResetNavigationOnUnmount('/(app)/leads');
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { ...typography.h5, color: colors.foreground },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Lead', headerShown: true }} />
      <Stack.Screen name="create" options={{ title: 'New lead', headerShown: true, presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit lead', headerShown: true, presentation: 'modal' }} />
    </Stack>
  );
}
