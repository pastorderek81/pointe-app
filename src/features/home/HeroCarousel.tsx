// Auto-advancing horizontal image carousel for the Hero. Supports manual
// swipe (auto-advance pauses for a few seconds after manual interaction).
// Renders dot indicators along the bottom of the image area.
//
// Used by Hero when the admin has set 2+ hero images. For 1 image, Hero
// renders a plain ImageBackground instead.
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const ADVANCE_INTERVAL_MS = 5000;
const RESUME_AFTER_MANUAL_MS = 10000;

export function HeroCarousel({
  images,
  height,
}: {
  images: ImageSourcePropType[];
  height: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance — runs while not paused and there's more than one image.
  useEffect(() => {
    if (paused || images.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, ADVANCE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, images.length]);

  // Animate to the current index when it changes (e.g., from auto-advance).
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  }, [index, screenWidth]);

  const onScrollBegin = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (newIndex !== index) setIndex(newIndex);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER_MANUAL_MS);
  };

  return (
    <View style={{ height }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBegin}
        onMomentumScrollEnd={onMomentumEnd}
        // Tell the parent vertical ScrollView to win for vertical gestures
        // — horizontal swipes still go to this carousel.
        directionalLockEnabled
      >
        {images.map((src, i) => (
          <ImageBackground
            key={i}
            source={src}
            style={[styles.slide, { width: screenWidth, height }]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {images.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: '#1f2329',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 18,
  },
});
