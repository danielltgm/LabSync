import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

// Plain color values for APIs that cannot read Uniwind classes (navigation, maps, QR, status bar).
// Keep in sync with src/global.css.
export const THEME = {
  light: {
    background: '#D3E1D8',
    foreground: '#1B1B1B',
    card: '#F8F5EE',
    primary: '#6B66F0',
    primaryForeground: '#FFFFFF',
    muted: '#E8E3D8',
    mutedForeground: '#66645C',
    border: '#C2CFC6',
    destructive: '#E2533A',
    success: '#2E9E6E',
    warning: '#F2B630',
    info: '#3FA7C0',
    hero: '#6B66F0',
    ink: '#1E1E1E',
    coral: '#F2684D',
    alarm: '#FF3B2F',
    mustard: '#F5C443',
    aqua: '#A6E4EF',
  },
  dark: {
    background: '#141414',
    foreground: '#F6F2E9',
    card: '#232323',
    primary: '#7E7AF7',
    primaryForeground: '#FFFFFF',
    muted: '#2E2E2E',
    mutedForeground: '#A8A49B',
    border: '#2B2B2B',
    destructive: '#F2684D',
    success: '#4CC38A',
    warning: '#F5C443',
    info: '#6FCFE2',
    hero: '#6B66F0',
    ink: '#262626',
    coral: '#F2684D',
    alarm: '#FF4D42',
    mustard: '#F5C443',
    aqua: '#A6E4EF',
  },
} as const;

export type ThemeColors = { [K in keyof (typeof THEME)['light']]: string };

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
