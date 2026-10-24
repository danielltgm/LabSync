import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { PREVIEW_ATTENDANCES } from '@/constants/preview-attendance';
import { useLabSync } from '@/context/LabSyncContext';

// Temporary destinations for Y4 navigation. Final rekap/history screens remain owned by Zufar.
export function IntegrationPreviewScreen({ kind, sessionId }: {
  kind: 'rekap' | 'history';
  sessionId?: string;
}) {
  const { sessions, activeRole, activeUser, openSession, closeSession } = useLabSync();
  const isRecap = kind === 'rekap';
  const session = sessions.find((item) => item.id === sessionId);
  const permitted = isRecap
    ? activeRole === 'ASISTEN' && activeUser?.role === 'ASISTEN' && session?.assistantName === activeUser.name
    : activeRole === 'PRAKTISAN' && activeUser?.role === 'PRAKTISAN';
  const records = permitted ? PREVIEW_ATTENDANCES.filter((attendance) => isRecap
    ? attendance.sessionId === sessionId
    : attendance.studentId === activeUser?.identifier) : [];

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Text style={styles.backLabel}>← Kembali ke beranda</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>{isRecap ? 'Rekap presensi' : 'Riwayat saya'}</Text>
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Pratinjau · data dummy</Text>
              <Text style={styles.body}>Daftar ini memakai contoh kehadiran awal untuk demo.</Text>
            </View>
            {permitted && (
              <>
                <Text style={styles.sectionTitle}>{isRecap ? session?.courseName : activeUser?.name}</Text>
                {isRecap && session && (
                  <View style={styles.session}>
                    <Text style={styles.body}>Kelas {session.className} · {session.date}</Text>
                    <Text style={styles.body}>{session.labRoom}</Text>
                    <Text style={styles.body}>{session.startTime}–{session.endTime} · {session.assistantName}</Text>
                    <StatusBadge status={session.status} />
                    <SessionControlAction
                      sessionId={session.id}
                      status={session.status}
                      role={activeRole}
                      onOpenSession={openSession}
                      onCloseSession={closeSession}
                    />
                  </View>
                )}
                <Text style={styles.sectionTitle}>{isRecap ? 'Total hadir' : 'Total kehadiran'}: {records.length}</Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.panel}>
            <Text accessibilityElementsHidden style={styles.emptyIcon}>○</Text>
            <Text style={styles.sectionTitle}>{!permitted
              ? isRecap && !session ? 'Sesi tidak ditemukan' : 'Halaman tidak tersedia untuk peran ini'
              : isRecap ? 'Belum ada praktikan yang hadir' : 'Belum ada riwayat kehadiran'}</Text>
            <Text style={styles.body}>{permitted
              ? 'Belum ada contoh kehadiran untuk pilihan ini.'
              : 'Kembali ke beranda untuk memilih peran dan sesi yang sesuai.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{isRecap ? item.studentName : sessions.find((entry) => entry.id === item.sessionId)?.courseName ?? 'Sesi tidak tersedia'}</Text>
            <Text style={styles.body}>NIM {item.studentId}</Text>
            <Text style={styles.body}>{sessions.find((entry) => entry.id === item.sessionId)?.date} · {item.checkInTime}</Text>
            <Text style={styles.body}>Catatan: {item.notes}</Text>
            <Text style={styles.present}>Hadir · data contoh</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xxxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space.lg, paddingBottom: space.lg },
  back: { minHeight: 48, paddingVertical: space.md, justifyContent: 'center' },
  backLabel: { ...type.button, color: colors.primary },
  title: { ...type.title, color: colors.text },
  notice: { padding: space.lg, gap: space.xs, backgroundColor: colors.primarySurface, borderRadius: radii.md },
  noticeTitle: { ...type.button, color: colors.primary },
  body: { ...type.body, color: colors.textSecondary },
  sectionTitle: { ...type.section, color: colors.text },
  session: { gap: space.sm },
  panel: { padding: space.xl, marginBottom: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.neutral.border, backgroundColor: colors.surface, borderRadius: radii.lg },
  emptyIcon: { fontSize: 48, color: colors.textSecondary },
  present: { ...type.button, color: colors.success.text },
  pressed: { opacity: 0.8 },
});
