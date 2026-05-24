import React from 'react';
import { Dimensions, ImageBackground, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '../../theme';
import { LiveBadge } from './LiveBadge';
import { HeroCarousel } from './HeroCarousel';

// Hero shows the series graphic (single image or auto-advancing carousel
// when multiple are set in the admin) at its natural 16:9 ratio, with a
// small dark top bar above for the gear icon, and a dark gradient text
// section below for eyebrow / title / subtitle. Status bar padding is
// handled by an outer SafeAreaView in HomeScreen.
// TOPBAR_HEIGHT is the gear-icon row height. Bumping it up gives the gear
// (and the image below it) breathing room from the top of the screen.
const TOPBAR_HEIGHT = 88;

export function Hero({
  images,
  eyebrow,
  title,
  subtitle,
  isLive,
  rightSlot,
}: {
  // Always at least one image — caller falls back to a bundled asset if
  // remote content is empty.
  images: ImageSourcePropType[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  isLive?: boolean;
  rightSlot?: React.ReactNode;
}) {
  // Slightly taller than 16:9 for a more editorial feel — 16:9 source images
  // get a small ~10% horizontal crop on each side.
  const baseImageHeight = Math.round((Dimensions.get('window').width * 10) / 16);

  return (
    <View style={styles.wrap}>
      <View style={[styles.topBar, { height: TOPBAR_HEIGHT }]}>
        {isLive ? <LiveBadge /> : null}
        <View style={{ flex: 1 }} />
        {rightSlot}
      </View>

      {images.length > 1 ? (
        <HeroCarousel images={images} height={baseImageHeight} />
      ) : (
        <ImageBackground
          source={images[0]}
          style={[styles.art, { height: baseImageHeight }]}
          resizeMode="cover"
        />
      )}

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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  art: {
    width: '100%',
    backgroundColor: colors.inkSurface,
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
