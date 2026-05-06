import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../AuthContext';
import { colors, spacing, typography } from '../theme';

const HERO = require('../../assets/photo-worship.jpg');

// First-launch gate. Shown until the user either signs in or chooses to
// continue as a guest. Choice is persisted so they don't see this every time.
export function WelcomeScreen() {
  const { signIn, continueAsGuest, configured } = useAuth();

  return (
    <View style={styles.root}>
      <ImageBackground source={HERO} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(14,17,22,0.55)', 'rgba(14,17,22,0.85)', colors.inkDeep]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <Text style={styles.brand}>THE POINTE CHURCH</Text>
            <Text style={styles.brandSub}>COCOA BEACH · FL</Text>
          </View>

          <View style={styles.bottom}>
            <Text style={styles.eyebrow}>WELCOME HOME</Text>
            <Text style={styles.title}>You belong here.</Text>
            <Text style={styles.body}>
              Sign in with your Planning Center account for groups, events, and your
              account — or browse as a guest.
            </Text>

            <PrimaryButton
              label={configured ? 'Sign in with Planning Center' : 'Sign-in not yet configured'}
              variant="peach"
              onPress={signIn}
              style={{ marginTop: spacing.lg }}
            />

            <Pressable
              onPress={continueAsGuest}
              hitSlop={8}
              style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.guestLabel}>Continue as guest</Text>
            </Pressable>

            <Text style={styles.fineprint}>
              You can sign in anytime from Settings.
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inkDeep },
  bg: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  top: { paddingTop: spacing.lg },
  brand: {
    ...typography.label,
    color: colors.peach,
    fontSize: 12,
    letterSpacing: 2.4,
  },
  brandSub: {
    ...typography.label,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: spacing.xs,
    letterSpacing: 1.8,
  },
  bottom: { paddingBottom: spacing.lg },
  eyebrow: {
    ...typography.label,
    color: colors.peach,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    fontSize: 44,
    lineHeight: 48,
  },
  body: {
    ...typography.body,
    color: 'rgba(255,255,255,0.78)',
    marginTop: spacing.md,
    fontSize: 16,
    lineHeight: 24,
  },
  guestBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  guestLabel: {
    ...typography.h3,
    color: 'rgba(255,255,255,0.9)',
  },
  fineprint: {
    ...typography.small,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
