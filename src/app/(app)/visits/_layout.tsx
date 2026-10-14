// app/(app)/visits/_layout.tsx
import { Stack } from 'expo-router';

// Opening a visit or check-in from another tab (dashboard) with { withAnchor: true }
// puts the visits list underneath, so Back lands on the list instead of the dashboard
export const unstable_settings = {
  initialRouteName: 'index',
};

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