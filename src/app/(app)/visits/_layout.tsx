// app/(app)/visits/_layout.tsx
import { Stack } from 'expo-router';

export default function VisitsLayout() {
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false, 
          title: 'Visit Details',
          headerBackTitle: 'Back',
        }} 
      />
      <Stack.Screen 
        name="checkin" 
        options={{ 
          headerShown: false, 
          title: 'Check In',
          headerBackTitle: 'Back',
        }} 
      />
    </Stack>
  );
}