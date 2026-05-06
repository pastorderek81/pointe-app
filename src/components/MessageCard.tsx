import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, spacing, typography } from '../theme';

// Netflix-style message card. Used for "Latest Message" on Home and the
// featured slot on the Media screen.
export function MessageCard({
  thumbnailUrl,
  title,
  meta,
  fallbackSource,
  onPress,
  size = 'large',
}: {
  thumbnailUrl?: string | null;
  fallbackSource?: any;
  title: string;
  meta?: string;
  onPress?: () => void;
  size?: 'large' | 'small';
}) {
  const source = thumbnailUrl ? { uri: thumbnailUrl } : fallbackSource;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
      <View style={[styles.wrap, size === 'small' && styles.small, shadow.card]}>
        <ImageBackground source={source} style={styles.bg} resizeMode="cover">
          <LinearGradient
            colors={['rgba(14,17,22,0)', 'rgba(14,17,22,0.85)']}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.playPill}>
            <Text style={styles.playGlyph}>▶</Text>
            <Text style={styles.playLabel}>WATCH</Text>
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, size === 'small' && styles.titleSmall]} numberOfLines={2}>
              {title}
            </Text>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
        </ImageBackground>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.inkSurface,
  },
  small: { height: 160 },
  bg: { flex: 1, justifyContent: 'flex-end' },
  text: { padding: spacing.md },
  title: {
    ...typography.h1,
    color: colors.white,
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
    color: colors.ink,
  },
  playLabel: {
    ...typography.label,
    color: colors.ink,
    fontSize: 10,
  },
});
