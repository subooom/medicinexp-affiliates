// app/(app)/call-logs/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';

export default function CallLogsLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { ...typography.h5, color: colors.foreground },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerShown: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" options={{ title: 'Log a call', headerShown: true, presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Call', headerShown: true }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit call', headerShown: true, presentation: 'modal' }} />
    </Stack>
  );
}
