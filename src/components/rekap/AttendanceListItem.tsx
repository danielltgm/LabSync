import { StyleSheet, Text, View } from 'react-native';

import { LabSyncColors, LabSyncRadii, LabSyncSpacing, LabSyncTypography } from '@/constants/labsync-theme';
import type { AttendanceRecord } from '@/types/attendance';

export interface AttendanceListItemProps {
  attendance: AttendanceRecord;
}

export function AttendanceListItem({ attendance }: AttendanceListItemProps) {
  const initials = attendance.studentName.trim().split(/\s+/)
    .filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();

  return (
    <View style={styles.row}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
        <Text style={styles.initials}>{initials || '?'}</Text>
      </View>
      <View style={styles.student}>
        <Text style={styles.name}>{attendance.studentName}</Text>
        <Text style={styles.nim}>NIM {attendance.studentId}</Text>
        <Text style={styles.detail}>Kelas {attendance.className}</Text>
        <Text style={styles.detail}>Catatan PC: {attendance.notes?.trim() || 'Tidak ada catatan'}</Text>
      </View>
      <View style={styles.timeColumn}>
        <Text style={styles.timeLabel}>Waktu presensi</Text>
        <Text style={styles.time}>{attendance.checkInTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: LabSyncSpacing.md,
    backgroundColor: LabSyncColors.surface,
    borderWidth: 1,
    borderColor: LabSyncColors.rule,
    borderRadius: LabSyncRadii.lg,
    padding: LabSyncSpacing.lg,
  },
  avatar: {
    minWidth: 44,
    minHeight: 44,
    padding: LabSyncSpacing.sm,
    borderRadius: LabSyncRadii.md,
    backgroundColor: LabSyncColors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...LabSyncTypography.mono, fontWeight: '700', color: LabSyncColors.text },
  student: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0, gap: LabSyncSpacing.xxs },
  name: { ...LabSyncTypography.section, color: LabSyncColors.text },
  nim: { ...LabSyncTypography.mono, color: LabSyncColors.textSecondary },
  detail: { ...LabSyncTypography.caption, fontWeight: '400', color: LabSyncColors.textSecondary },
  timeColumn: { flexGrow: 1, flexBasis: 140, alignItems: 'flex-end', gap: LabSyncSpacing.xxs },
  timeLabel: { ...LabSyncTypography.caption, color: LabSyncColors.textMuted, textAlign: 'right' },
  time: { ...LabSyncTypography.monoStrong, color: LabSyncColors.text, textAlign: 'right' },
});
