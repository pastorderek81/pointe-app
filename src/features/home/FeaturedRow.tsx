import React, { useMemo } from 'react';
import { ImageBackground, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Palette, radius, shadow, spacing, Typography, useColors, useTypography } from '../../theme';

const CARD_W = 300;
const CARD_H = 200;

export type FeaturedCard = {
  id: string;
  title: string;
  dateLabel: string;
  url: string;
  image: ImageSourcePropType; // require() result or { uri }
};

export function FeaturedRow({ events }: { events: FeaturedCard[] }) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const open = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.skyDeep,
      toolbarColor: colors.paper,
    });
  };

  if (events.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      decelerationRate="fast"
      snapToInterval={CARD_W + spacing.md}
      snapToAlignment="start"
    >
      {events.map((e) => (
        <Pressable
          key={e.id}
          onPress={() => open(e.url)}
          style={({ pressed }) => [styles.cardWrap, shadow.card, pressed && { opacity: 0.92 }]}
        >
          <ImageBackground source={e.image} style={styles.bg} resizeMode="cover">
            <LinearGradient
              colors={['rgba(14,17,22,0)', 'rgba(14,17,22,0.85)']}
              locations={[0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.text}>
              <Text style={styles.eyebrow}>{e.dateLabel}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {e.title}
              </Text>
            </View>
          </ImageBackground>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    cardWrap: {
      width: CARD_W,
      height: CARD_H,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: colors.inkSurface,
    },
    bg: { flex: 1, justifyContent: 'flex-end' },
    text: { padding: spacing.md },
    eyebrow: {
      ...typography.label,
      // Peach + white stay constant — these read on a dark image gradient
      // regardless of light or dark mode.
      color: '#ffd5b8',
      fontSize: 11,
      letterSpacing: 1.6,
    },
    title: {
      ...typography.h1,
      color: '#ffffff',
      fontSize: 26,
      lineHeight: 30,
      marginTop: spacing.xs,
    },
  });
}
