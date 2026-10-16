import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../core/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';

const HERO = require('../../../assets/photo-worship.jpg');

// First-launch gate. Shown until the user either signs in or chooses to
// continue as a guest. Choice is persisted so they don't see this every time.
export function WelcomeScreen() {
  const { startSignIn, startSignUp, continueAsGuest, configured, authError } = useAuth();

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
              Sign in for your groups, events, and more — or look around as a guest.
            </Text>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorTitle}>Sign-in failed</Text>
                <Text style={styles.errorBody}>{authError}</Text>
              </View>
            ) : null}

            {/* Planning Center is explained on the next sheet, after they've
                chosen — naming it up front scared people off signing in. */}
            <PrimaryButton
              label={configured ? 'Sign in' : 'Sign-in not yet configured'}
              variant="peach"
              onPress={startSignIn}
              style={{ marginTop: spacing.lg }}
            />

            <Pressable
              onPress={startSignUp}
              style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
            >
              <Text style={styles.outlineLabel}>Set up an account</Text>
            </Pressable>

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
  outlineBtn: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  outlineLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: 0.2,
    color: colors.white,
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
  errorBanner: {
    backgroundColor: 'rgba(230, 57, 70, 0.18)',
    borderColor: 'rgba(230, 57, 70, 0.7)',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    color: '#fca5a5',
    fontSize: 13,
  },
  errorBody: {
    ...typography.small,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 17,
  },
});
