import type { ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AttendanceListItem } from '@/components/rekap/AttendanceListItem';
import { AttendanceScreenHeader } from '@/components/rekap/AttendanceScreenHeader';
import { AttendanceSummaryCard } from '@/components/rekap/AttendanceSummaryCard';
import { LabSyncColors as colors, LabSyncRadii as radii, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import type { AttendanceRecord } from '@/types/attendance';
import type { Session } from '@/types/session';
import type { UserProfile } from '@/types/user';

export interface SessionRecapProps {
  sessionId?: string;
  sessions: readonly Session[];
  attendances: readonly AttendanceRecord[];
  activeUser?: UserProfile;
  onBack: () => void;
  notice?: string;
  sessionControls?: ReactNode;
}

export function SessionRecap({ sessionId, sessions, attendances, activeUser, onBack, notice, sessionControls }: SessionRecapProps) {
  const session = sessions.find((item) => item.id === sessionId);
  const permitted = activeUser?.role === 'ASISTEN' && session?.assistantName === activeUser.name;
  const records = permitted ? attendances.filter((item) => item.sessionId === sessionId) : [];

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <AttendanceScreenHeader title="Rekap Kehadiran" onBack={onBack} notice={notice} />
            {permitted && session && (
              <>
                <View style={styles.session}>
                  <StatusBadge status={session.status} />
                  <Text accessibilityRole="header" style={styles.heading}>{session.courseName}</Text>
                  <Text style={styles.body}>Kelas {session.className}</Text>
                  <Text style={styles.body}>{session.labRoom}</Text>
                  <Text style={styles.body}>Tanggal: {session.date}</Text>
                  <Text style={styles.body}>Jadwal: {session.startTime} - {session.endTime}</Text>
                  <Text style={styles.body}>Asisten: {session.assistantName}</Text>
                  {sessionControls}
                </View>
                <AttendanceSummaryCard total={records.length} />
                <Text accessibilityRole="header" style={styles.section}>Daftar hadir</Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={!session ? 'Sesi tidak ditemukan' : !permitted
              ? 'Rekap hanya tersedia untuk asisten sesi ini'
              : 'Belum ada praktikan yang melakukan presensi'}
            description={!session || !permitted
              ? 'Kembali ke beranda untuk memilih peran dan sesi yang sesuai.'
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
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: space.lg, paddingBottom: space.xxxl },
  header: { gap: space.lg, paddingBottom: space.lg },
  session: { padding: space.xl, gap: space.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral.border, borderRadius: radii.lg },
  heading: { ...type.heading, color: colors.text },
  section: { ...type.section, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  item: { marginBottom: space.md },
});
