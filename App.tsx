import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider } from './src/AuthContext';
import { RootStack } from './src/navigation/RootStack';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          theme={{
            dark: false,
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
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
