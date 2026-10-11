// app/(app)/organizations/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Stack } from 'expo-router';

export default function OrganizationsLayout() {
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
          title: 'My Organizations',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Organization Details',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="create" 
        options={{ 
          title: 'Create Organization',
          headerShown: true,
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="edit/[id]" 
        options={{ 
          title: 'Edit Organization',
          headerShown: true,
          presentation: 'modal',
        }} 
      />
    </Stack>
  );
}