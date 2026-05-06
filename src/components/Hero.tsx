import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../theme';
import { LiveBadge } from './LiveBadge';

// Hero shows the full 16:9 series graphic (no crop) with a dark text
// section below for eyebrow / title / subtitle. Text never overlaps the
// designed art — same pattern Spotify and Apple Music use for album pages.
export function Hero({
  source,
  eyebrow,
  title,
  subtitle,
  isLive,
  rightSlot,
}: {
  source: any;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  isLive?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={{ flex: 1 }} />
        {rightSlot}
      </SafeAreaView>

      <ImageBackground source={source} style={styles.art} resizeMode="cover">
        {isLive ? (
          <View style={styles.livePos}>
            <LiveBadge />
          </View>
        ) : null}
      </ImageBackground>

      <LinearGradient
        colors={['rgba(14,17,22,0.96)', colors.inkDeep]}
        style={styles.textSection}
      >
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.inkDeep,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // 16:9 ratio = no crop on a 1920x1080 series graphic.
  art: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.inkSurface,
  },
  livePos: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  textSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: colors.peach,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    fontSize: 34,
    lineHeight: 38,
  },
  subtitle: {
    ...typography.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
