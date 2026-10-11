// app/(app)/venues/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';

export default function VenuesLayout() {
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
      {/* The list draws its own header */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Details', headerShown: true }} />
      <Stack.Screen name="create" options={{ title: 'Add a pharmacy', headerShown: true, presentation: 'modal' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Edit', headerShown: true, presentation: 'modal' }} />
    </Stack>
  );
}
