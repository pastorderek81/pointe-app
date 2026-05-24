import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Palette, radius, spacing, useColors } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  variant = 'sky',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'sky' | 'peach' | 'ghost';
  style?: ViewStyle;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const palette = {
    sky: { bg: colors.skyDeep, fg: colors.white, border: colors.skyDeep },
    peach: { bg: colors.peachDeep, fg: colors.white, border: colors.peachDeep },
    ghost: { bg: 'transparent', fg: colors.skyDeep, border: colors.line },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(_colors: Palette) {
  return StyleSheet.create({
    btn: {
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
      letterSpacing: 0.2,
    },
  });
}
