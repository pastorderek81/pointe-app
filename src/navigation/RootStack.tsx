import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootTabs } from './RootTabs';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { SeriesDetailScreen } from '../features/media/SeriesDetailScreen';
import { WelcomeScreen } from '../features/welcome/WelcomeScreen';
import { useAuth } from '../core/AuthContext';

const Stack = createNativeStackNavigator();

// Conditional root: Welcome is the only screen until the user has either
// signed in or explicitly chosen guest mode. Once that flips, they see
// the tabs and can never accidentally land back on Welcome.
export function RootStack() {
  const { hasOnboarded } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {hasOnboarded ? (
        <>
          <Stack.Screen name="Tabs" component={RootTabs} />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      )}
    </Stack.Navigator>
  );
}
