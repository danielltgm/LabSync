import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, DialogFrame, DialogTitle, MetaList, MetaRow, toneSolid } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncFonts as fonts,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';

export interface AttendanceFeedbackData {
  sessionId: string;
  studentId: string;
  studentName: string;
  checkInTime: string;
  notes?: string;
}

export interface AttendanceFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  courseName?: string;
  attendance?: AttendanceFeedbackData | null;
  isDuplicate?: boolean;
}

export function findExistingAttendance<
  T extends { sessionId: string; studentId: string; checkInTime?: string },
>(attendances: T[], sessionId: string, studentId: string): T | undefined {
  const cleanNim = studentId.trim();
  return attendances.find(
    (att) => att.sessionId === sessionId && att.studentId.trim() === cleanNim
  );
}

export function isDuplicateAttendance(
  attendances: { sessionId: string; studentId: string }[],
  sessionId: string,
  studentId: string
): boolean {
  return Boolean(findExistingAttendance(attendances, sessionId, studentId));
}

export function AttendanceFeedbackModal({
  visible,
  onClose,
  courseName,
  attendance,
  isDuplicate = false,
}: AttendanceFeedbackModalProps) {
  const tone = isDuplicate ? 'danger' : 'success';
  return (
    <DialogFrame visible={visible} onRequestClose={onClose} tone={tone}>
      <View style={styles.head}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.seal, isDuplicate ? styles.sealDanger : styles.sealSuccess]}
        >
          <Text style={[styles.sealGlyph, { color: toneSolid[tone] }]}>{isDuplicate ? '!' : '✓'}</Text>
        </View>
        <DialogTitle>{isDuplicate ? 'Presensi Ditolak' : 'Presensi Berhasil Dicatat!'}</DialogTitle>
        <Text style={styles.subtitle}>
          {isDuplicate
            ? `Anda sudah melakukan presensi pada sesi ini sebelumnya${
                attendance?.checkInTime
                  ? ` pada pukul ${attendance.checkInTime}.`
                  : '!'
              }`
            : 'Kehadiran Anda telah berhasil tersimpan pada sesi praktikum ini.'}
        </Text>
      </View>

      {attendance && (
        <View style={styles.receipt}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Jam Presensi</Text>
            <Text style={[styles.time, { color: isDuplicate ? colors.text : colors.success.text }]}>
              {attendance.checkInTime}
            </Text>
          </View>
          <MetaList style={styles.receiptMeta}>
            <MetaRow label="Mahasiswa" value={`${attendance.studentName} (${attendance.studentId})`} />
            {courseName ? <MetaRow label="Sesi" value={courseName} /> : null}
            <MetaRow label="Catatan / PC" value={attendance.notes?.trim() ? attendance.notes : '-'} mono />
          </MetaList>
        </View>
      )}

      <Button
        variant={isDuplicate ? 'danger' : 'primary'}
        label={isDuplicate ? 'Mengerti & Tutup' : 'Selesai & Tutup'}
        accessibilityLabel={isDuplicate ? 'Tutup Peringatan' : 'Selesai dan Tutup'}
        onPress={onClose}
      />
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.sm },
  seal: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  sealSuccess: { backgroundColor: colors.success.background, borderColor: colors.success.border },
  sealDanger: { backgroundColor: colors.danger.background, borderColor: colors.danger.border },
  sealGlyph: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  subtitle: { ...type.body, color: colors.textSecondary },
  receipt: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSoft,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  timeBlock: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    borderStyle: 'dashed',
    gap: space.xxs,
  },
  timeLabel: { ...type.eyebrow, color: colors.textMuted },
  time: { fontFamily: fonts.mono, fontSize: 28, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  receiptMeta: { paddingVertical: space.md, paddingHorizontal: space.lg },
});

export default AttendanceFeedbackModal;
