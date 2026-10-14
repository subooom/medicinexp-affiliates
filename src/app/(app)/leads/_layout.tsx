// app/(app)/leads/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';

// The Leads tab returns to its list when you leave it (popToTopOnBlur in (app)/_layout).
// It used to reset whenever it gained focus, which threw away a lead form opened from
// another screen (dashboard "New lead", a visit's "Convert to lead").
export default function LeadsLayout() {
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
