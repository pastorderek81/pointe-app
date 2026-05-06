import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { MediaScreen } from '../screens/MediaScreen';
import { GivingScreen } from '../screens/GivingScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator();

// Lightweight glyph icons — no external icon dep needed for v1.
function TabIcon({ glyph, color, focused }: { glyph: string; color: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 20 : 18, color, opacity: focused ? 1 : 0.85 }}>{glyph}</Text>
  );
}

export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.skyDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabelStyle: {
          fontFamily: typography.label.fontFamily,
          fontSize: 10,
          letterSpacing: 1.0,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: (p) => <TabIcon glyph="◆" {...p} /> }}
      />
      <Tab.Screen
        name="Media"
        component={MediaScreen}
        options={{ tabBarIcon: (p) => <TabIcon glyph="▶" {...p} /> }}
      />
      <Tab.Screen
        name="Giving"
        component={GivingScreen}
        options={{ tabBarIcon: (p) => <TabIcon glyph="♡" {...p} /> }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ tabBarIcon: (p) => <TabIcon glyph="◉" {...p} /> }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarIcon: (p) => <TabIcon glyph="◇" {...p} /> }}
      />
    </Tab.Navigator>
  );
}
