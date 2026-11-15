import { Platform, type TextStyle } from 'react-native';

// LabSync design tokens. Status semantics follow docs/design.md:
// TERJADWAL = neutral, DIBUKA = success, SELESAI = danger.
// Palette: warm "lab notebook" paper, ink text and a single deep LabSync blue.
export const LabSyncColors = {
  primary: '#1D46C2',
  primaryPressed: '#15359A',
  primarySurface: '#E9EEFB',
  primaryBorder: '#B6C4EE',
  surface: '#FFFFFF',
  surfaceSunken: '#EFECE5',
  background: '#F4F2ED',
  text: '#15171C',
  textSecondary: '#454952',
  textMuted: '#5F636C',
  placeholder: '#767269',
  rule: '#DFDBD2',
  borderDark: '#8B877D',
  borderSoft: '#C8C3B8',
  neutral: { background: '#ECE9E2', border: '#CFCABF', text: '#3F434B', solid: '#6B6F78' },
  success: { background: '#E3F2E9', border: '#99CFAE', text: '#0E5E33', solid: '#1C8048' },
  danger: { background: '#FBEAE8', border: '#EBB0A9', text: '#9F2018', solid: '#B3261E', pressed: '#8E1D16' },
  warning: { background: '#FBF0DA', border: '#E3C27A', text: '#6F4700', solid: '#A86E00' },
  backdrop: 'rgba(21, 23, 28, 0.56)',
  focus: '#1D46C2',
} as const;

export const LabSyncSpacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const LabSyncRadii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
});

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace',
});

export const LabSyncFonts = { serif, mono } as const;

function defineType<T extends Record<string, TextStyle>>(scale: T) {
  return scale;
}

export const LabSyncTypography = defineType({
  // Serif display voice: screen titles, course names, dialog titles.
  display: { fontFamily: serif, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontFamily: serif, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontFamily: serif, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 },
  // Sans working voice.
  section: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  // Tabular figures for times, dates, NIM and UIDs.
  mono: { fontFamily: mono, fontSize: 14, lineHeight: 20, fontWeight: '400', fontVariant: ['tabular-nums'] },
  monoStrong: { fontFamily: mono, fontSize: 18, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numeral: { fontFamily: serif, fontSize: 48, lineHeight: 52, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});

export const LabSyncLayout = {
  readable: 680,
  wide: 1080,
  form: 440,
  dialog: 480,
  touch: 48,
} as const;
