// app/(app)/commissions/_layout.tsx
import { Stack } from 'expo-router';

// The Earnings tab returns to its list when you leave it (popToTopOnBlur in (app)/_layout)
export default function CommissionsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
