// Shared tokens from docs/design.md. Scheduled uses neutral colors per SRS FR-01.
export const LabSyncColors = {
  primary: '#2563EB',
  primarySurface: '#EFF6FF',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  borderDark: '#CBD5E1',
  neutral: { background: '#F1F5F9', border: '#E2E8F0', text: '#475569' },
  success: { background: '#DCFCE7', border: '#86EFAC', text: '#15803D' },
  danger: { background: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' },
  backdrop: 'rgba(15, 23, 42, 0.6)',
} as const;

export const LabSyncSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const LabSyncRadii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const LabSyncTypography = {
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  button: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
} as const;
