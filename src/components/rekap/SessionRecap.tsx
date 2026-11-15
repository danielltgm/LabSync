import type { ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { formatSessionDate } from '@/components/common/SessionSheet';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingLine, MetaList, MetaRow, Panel } from '@/components/common/ui';
import { AttendanceListItem } from '@/components/rekap/AttendanceListItem';
import { AttendanceScreenHeader } from '@/components/rekap/AttendanceScreenHeader';
import { AttendanceSummaryCard } from '@/components/rekap/AttendanceSummaryCard';
import { LabSyncColors as colors, LabSyncLayout as layout, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { LiveAttendanceRecord } from '@/types/attendance-view';
import type { Session } from '@/types/session';
import type { UserProfile } from '@/types/user';

export interface SessionRecapProps {
  sessionId?: string;
  sessions: readonly Session[];
  attendances: readonly LiveAttendanceRecord[];
  activeUser?: UserProfile;
  onBack: () => void;
  notice?: string;
  loading?: boolean;
  sessionControls?: ReactNode;
  onRetry?: () => void;
}

export function SessionRecap({ sessionId, sessions, attendances, activeUser, onBack, notice, loading, sessionControls, onRetry }: SessionRecapProps) {
  const { wide, compact } = useResponsiveLayout();
  const session = sessions.find((item) => item.id === sessionId);
  const permitted = activeUser?.role === 'ASISTEN' && !!session;
  const records = permitted ? attendances.filter((item) => item.sessionId === sessionId)
    .sort((a, b) => (a.checkedInAtMillis ?? 0) - (b.checkedInAtMillis ?? 0) || a.id.localeCompare(b.id)) : [];

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, compact && styles.compactContent, wide && styles.wideContent]}
        ListHeaderComponent={
          <View style={styles.header}>
            <AttendanceScreenHeader title="Rekap Kehadiran" onBack={onBack} notice={notice} onRetry={onRetry} />
            {permitted && session && (
              <>
                <View style={[styles.overview, wide && styles.overviewWide]}>
                  <Panel accent={session.status === 'DIBUKA' ? colors.success.solid : undefined} style={wide && styles.sessionWide}>
                    <StatusBadge status={session.status} />
                    <Text accessibilityRole="header" style={styles.heading}>{session.courseName}</Text>
                    <MetaList>
                      <MetaRow label="Kelas" value={session.className} />
                      <MetaRow label="Ruang" value={session.labRoom} />
                      <MetaRow label="Tanggal" value={formatSessionDate(session.date)} />
                      <MetaRow label="Jadwal" value={`${session.startTime} - ${session.endTime}`} mono />
                      <MetaRow label="Asisten" value={session.assistantName} />
                    </MetaList>
                    {sessionControls}
                  </Panel>
                  {!loading && !notice && (
                    <View style={[styles.summary, wide && styles.summaryWide]}>
                      <AttendanceSummaryCard total={records.length} />
                    </View>
                  )}
                </View>
                <Text accessibilityRole="header" style={styles.section}>Daftar hadir</Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={loading ? <LoadingLine label="Memuat data..." /> : notice ? undefined :
          <EmptyState
            title={!session ? 'Sesi tidak ditemukan' : !permitted
              ? 'Rekap hanya tersedia untuk asisten sesi ini'
              : 'Belum ada praktikan yang melakukan presensi'}
            description={!session || !permitted
              ? 'Kembali ke beranda untuk memilih sesi yang tersedia.'
              : 'Daftar hadir akan ditampilkan setelah data presensi tersedia untuk sesi ini.'}
          />
        }
        renderItem={({ item }) => <View style={styles.item}><AttendanceListItem attendance={item} /></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.readable, alignSelf: 'center', padding: space.lg, paddingBottom: space.huge },
  compactContent: { paddingHorizontal: space.md },
  wideContent: { maxWidth: 920, paddingHorizontal: space.xxl, paddingTop: space.xxl },
  header: { gap: space.xl, paddingBottom: space.lg },
  overview: { gap: space.lg },
  overviewWide: { flexDirection: 'row', alignItems: 'flex-start' },
  sessionWide: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  summary: {},
  summaryWide: { width: 260 },
  heading: { ...type.title, fontSize: 26, lineHeight: 32, color: colors.text },
  section: {
    ...type.heading,
    color: colors.text,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  item: { marginBottom: space.md },
});
