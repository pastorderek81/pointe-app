import React, { useMemo } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { FontScaleCap, Text } from '../../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, radius, shadow, spacing, Typography, useColors, useTypography } from '../../theme';

// Netflix-style message card. Used for "Latest Message" on Home and the
// featured slot on the Media screen.
export function MessageCard({
  thumbnailUrl,
  title,
  meta,
  fallbackSource,
  onPress,
  size = 'large',
  saved,
  onToggleSave,
}: {
  thumbnailUrl?: string | null;
  fallbackSource?: any;
  title: string;
  meta?: string;
  onPress?: () => void;
  size?: 'large' | 'small';
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const source = thumbnailUrl ? { uri: thumbnailUrl } : fallbackSource;
  return (
    <View style={[styles.wrap, size === 'small' && styles.small, shadow.card]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.fill, pressed && { opacity: 0.92 }]}
      >
        <ImageBackground source={source} style={styles.bg} resizeMode="cover">
          <LinearGradient
            colors={['rgba(14,17,22,0)', 'rgba(14,17,22,0.85)']}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.playPill}>
            <Text maxFontSizeMultiplier={FontScaleCap.control} style={styles.playGlyph}>▶</Text>
            <Text maxFontSizeMultiplier={FontScaleCap.control} style={styles.playLabel}>WATCH</Text>
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, size === 'small' && styles.titleSmall]} numberOfLines={2}>
              {title}
            </Text>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
        </ImageBackground>
      </Pressable>
      {onToggleSave ? (
        <Pressable
          onPress={onToggleSave}
          hitSlop={8}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
        >
          <Text
            maxFontSizeMultiplier={FontScaleCap.icon}
            style={[styles.saveGlyph, saved && { color: colors.peachDeep }]}
          >
            {saved ? '♥' : '♡'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    // minHeight (not height) so the card grows with larger text sizes
    // instead of clipping the title.
    wrap: {
      minHeight: 240,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.inkSurface,
    },
    fill: { flex: 1 },
    small: { minHeight: 160 },
    bg: { flex: 1, justifyContent: 'flex-end' },
    // paddingTop keeps room for the WATCH pill and heart button, which sit
    // on top of the image. Text is bottom-aligned, so at normal sizes this
    // changes nothing; with large text the card grows rather than letting
    // the title run under those buttons.
    text: { padding: spacing.md, paddingTop: spacing.md + 40 + spacing.sm },
    title: {
      ...typography.h1,
      color: '#ffffff',
    },
    titleSmall: { fontSize: 18, lineHeight: 23 },
    meta: {
      ...typography.small,
      color: colors.inkMuted,
      marginTop: spacing.xs,
    },
    playPill: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.92)',
      gap: 6,
    },
    playGlyph: {
      fontSize: 11,
      color: '#1a1a1a',
    },
    playLabel: {
      ...typography.label,
      color: '#1a1a1a',
      fontSize: 10,
    },
    saveBtn: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    saveGlyph: {
      fontSize: 22,
      lineHeight: 24,
      color: '#1a1a1a',
    },
  });
}
