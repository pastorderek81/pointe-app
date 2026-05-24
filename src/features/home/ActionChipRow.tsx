import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Palette, radius, spacing, Typography, useColors, useTypography } from '../../theme';

export type Chip = {
  key: string;
  label: string;
  glyph: string; // simple unicode glyph; swap for icon set later
  onPress: () => void;
  tone?: 'sky' | 'peach' | 'neutral';
};

export function ActionChipRow({ chips }: { chips: Chip[] }) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((c) => (
        <ActionChip key={c.key} chip={c} />
      ))}
    </ScrollView>
  );
}

function ActionChip({ chip }: { chip: Chip }) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const tones = {
    sky: { bg: colors.skyBg, fg: colors.skyDeep, border: colors.skySoft },
    peach: { bg: colors.peachSoft, fg: colors.peachInk, border: colors.peach },
    neutral: { bg: colors.white, fg: colors.ink, border: colors.line },
  };
  const tone = tones[chip.tone ?? 'neutral'];
  return (
    <Pressable
      onPress={chip.onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: tone.bg, borderColor: tone.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.glyph, { color: tone.fg }]}>{chip.glyph}</Text>
      <Text style={[styles.label, { color: tone.fg }]}>{chip.label}</Text>
    </Pressable>
  );
}

function makeStyles(_colors: Palette, typography: Typography) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm + 2,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.pill,
      borderWidth: 1,
      gap: 8,
    },
    glyph: { fontSize: 16 },
    label: { ...typography.h3, fontSize: 14 },
  });
}
