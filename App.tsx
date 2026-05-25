import React, { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from './src/core/AuthContext';
import { RootStack } from './src/navigation/RootStack';
import { syncPushRegistration } from './src/core/push';
import { ColorPreference, ThemeProvider, useColors, useScheme } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const THEME_PREFERENCE_KEY = 'theme_preference_v1';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Load the user's saved theme preference before first render so we don't
  // briefly flash the wrong scheme. Default to 'auto' (follow system) for
  // new installs — feels native and matches what most modern apps do.
  const [initialPreference, setInitialPreference] = useState<ColorPreference | null>(null);
  useEffect(() => {
    let cancelled = false;
    // On older iOS in some keychain states, SecureStore can hang without
    // resolving or rejecting. Don't let that pin the splash screen forever.
    const timeout = setTimeout(() => {
      if (!cancelled) setInitialPreference('auto');
    }, 1500);
    SecureStore.getItemAsync(THEME_PREFERENCE_KEY)
      .then((v) => {
        if (cancelled) return;
        clearTimeout(timeout);
        const valid: ColorPreference =
          v === 'dark' || v === 'light' || v === 'auto' ? v : 'auto';
        setInitialPreference(valid);
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(timeout);
        setInitialPreference('auto');
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && initialPreference) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, initialPreference]);

  // Re-sync the push token on every launch (handles token rotation, new
  // installs after restoring from backup, etc). No-op if the user hasn't
  // granted permission yet.
  useEffect(() => {
    syncPushRegistration();
  }, []);

  if (!fontsLoaded || !initialPreference) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider
        initialPreference={initialPreference}
        onPreferenceChange={(p) => {
          // Best-effort persist; failure is non-fatal — user's preference
          // just won't survive a restart.
          SecureStore.setItemAsync(THEME_PREFERENCE_KEY, p).catch(() => {});
        }}
      >
        <ThemedShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedShell() {
  const colors = useColors();
  const [scheme] = useScheme();

  // OTA "Update available — Reload?" prompt. expo-updates downloads the new
  // bundle in the background; we prompt once per session when it's ready so
  // users see the change immediately instead of next cold start. Falls
  // through harmlessly in dev / Expo Go (the hook returns false there).
  const { isUpdatePending } = useUpdates();
  const updatePromptedRef = useRef(false);
  useEffect(() => {
    if (!isUpdatePending || updatePromptedRef.current) return;
    updatePromptedRef.current = true;
    Alert.alert(
      'App updated',
      'A new version of the app is ready. Reload now to use it?',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Reload', onPress: () => Updates.reloadAsync() },
      ],
    );
  }, [isUpdatePending]);

  return (
    <AuthProvider>
      <NavigationContainer
        theme={{
          dark: scheme === 'dark',
          colors: {
            primary: colors.skyDeep,
            background: colors.paper,
            card: colors.white,
            text: colors.ink,
            border: colors.line,
            notification: colors.peachDeep,
          },
          fonts: {
            regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
            medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
            bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
            heavy: { fontFamily: 'Inter_800ExtraBold', fontWeight: '800' },
          },
        }}
      >
        <RootStack />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </NavigationContainer>
    </AuthProvider>
  );
}
