import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionCard } from '@/components/asisten/SessionCard';
import { RoleSwitcher } from '@/components/common/RoleSwitcher';
import { AttendanceFeedbackContent } from '@/components/praktikan/AttendanceFeedbackModal';
import { AttendanceFormModal } from '@/components/praktikan/AttendanceFormModal';
import { SessionPraktikanCard } from '@/components/praktikan/SessionPraktikanCard';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';

export default function HomeScreen() {
  const {
    users, sessions, attendances, attendanceResult, activeRole, activeStudentId, activeUser,
    setRole, selectStudent, openSession, closeSession, submitAttendance, clearAttendanceResult,
  } = useLabSync();
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const attendanceSession = sessions.find((session) => session.id === attendanceSessionId);
  const feedback = attendanceResult && attendanceResult.status !== 'error' ? attendanceResult : null;
  const feedbackSession = sessions.find((session) => session.id === feedback?.attendance.sessionId);
  const closeAttendance = () => { setAttendanceSessionId(null); clearAttendanceResult(); };
  const isAssistant = activeRole === 'ASISTEN';
  const visibleSessions = isAssistant
    ? sessions.filter((session) => session.assistantName === activeUser?.name)
    : sessions;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={SessionSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandCopy}>
                <Text style={styles.eyebrow}>PRAKTIKUM LABORATORIUM</Text>
                <Text accessibilityRole="header" style={styles.brand}>LabSync</Text>
              </View>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
                <Text style={styles.avatarText}>{activeUser?.name.split(' ').map((name) => name[0]).slice(0, 2).join('') || '?'}</Text>
              </View>
            </View>
            <Text style={styles.identity}>{activeUser?.name ?? 'Belum ada identitas aktif'}{activeUser ? ` · ${activeUser.identifier}` : ''}</Text>
            <RoleSwitcher
              activeRole={activeRole}
              students={users}
              activeStudentId={activeStudentId}
              onRoleChange={(role) => { closeAttendance(); setRole(role); }}
              onStudentChange={(studentId) => { closeAttendance(); selectStudent(studentId); }}
            />
            <View style={styles.demo}>
              <Text style={styles.demoTitle}>Simulasi lokal Sprint 1</Text>
              <Text style={styles.body}>Sesi dan presensi tersimpan selama aplikasi berjalan, tanpa sinkronisasi antarperangkat. Muat ulang untuk kembali ke data awal.</Text>
            </View>
            {!isAssistant && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/history')}
                style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}
              >
                <Text style={styles.linkLabel}>Riwayat Saya</Text>
              </Pressable>
            )}
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Jadwal praktikum</Text>
              <Text style={styles.caption}>{visibleSessions.length} sesi</Text>
            </View>
            <Text style={styles.body}>{isAssistant
              ? 'Buka sesi, pantau kehadiran, lalu tutup setelah praktikum selesai.'
              : 'Lihat jadwal dan status sesi praktikum Anda.'}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text accessibilityElementsHidden style={styles.emptyIcon}>○</Text>
            <Text style={styles.sectionTitle}>Belum ada jadwal praktikum</Text>
            <Text style={styles.body}>Jadwal akan muncul di sini saat sesi tersedia.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const alreadyPresent = attendances.some((attendance) =>
            attendance.sessionId === item.id && attendance.studentId === activeUser?.identifier);

          if (!isAssistant) {
            return (
              <SessionPraktikanCard session={item} isAttended={alreadyPresent}
                onPressAttendance={(session) => {
                  clearAttendanceResult();
                  setAttendanceSessionId(session.id);
                }} />
            );
          }

          return (
            <SessionCard
              session={item}
              role={activeRole}
              onOpenSession={openSession}
              onCloseSession={closeSession}
              onViewRecap={(id) => router.push({ pathname: '/rekap/[id]', params: { id } })}
            />
          );
        }}
      />
      {attendanceSession && activeUser && !isAssistant && (
        <AttendanceFormModal
          key={`${attendanceSession.id}:${activeUser.id}`}
          visible
          sessionId={attendanceSession.id}
          courseName={attendanceSession.courseName}
          className={attendanceSession.className}
          initialStudentId={activeUser.identifier}
          initialStudentName={activeUser.name}
          submissionError={attendanceResult?.status === 'error' ? attendanceResult.message : undefined}
          feedback={feedback ? (
            <AttendanceFeedbackContent attendance={feedback.attendance}
              courseName={feedbackSession?.courseName} isDuplicate={feedback.status === 'duplicate'}
              onClose={closeAttendance} />
          ) : undefined}
          onClose={closeAttendance}
          onSubmit={submitAttendance}
        />
      )}
    </SafeAreaView>
  );
}

function SessionSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, paddingBottom: space.xxxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space.lg, paddingBottom: space.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  brandCopy: { flex: 1, gap: space.xs },
  eyebrow: { ...type.caption, color: colors.textSecondary },
  brand: { ...type.title, color: colors.primary },
  avatar: { width: 48, height: 48, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySurface },
  avatarText: { ...type.section, color: colors.primary },
  identity: { ...type.button, color: colors.text },
  demo: { padding: space.lg, gap: space.xs, backgroundColor: colors.primarySurface, borderRadius: radii.md },
  demoTitle: { ...type.button, color: colors.primary },
  body: { ...type.body, color: colors.textSecondary },
  historyButton: { minHeight: 48, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderDark, justifyContent: 'center', alignItems: 'center' },
  linkLabel: { ...type.button, color: colors.primary, textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  sectionTitle: { ...type.section, color: colors.text },
  caption: { ...type.caption, color: colors.textSecondary },
  separator: { height: space.lg },
  empty: { padding: space.xl, gap: space.sm, backgroundColor: colors.surface, borderRadius: radii.lg },
  emptyIcon: { fontSize: 48, color: colors.textSecondary },
  pressed: { opacity: 0.8 },
});
