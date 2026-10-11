// app/(app)/leads/_layout.tsx
import { useResetNavigationOnUnmount } from '@/hooks/use-reset-navigation';
import { Stack } from 'expo-router';

export default function LeadsLayout() {
  useResetNavigationOnUnmount('/(app)/leads')
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: true, 
          title: 'Lead Details',
          headerBackTitle: 'Back',
        }} 
      />
      <Stack.Screen 
        name="create" 
        options={{ 
          headerShown: true, 
          title: 'Create Lead',
          headerBackTitle: 'Back',
        }} 
      />
    </Stack>
  );
}