// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { VisitDetailsScreen } from '../screens/Visits/VisitDetailScreen';
import { CheckInScreen } from '../screens/Visits/CheckInScreen';
import { LeadDetailsScreen } from '../screens/Leads/LeadsDetailsScreen';
import { CreateLeadScreen } from '../screens/Leads/CreateLeadScreen';

const Stack = createStackNavigator();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen 
              name="VisitDetails" 
              component={VisitDetailsScreen}
              options={{ headerShown: true, title: 'Visit Details' }}
            />
            <Stack.Screen 
              name="CheckIn" 
              component={CheckInScreen}
              options={{ headerShown: true, title: 'Check In' }}
            />
            <Stack.Screen 
              name="LeadDetails" 
              component={LeadDetailsScreen}
              options={{ headerShown: true, title: 'Lead Details' }}
            />
            <Stack.Screen 
              name="CreateLead" 
              component={CreateLeadScreen}
              options={{ headerShown: true, title: 'Create Lead' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}