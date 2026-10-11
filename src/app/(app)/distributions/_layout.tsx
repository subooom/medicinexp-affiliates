// app/(app)/distributions/_layout.tsx
import { Stack } from 'expo-router';

export default function DropoffsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
