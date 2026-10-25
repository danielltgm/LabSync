import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconCircle,
              isDuplicate ? styles.iconDuplicate : styles.iconSuccess,
            ]}
          >
            <Text
              style={[
                styles.iconText,
                isDuplicate ? styles.iconTextDuplicate : styles.iconTextSuccess,
              ]}
            >
              {isDuplicate ? '!' : '✓'}
            </Text>
          </View>

            <Text accessibilityRole="header" style={styles.title}>
            {isDuplicate ? 'Presensi Ditolak' : 'Presensi Berhasil Dicatat!'}
          </Text>

          <Text style={styles.subtitle}>
            {isDuplicate
              ? `Anda sudah melakukan presensi pada sesi ini sebelumnya${
                  attendance?.checkInTime
                    ? ` pada pukul ${attendance.checkInTime}.`
                    : '!'
                }`
              : 'Kehadiran Anda telah berhasil tersimpan pada sesi praktikum ini.'}
          </Text>

          {attendance && (
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mahasiswa</Text>
                <Text style={styles.summaryValue}>
                  {attendance.studentName} ({attendance.studentId})
                </Text>
              </View>

              {courseName ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sesi Praktikum</Text>
                  <Text style={styles.summaryValue}>{courseName}</Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jam Presensi</Text>
                <Text style={[styles.summaryValue, styles.timeBadge]}>
                  {attendance.checkInTime}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Catatan / PC</Text>
                <Text style={styles.summaryValue}>
                  {attendance.notes?.trim() ? attendance.notes : '-'}
                </Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={isDuplicate ? 'Tutup Peringatan' : 'Selesai dan Tutup'}
            style={({ pressed }) => [
              styles.button,
              isDuplicate ? styles.buttonDanger : styles.buttonPrimary,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {isDuplicate ? 'Mengerti & Tutup' : 'Selesai & Tutup'}
            </Text>
          </Pressable>
        </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollArea: { width: '100%', flexGrow: 0, maxHeight: '100%' },
  scrollContent: { alignItems: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '88%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  iconDuplicate: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  iconText: {
    fontSize: 24,
    fontWeight: '700',
  },
  iconTextSuccess: {
    color: '#15803D',
  },
  iconTextDuplicate: {
    color: '#B91C1C',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: '#475569',
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#0F172A',
    textAlign: 'right',
  },
  timeBadge: {
    color: '#15803D',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    minHeight: 48,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
  },
  buttonDanger: {
    backgroundColor: '#B91C1C',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#FFFFFF',
  },
});

export default AttendanceFeedbackModal;
