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

const statusConfig = {
  TERJADWAL: { label: 'TERJADWAL', icon: '◷', colors: LabSyncColors.neutral },
  DIBUKA: { label: 'DIBUKA (AKTIF)', icon: '●', colors: LabSyncColors.success },
  SELESAI: { label: 'SELESAI (DITUTUP)', icon: '✓', colors: LabSyncColors.danger },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, icon } = statusConfig[status];

  return (
    <View
      accessible
      accessibilityLabel={`Status sesi: ${label}`}
      style={[styles.badge, styles[status]]}
    >
      <Text importantForAccessibility="no" style={[styles.label, styles[`${status}_TEXT`]]}>
        {icon}
      </Text>
      <Text style={[styles.label, styles[`${status}_TEXT`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: LabSyncSpacing.xs,
    paddingVertical: LabSyncSpacing.xs,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: LabSyncRadii.full,
  },
  label: {
    ...LabSyncTypography.caption,
    flexShrink: 1,
  },
  TERJADWAL: {
    backgroundColor: statusConfig.TERJADWAL.colors.background,
    borderColor: statusConfig.TERJADWAL.colors.border,
  },
  DIBUKA: {
    backgroundColor: statusConfig.DIBUKA.colors.background,
    borderColor: statusConfig.DIBUKA.colors.border,
  },
  SELESAI: {
    backgroundColor: statusConfig.SELESAI.colors.background,
    borderColor: statusConfig.SELESAI.colors.border,
  },
  TERJADWAL_TEXT: { color: statusConfig.TERJADWAL.colors.text },
  DIBUKA_TEXT: { color: statusConfig.DIBUKA.colors.text },
  SELESAI_TEXT: { color: statusConfig.SELESAI.colors.text },
});

export default StatusBadge;
