// app/(app)/_layout.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

// Routes reachable from screens but not shown in the tab bar. Every route in (app)
// that isn't a tab must be listed here, or expo-router adds it as an extra tab.
const HIDDEN_ROUTES = [
  'tiers',
  'venues',
  'distributions',
  'call-logs',
  'materials',
  'referral',
  'coupons',
  'meetups',
  'inventory',
  'pickups',
  'pitch',
  'map',
  'sync',
  'leaderboard',
];

export default function AppLayout() {
  const { colors } = useAppTheme();

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
      <Tabs.Screen name="leads" options={{ title: 'Leads', freezeOnBlur: true, popToTopOnBlur: true }} />
      <Tabs.Screen name="commissions" options={{ title: 'Earnings', popToTopOnBlur: true }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

      {HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
