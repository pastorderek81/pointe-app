import React from 'react';
import { useWindowDimensions } from 'react-native';
import { FontScaleCap, Text } from '../components/Text';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../features/home/HomeScreen';
import { MediaScreen } from '../features/media/MediaScreen';
import { GivingScreen } from '../features/giving/GivingScreen';
import { GroupsScreen } from '../features/groups/GroupsScreen';
import { EventsScreen } from '../features/events/EventsScreen';
import { useColors, useTypography } from '../theme';

const Tab = createBottomTabNavigator();

// Lightweight glyph icons — no external icon dep needed for v1.
function TabIcon({ glyph, color, focused }: { glyph: string; color: string; focused: boolean }) {
  return (
    <Text
      maxFontSizeMultiplier={FontScaleCap.icon}
      style={{ fontSize: focused ? 20 : 18, color, opacity: focused ? 1 : 0.85 }}
    >
      {glyph}
    </Text>
  );
}

export function RootTabs() {
  const colors = useColors();
  const typography = useTypography();
  // The bar used to be a fixed 84pt tall, so with a larger phone text size
  // the labels got pushed into the bottom edge. Labels now grow (up to a
  // cap) and the bar grows with them. At normal text size it's unchanged.
  const { fontScale } = useWindowDimensions();
  const labelScale = Math.min(Math.max(fontScale, 1), FontScaleCap.control);
  const barHeight = 84 + Math.ceil(16 * (labelScale - 1));
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.skyDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: barHeight,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={FontScaleCap.control}
            style={{
              color,
              fontFamily: typography.label.fontFamily,
              fontSize: 10,
              letterSpacing: 1.0,
              marginTop: 2,
              textAlign: 'center',
            }}
          >
            {children}
          </Text>
        ),
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
