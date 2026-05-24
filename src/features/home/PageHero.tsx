// Card-style hero used at the top of sub-pages (Groups, Events). Auto-
// cycling carousel + dark text section below, with the image fading
// smoothly into the text area via a gradient — same visual pattern as
// the Life Church app's hero.
//
// The card is intentionally always dark in both light and dark mode (it's
// a "cinematic" element), so most styles use the static dark accent colors
// that don't flip between palettes — and a few literal whites/inks where
// the meaning is "always X" rather than "card surface."
import React, { useMemo } from 'react';
import {
  Dimensions,
  ImageBackground,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { HeroCarousel } from './HeroCarousel';
import { HeroContent } from './content';
import { Palette, radius, shadow, spacing, Typography, useColors, useTypography } from '../../theme';

const SIDE_PADDING = spacing.lg;

export function PageHero({ hero }: { hero: HeroContent }) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const openCta = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.skyDeep,
      toolbarColor: colors.paper,
    });
  };

  const sources: ImageSourcePropType[] = hero.images.length > 0
    ? hero.images.map((url) => ({ uri: url }))
    : hero.imageUrl
    ? [{ uri: hero.imageUrl }]
    : [];

  const hasText = !!(hero.eyebrow || hero.title || hero.subtitle);
  const hasCta = !!(hero.ctaLabel && hero.ctaUrl);

  if (sources.length === 0 && !hasText && !hasCta) return null;

  const cardWidth = Dimensions.get('window').width - SIDE_PADDING * 2;
  const imageHeight = Math.round((cardWidth * 4) / 3);

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, shadow.card]}>
        {sources.length > 0 && (
          <View style={{ height: imageHeight }}>
            {sources.length > 1 ? (
              <HeroCarousel images={sources} height={imageHeight} />
            ) : (
              <ImageBackground
                source={sources[0]}
                style={[styles.art, { height: imageHeight }]}
                resizeMode="cover"
              />
            )}

            {(hasText || hasCta) && (
              <LinearGradient
                colors={['transparent', colors.inkDeep]}
                locations={[0.0, 0.95]}
                style={styles.fade}
                pointerEvents="none"
              />
            )}
          </View>
        )}

        {(hasText || hasCta) && (
          <View style={styles.textSection}>
            {hero.eyebrow ? <Text style={styles.eyebrow}>{hero.eyebrow}</Text> : null}
            {hero.title ? (
              <Text style={styles.title} numberOfLines={3}>
                {hero.title}
              </Text>
            ) : null}
            {hero.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={4}>
                {hero.subtitle}
              </Text>
            ) : null}
            {hasCta && (
              <Pressable
                onPress={() => openCta(hero.ctaUrl!)}
                style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.ctaLabel}>{hero.ctaLabel}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: SIDE_PADDING,
      marginBottom: spacing.lg,
    },
    card: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.inkDeep,
    },
    art: {
      width: '100%',
    },
    fade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: '45%',
    },
    textSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: 0,
      paddingBottom: spacing.lg + spacing.md,
      alignItems: 'center',
    },
    eyebrow: {
      ...typography.label,
      color: colors.peach,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    title: {
      ...typography.h1,
      // Always white — sits on a dark card in both light and dark modes.
      color: '#ffffff',
      fontSize: 30,
      lineHeight: 34,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: colors.inkMuted,
      marginTop: spacing.sm,
      fontSize: 15,
      textAlign: 'center',
    },
    ctaBtn: {
      marginTop: spacing.lg,
      // Always white pill so it stands out against the dark card in both modes.
      backgroundColor: '#ffffff',
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      alignSelf: 'stretch',
    },
    ctaLabel: {
      ...typography.h2,
      // Always dark — text on a white pill.
      color: '#1a1a1a',
      fontSize: 16,
      textAlign: 'center',
    },
  });
}
