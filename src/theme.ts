// Theme tokens — mirrors brand.css from the website so the app and site
// stay visually in sync. Light + dark palettes share the same key shape so
// every component can read colors via `useColors()` without caring which
// scheme is active.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';

// ---------- Palette ----------

export type Palette = {
  white: string;
  paper: string;
  surface: string;
  surface2: string;
  line: string;
  lineSoft: string;
  ink: string;
  text: string;
  textMid: string;
  muted: string;
  inkDeep: string;
  inkSurface: string;
  inkLine: string;
  inkText: string;
  inkMuted: string;
  skyTint: string;
  skySoft: string;
  sky: string;
  skyDeep: string;
  skyBg: string;
  peachSoft: string;
  peach: string;
  peachDeep: string;
  peachInk: string;
  live: string;
};

const lightPalette: Palette = {
  white: '#ffffff',
  paper: '#fafaf9',
  surface: '#f4f4f1',
  surface2: '#ecebe7',
  line: '#e8e6e0',
  lineSoft: 'rgba(10, 10, 10, 0.06)',

  ink: '#1a1a1a',
  text: '#2a2a2a',
  textMid: '#4a4a4a',
  muted: '#8c8c8a',

  // Inverse / dark surfaces for cinematic sections (Elevation/Radiant style).
  // These remain dark in BOTH light and dark mode — they're intentional
  // dark accents, not tied to the page background.
  inkDeep: '#0e1116',
  inkSurface: '#171a20',
  inkLine: 'rgba(255,255,255,0.10)',
  inkText: 'rgba(255,255,255,0.92)',
  inkMuted: 'rgba(255,255,255,0.62)',

  skyTint: '#d5edf6',
  skySoft: '#b8e0ee',
  sky: '#5fb0d4',
  skyDeep: '#2e8eb8',
  skyBg: '#f1f8fb',

  peachSoft: '#fff0e2',
  peach: '#ffd5b8',
  peachDeep: '#d97a4a',
  peachInk: '#6e3417',

  live: '#e63946',
};

const darkPalette: Palette = {
  // Backgrounds invert: pure white → dark surface, paper → near-black.
  white: '#1a1d22',
  paper: '#0e1116',
  surface: '#1a1d22',
  surface2: '#22262e',
  line: '#2a2f37',
  lineSoft: 'rgba(255,255,255,0.08)',

  // Foreground text inverts.
  ink: '#f5f5f5',
  text: '#e5e5e5',
  textMid: '#b8bbc1',
  muted: '#7a7d83',

  // Dark accent surfaces stay the same — they're meant to be dark.
  inkDeep: '#0e1116',
  inkSurface: '#171a20',
  inkLine: 'rgba(255,255,255,0.10)',
  inkText: 'rgba(255,255,255,0.92)',
  inkMuted: 'rgba(255,255,255,0.62)',

  // Sky chips/buttons need their bg + text colors to swap roles in dark
  // mode (so light-blue text reads on dark-blue bg).
  skyTint: '#0a3142',
  skySoft: '#1a4a5e',
  sky: '#5fb0d4',
  skyDeep: '#7fc4e5',
  skyBg: '#0e2a36',

  // Peach: peach + peachDeep stay (accents). The "soft" bg + "ink" text
  // invert so a peach pill still has good contrast.
  peachSoft: '#3a2418',
  peach: '#ffd5b8',
  peachDeep: '#e89060',
  peachInk: '#ffd5b8',

  live: '#ff5666',
};

// ---------- Spacing / radius / shadow (theme-independent) ----------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  hero: 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  })!,
  hero: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  })!,
} as const;

// ---------- Typography (theme-aware) ----------

export type Typography = ReturnType<typeof makeTypography>;

export function makeTypography(colors: Palette) {
  return {
    hero: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 40,
      lineHeight: 44,
      letterSpacing: -0.8,
      color: '#ffffff', // hero text always light — sits over a dark image
    },
    display: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: colors.ink,
    },
    h1: {
      fontFamily: 'Inter_700Bold',
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.3,
      color: colors.ink,
    },
    h2: {
      fontFamily: 'Inter_700Bold',
      fontSize: 19,
      lineHeight: 25,
      letterSpacing: -0.2,
      color: colors.ink,
    },
    h3: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      lineHeight: 22,
      color: colors.ink,
    },
    body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, color: colors.text },
    small: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, color: colors.textMid },
    label: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      lineHeight: 14,
      color: colors.muted,
      letterSpacing: 1.4,
      textTransform: 'uppercase' as const,
    },
  } as const;
}

// ---------- Theme context + hooks ----------

export type ColorScheme = 'light' | 'dark';

type ThemeContextValue = {
  colors: Palette;
  typography: Typography;
  scheme: ColorScheme;
  setScheme: (s: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialScheme = 'light',
  onSchemeChange,
}: {
  children: React.ReactNode;
  initialScheme?: ColorScheme;
  onSchemeChange?: (s: ColorScheme) => void;
}) {
  const [scheme, setSchemeState] = useState<ColorScheme>(initialScheme);

  const setScheme = useCallback(
    (s: ColorScheme) => {
      setSchemeState(s);
      onSchemeChange?.(s);
    },
    [onSchemeChange],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const palette = scheme === 'dark' ? darkPalette : lightPalette;
    return {
      colors: palette,
      typography: makeTypography(palette),
      scheme,
      setScheme,
    };
  }, [scheme, setScheme]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  // Fall back to light theme when ThemeProvider isn't mounted (e.g., a
  // unit-test render). Components stay functional, just non-themed.
  if (!ctx) {
    return {
      colors: lightPalette,
      typography: makeTypography(lightPalette),
      scheme: 'light',
      setScheme: () => {},
    };
  }
  return ctx;
}

export function useColors(): Palette {
  return useThemeContext().colors;
}

export function useTypography(): Typography {
  return useThemeContext().typography;
}

export function useScheme(): readonly [ColorScheme, (s: ColorScheme) => void] {
  const ctx = useThemeContext();
  return [ctx.scheme, ctx.setScheme] as const;
}

// ---------- Backwards-compat static exports ----------
//
// These are the LIGHT palette values, used by any module-level code that
// imports `colors` or `typography` directly (most existing components).
// They DO NOT update when the user toggles dark mode. Refactor target:
// every component should switch to the hooks above so it re-renders on
// theme change.
export const colors = lightPalette;
export const typography = makeTypography(lightPalette);
