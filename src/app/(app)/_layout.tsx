// app/(app)/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

export default function AppLayout() {
  const { colors } = useAppTheme();
  // useResetNavigationOnUnmount('./index');

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          switch (route.name) {
            case 'index':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'visits':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'leads':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'commissions':
              iconName = focused ? 'cash' : 'cash-outline';
              break;
            case 'profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits' }} />
      <Tabs.Screen name="leads"  options={{ title: 'Leads', freezeOnBlur: true, }} />
      <Tabs.Screen name="commissions" options={{ title: 'Commissions' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      
      {/* ⚠️ IMPORTANT: These screens exist but are NOT in the tab bar */}
      {/* They can still be accessed via navigation */}
      <Tabs.Screen 
        name="tiers" 
        options={{ 
          href: null, // This hides it from the tab bar
        }} 
      />
      <Tabs.Screen 
        name="venues" 
        options={{ 
          headerShown: false,
          href: null, // This hides it from the tab bar
        }} 
      />
      <Tabs.Screen 
        name="distributions" 
        options={{ 
          headerShown: false,
          href: null, // This hides it from the tab bar
        }} 
      />
      <Tabs.Screen 
        name="call-logs" 
        options={{ 
          headerShown: false,
          href: null, // This hides it from the tab bar
        }} 
      />
      <Tabs.Screen 
        name="meetups" 
        options={{ 
          href: null, // ✅ Hides meetups from tab bar
        }} 
      />
      <Tabs.Screen 
        name="inventory" 
        options={{ 
          href: null, // This hides it from the tab bar
        }} 
      />
    </Tabs>
  );
}
