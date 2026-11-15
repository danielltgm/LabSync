import { StyleSheet, Text, View } from 'react-native';

import {
  LabSyncColors,
  LabSyncRadii,
  LabSyncSpacing,
  LabSyncTypography,
} from '@/constants/labsync-theme';
import type { SessionStatus } from '@/types/session';

export interface StatusBadgeProps {
  status: SessionStatus;
}

// Status is never colour-only: each state carries its own glyph and written label.
const statusConfig = {
  TERJADWAL: { label: 'TERJADWAL', icon: '◷', colors: LabSyncColors.neutral },
  DIBUKA: { label: 'DIBUKA (AKTIF)', icon: '●', colors: LabSyncColors.success },
  SELESAI: { label: 'SELESAI (DITUTUP)', icon: '✓', colors: LabSyncColors.danger },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, icon, colors } = statusConfig[status];

  return (
    <View
      accessible
      accessibilityLabel={`Status sesi: ${label}`}
      style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      <Text importantForAccessibility="no" style={[styles.icon, { color: colors.solid }]}>
        {icon}
      </Text>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: LabSyncSpacing.sm,
    borderWidth: 1,
    borderRadius: LabSyncRadii.sm,
  },
  icon: { ...LabSyncTypography.caption, fontSize: 12, lineHeight: 16 },
  label: {
    ...LabSyncTypography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
});

export default StatusBadge;
