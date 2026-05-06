// Theme tokens — mirrors brand.css from the website so the app and site
// stay visually in sync. If a token changes on the site, update it here.
import { Platform } from 'react-native';

export const colors = {
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

  // Inverse / dark surfaces for cinematic sections (Elevation/Radiant style)
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

  live: '#e63946', // LIVE pill red
} as const;

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

export const typography = {
  // Editorial display — bigger, tighter leading. Used on hero.
  hero: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: colors.white,
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
