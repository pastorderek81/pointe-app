import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { youtubeLiveUrl } from '../media/youtube';
import { Palette, spacing, Typography, useColors, useTypography } from '../../theme';

// Shown at the very top of Home when a service is currently in progress.
// One-tap opens the channel's live URL (which YouTube auto-redirects to
// the active stream).
export function WatchLiveBanner() {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Pressable
      onPress={() => Linking.openURL(youtubeLiveUrl())}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.92 }]}
    >
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>We're live right now</Text>
        <Text style={styles.subtitle}>Tap to join the stream</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.live,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ffffff',
    },
    title: {
      ...typography.h3,
      color: '#ffffff',
    },
    subtitle: {
      ...typography.small,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    chev: {
      fontSize: 26,
      color: '#ffffff',
      opacity: 0.85,
      marginTop: -2,
    },
  });
}
