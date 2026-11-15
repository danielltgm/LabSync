import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { formatSessionDate } from '@/components/common/SessionSheet';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingLine, MetaList, MetaRow, Panel } from '@/components/common/ui';
import { AttendanceScreenHeader } from '@/components/rekap/AttendanceScreenHeader';
import { LabSyncColors as colors, LabSyncLayout as layout, LabSyncRadii as radii, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { LiveAttendanceRecord } from '@/types/attendance-view';
import type { Session } from '@/types/session';
import type { UserProfile } from '@/types/user';
import { personalAttendance } from '@/utils/attendance-view';

export interface AttendanceHistoryProps {
  activeUser?: UserProfile;
  sessions: readonly Session[];
  attendances: readonly LiveAttendanceRecord[];
  onBack: () => void;
  notice?: string;
  loading?: boolean;
  onRetry?: () => void;
}

export function AttendanceHistory({ activeUser, sessions, attendances, onBack, notice, loading, onRetry }: AttendanceHistoryProps) {
  const { compact, wide } = useResponsiveLayout();
  const permitted = activeUser?.role === 'PRAKTISAN';
  const records = permitted ? personalAttendance(attendances, activeUser.id)
    .map((attendance) => ({ attendance, session: sessions.find((item) => item.id === attendance.sessionId) })) : [];

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={({ attendance }) => attendance.id}
        contentContainerStyle={[styles.content, compact && styles.compactContent, wide && styles.wideContent]}
        ListHeaderComponent={
          <View style={styles.header}>
            <AttendanceScreenHeader title="Riwayat Kehadiran Saya" onBack={onBack} notice={notice} onRetry={onRetry} />
            {permitted && (
              <View style={styles.identity}>
                <View style={styles.identityCopy}>
                  <Text accessibilityRole="header" style={styles.name}>{activeUser.name}</Text>
                  <Text style={styles.nim}>NIM {activeUser.identifier}</Text>
                </View>
                {!loading && !notice && <Text style={styles.total}>Total kehadiran: {records.length} sesi</Text>}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={loading ? <LoadingLine label="Memuat data..." /> : notice ? undefined :
          <EmptyState
            title={!activeUser ? 'Belum ada identitas aktif' : !permitted
              ? 'Riwayat hanya tersedia untuk praktikan' : 'Belum ada riwayat kehadiran'}
            description={!permitted
              ? 'Masuk dengan akun praktikan untuk melihat riwayat pribadi.'
              : 'Anda belum tercatat hadir. Lakukan presensi pada sesi yang dibuka oleh asisten.'}
          />
        }
        renderItem={({ item: { attendance, session } }) => (
          <Panel style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.present}>
                <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.presentGlyph}>✓</Text>
                <Text style={styles.presentText}>Hadir</Text>
              </View>
              {session ? <StatusBadge status={session.status} /> : null}
            </View>
            <Text accessibilityRole="header" style={styles.course}>{session?.courseName ?? 'Detail sesi tidak tersedia'}</Text>
            <MetaList>
              <MetaRow label="Kelas" value={session?.className ?? attendance.className} />
              {session && <MetaRow label="Ruang" value={session.labRoom} />}
              <MetaRow label="Tanggal sesi" value={session ? formatSessionDate(session.date) : 'Tidak tersedia'} />
              <MetaRow label="Waktu presensi" value={attendance.checkInTime} mono />
              <MetaRow label="Catatan PC" value={attendance.notes?.trim() || 'Tidak ada catatan'} />
            </MetaList>
            {!session && <Text style={styles.body}>Catatan kehadiran tersimpan, tetapi detail sesinya belum tersedia.</Text>}
          </Panel>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.readable, alignSelf: 'center', padding: space.lg, paddingBottom: space.huge },
  compactContent: { paddingHorizontal: space.md },
  wideContent: { paddingHorizontal: space.xxl, paddingTop: space.xxl },
  header: { gap: space.xl, paddingBottom: space.lg },
  identity: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
  },
  identityCopy: { gap: space.xxs, flexShrink: 1, minWidth: 0 },
  name: { ...type.heading, color: colors.text },
  nim: { ...type.mono, color: colors.textSecondary },
  total: {
    ...type.label,
    color: colors.success.text,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    overflow: 'hidden',
  },
  body: { ...type.body, color: colors.textSecondary },
  card: { marginBottom: space.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  present: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.success.border,
    backgroundColor: colors.success.background,
  },
  presentGlyph: { ...type.caption, fontSize: 12, lineHeight: 16, color: colors.success.solid, fontWeight: '700' },
  presentText: { ...type.caption, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6, color: colors.success.text },
  course: { ...type.heading, color: colors.text },
});
