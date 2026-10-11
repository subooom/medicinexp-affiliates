// app/_layout.tsx
import { AuthProvider } from '@/context/AuthContext';
import { SyncProvider } from '@/offline/sync-provider';
// Defines the background sync task; must load before the app renders
import '@/offline/sync';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCustomFonts } from '@/hooks/use-fonts';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[typography.body2, { color: colors.mutedForeground, marginTop: 12 }]}>Loading...</Text>
    </View>
  );
}

export default function RootLayout() {
  const fontsLoaded = useCustomFonts();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <SyncProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="index" />
      </Stack>
      </SyncProvider>
    </AuthProvider>
  );
}