// app/auth/_layout.tsx
// No AuthProvider here: the root layout's one must be the only one. A second one made login
// sign in a copy the dashboard never saw ("Waiting for approval" until the app restarted).
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
