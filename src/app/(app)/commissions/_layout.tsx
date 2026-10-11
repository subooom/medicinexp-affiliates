// app/(app)/commissions/_layout.tsx
import { useResetNavigationOnUnmount } from '@/hooks/use-reset-navigation';
import { Stack } from 'expo-router';

export default function CommissionsLayout() {
  useResetNavigationOnUnmount('/(app)/commissions')

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}