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
    <View style={styles.card}>
      <View style={styles.identity}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
          <Text style={styles.initials}>{initials || '?'}</Text>
        </View>
        <View style={styles.student}>
          <Text style={styles.name}>{attendance.studentName}</Text>
          <Text style={styles.detail}>NIM {attendance.studentId}</Text>
          <Text style={styles.detail}>Kelas {attendance.className}</Text>
        </View>
      </View>
      <View style={styles.metadata}>
        <Text style={styles.time}>Waktu presensi: {attendance.checkInTime}</Text>
        <Text style={styles.detail}>Catatan PC: {attendance.notes?.trim() || 'Tidak ada catatan'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: LabSyncColors.surface, borderWidth: 1, borderColor: LabSyncColors.neutral.border, borderRadius: LabSyncRadii.lg, padding: LabSyncSpacing.lg, gap: LabSyncSpacing.md },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: LabSyncSpacing.md },
  avatar: { minWidth: 44, minHeight: 44, padding: LabSyncSpacing.sm, borderRadius: LabSyncRadii.full, backgroundColor: LabSyncColors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  initials: { ...LabSyncTypography.section, color: LabSyncColors.primary },
  student: { flex: 1, gap: LabSyncSpacing.xs },
  name: { ...LabSyncTypography.section, color: LabSyncColors.text },
  detail: { ...LabSyncTypography.body, color: LabSyncColors.textSecondary },
  metadata: { borderTopWidth: 1, borderTopColor: LabSyncColors.neutral.border, paddingTop: LabSyncSpacing.md, gap: LabSyncSpacing.xs },
  time: { ...LabSyncTypography.caption, color: LabSyncColors.text, fontVariant: ['tabular-nums'] },
});
