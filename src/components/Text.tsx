// Drop-in replacement for React Native's <Text> that keeps the phone's
// "larger text" setting working without letting it break our layouts.
//
// Text still grows with the user's font size, but only up to a ceiling:
//   - body / small text (under 18pt):  up to 1.6x
//   - mid-size headings (18–23pt):     up to 1.45x
//   - big titles (24pt and up):        up to 1.3x  (already easy to read)
// Any <Text maxFontSizeMultiplier={…}> passed explicitly wins, so a
// fixed-size icon glyph can opt out with maxFontSizeMultiplier={1}.
//
// Import this instead of Text from 'react-native' in app code.
import React, { forwardRef } from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';

export const FontScaleCap = {
  body: 1.6,
  heading: 1.45,
  title: 1.3,
  // Buttons, pills, tab labels: compact UI that sits in a fixed shape.
  control: 1.35,
  // Icon glyphs inside a fixed-size circle or box.
  icon: 1,
} as const;

function capFor(style: TextProps['style']): number {
  const fontSize = StyleSheet.flatten(style)?.fontSize ?? 14;
  if (fontSize >= 24) return FontScaleCap.title;
  if (fontSize >= 18) return FontScaleCap.heading;
  return FontScaleCap.body;
}

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  const maxFontSizeMultiplier = props.maxFontSizeMultiplier ?? capFor(props.style);
  return <RNText ref={ref} {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} />;
});
