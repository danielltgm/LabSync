import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AttendanceScreenHeader } from '@/components/rekap/AttendanceScreenHeader';
import { LabSyncColors as colors, LabSyncRadii as radii, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import type { AttendanceRecord } from '@/types/attendance';
import type { Session } from '@/types/session';
import type { UserProfile } from '@/types/user';

export interface AttendanceHistoryProps {
  activeUser?: UserProfile;
  sessions: readonly Session[];
  attendances: readonly AttendanceRecord[];
  onBack: () => void;
  notice?: string;
}

export function AttendanceHistory({ activeUser, sessions, attendances, onBack, notice }: AttendanceHistoryProps) {
  const permitted = activeUser?.role === 'PRAKTISAN';
  const records = permitted ? attendances
    .filter((item) => item.studentId === activeUser.identifier)
    .map((attendance) => ({ attendance, session: sessions.find((item) => item.id === attendance.sessionId) }))
    .sort((a, b) => (b.session?.date ?? '').localeCompare(a.session?.date ?? '')
      || b.attendance.checkInTime.localeCompare(a.attendance.checkInTime)) : [];

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={({ attendance }) => attendance.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <AttendanceScreenHeader title="Riwayat Kehadiran Saya" onBack={onBack} notice={notice} />
            {permitted && (
              <View style={styles.identity}>
                <Text accessibilityRole="header" style={styles.heading}>{activeUser.name}</Text>
                <Text style={styles.body}>NIM {activeUser.identifier}</Text>
                <Text style={styles.body}>Total kehadiran: {records.length} sesi</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={!activeUser ? 'Belum ada identitas aktif' : !permitted
              ? 'Riwayat hanya tersedia untuk praktikan' : 'Belum ada riwayat kehadiran'}
            description={!permitted
              ? 'Kembali ke beranda dan pilih identitas praktikan untuk melihat riwayat pribadi.'
              : 'Anda belum tercatat hadir. Lakukan presensi pada sesi yang dibuka oleh asisten.'}
          />
        }
        renderItem={({ item: { attendance, session } }) => (
          <View style={styles.card}>
            <Text style={styles.present}>Hadir</Text>
            <Text accessibilityRole="header" style={styles.heading}>{session?.courseName ?? 'Detail sesi tidak tersedia'}</Text>
            <Text style={styles.body}>Kelas {session?.className ?? attendance.className}</Text>
            {session && <Text style={styles.body}>{session.labRoom}</Text>}
            <Text style={styles.body}>Tanggal sesi: {session?.date ?? 'Tidak tersedia'}</Text>
            <Text style={styles.time}>Waktu presensi: {attendance.checkInTime}</Text>
            <Text style={styles.body}>Catatan PC: {attendance.notes?.trim() || 'Tidak ada catatan'}</Text>
            {session ? <StatusBadge status={session.status} />
              : <Text style={styles.body}>Catatan kehadiran tersimpan, tetapi detail sesinya belum tersedia.</Text>}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: space.lg, paddingBottom: space.xxxl },
  header: { gap: space.lg, paddingBottom: space.lg },
  identity: { gap: space.xs },
  heading: { ...type.section, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  card: { padding: space.xl, gap: space.sm, marginBottom: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral.border, borderRadius: radii.lg },
  present: { ...type.button, color: colors.success.text, backgroundColor: colors.success.background, borderWidth: 1, borderColor: colors.success.border, borderRadius: radii.full, paddingVertical: space.xs, paddingHorizontal: space.md, alignSelf: 'flex-start' },
  time: { ...type.caption, color: colors.text, fontVariant: ['tabular-nums'] },
});
