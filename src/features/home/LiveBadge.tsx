import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Palette, radius, spacing, Typography, useColors, useTypography } from '../../theme';

export function LiveBadge() {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.label}>LIVE</Text>
    </View>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.live,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      gap: spacing.xs + 2,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#ffffff',
    },
    label: {
      ...typography.label,
      color: '#ffffff',
      fontSize: 11,
      letterSpacing: 1.6,
    },
  });
}
