// app/(app)/_layout.tsx
import { TeamUpHost } from '@/components/team-up/team-up-host';
import { useAppTheme } from '@/hooks/use-app-theme';
import { autoSyncContacts } from '@/utils/contact-sync';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

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
  'team-up',
  'guide',
  'earn',
];

export default function AppLayout() {
  const { colors } = useAppTheme();

  // Phone contacts: refreshed once a day if allowed, else offered once (after the screen settles)
  useEffect(() => {
    const timer = setTimeout(() => autoSyncContacts(), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
    <Tabs
      // Back returns to the screen you came from (e.g. Profile -> Pitch kit -> Back = Profile),
      // not to the first tab. Hidden routes are tabs too, so the default sent them to the dashboard.
      backBehavior="history"
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
    {/* Team-up requests and the split bar, over any screen */}
    <TeamUpHost />
    </>
  );
}
