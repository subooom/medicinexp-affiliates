// src/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { VisitsListScreen } from '@/screens/Visits/VisitsListScreen';
import { LeadsListScreen } from '@/screens/Leads/LeadsListScreen';
import { CommissionsListScreen } from '@/screens/Commissions/CommissionsListScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Visits':
              iconName = focused ? 'location' : 'location-outline';
              break;
            case 'Leads':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Commissions':
              iconName = focused ? 'cash' : 'cash-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Visits" component={VisitsListScreen} />
      <Tab.Screen name="Leads" component={LeadsListScreen} />
      <Tab.Screen name="Commissions" component={CommissionsListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}