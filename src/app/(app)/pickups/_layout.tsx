// app/(app)/pickups/_layout.tsx — screens draw their own header (ScreenHeader)
import { Stack } from 'expo-router';

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
