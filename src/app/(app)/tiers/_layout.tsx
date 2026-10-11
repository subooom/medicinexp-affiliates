// app/(app)/tiers/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';

export default function TiersLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          ...typography.h5,
          color: colors.foreground,
        },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Tiers & Rewards',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Tier Details',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}