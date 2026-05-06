import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

// Small "Sign in for more" prompt shown above Groups/Events lists when the
// user is browsing as a guest. Read-only data still loads — this just nudges
// them toward sign-in for RSVPs, group joining, etc.
export function GuestBanner({ onSignIn, configured }: { onSignIn: () => void; configured: boolean }) {
  return (
    <Pressable
      onPress={onSignIn}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {configured ? 'Sign in for more' : 'Sign-in not yet configured'}
        </Text>
        <Text style={styles.body}>
          {configured
            ? "You're viewing as a guest. Sign in to RSVP, join groups, and see your serving schedule."
            : 'Once OAuth is set up, signed-in members get RSVPs + personalized data.'}
        </Text>
      </View>
      {configured ? <Text style={styles.chev}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inkDeep,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  title: { ...typography.h3, color: colors.peach },
  body: {
    ...typography.small,
    color: colors.inkMuted,
    marginTop: 2,
  },
  chev: { fontSize: 22, color: colors.peach, opacity: 0.7 },
});
