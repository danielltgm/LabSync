import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionCard } from '@/components/asisten/SessionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { AttendanceFeedbackModal, findExistingAttendance } from '@/components/praktikan/AttendanceFeedbackModal';
import { AttendanceFormModal } from '@/components/praktikan/AttendanceFormModal';
import { LeaveRequestModal } from '@/components/praktikan/LeaveRequestModal';
import { SessionPraktikanCard } from '@/components/praktikan/SessionPraktikanCard';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { firebase } from '@/firebase/client';
import { submitAttendance, submitLeaveRequest } from '@/firebase/queries';
import { useAttendance } from '@/hooks/use-attendance';
import type { AttendancePayload, AttendanceRecord } from '@/types/attendance';
import type { Session } from '@/types/session';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import type { LiveSession } from '@/types/sprint2';

export default function HomeScreen() {
  const { sessions, activeUser, loadingSessions, error, openSession, closeSession, logout } = useLabSync();
  const isAssistant = activeUser.role === 'ASISTEN';
  const attendance = useAttendance(isAssistant ? undefined : activeUser.id);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [feedback, setFeedback] = useState<{ courseName: string; record: AttendanceRecord; isDuplicate: boolean } | null>(null);
  const [submitError, setSubmitError] = useState('');

  const handleSubmitAttendance = (payload: AttendancePayload) => {
    const courseName = selectedSession?.courseName ?? '';
    const existing = findExistingAttendance(attendance.records, payload.sessionId, payload.studentId);
    if (existing) {
      setSelectedSession(null);
      setFeedback({ courseName, record: existing, isDuplicate: true });
      return;
    }
    if (!firebase) return;
    setSubmitError('');
    void submitAttendance(firebase.db, activeUser.id, payload)
      .then((result) => {
        setSelectedSession(null);
        setFeedback({ courseName, record: result.record, isDuplicate: result.isDuplicate });
      })
      .catch(() => {
        setSelectedSession(null);
        setSubmitError('Presensi gagal dikirim. Pastikan sesi masih dibuka dan koneksi stabil.');
      });
  };

  const leaveRequests = useLeaveRequests(isAssistant ? undefined : activeUser.id);
  const [selectedLeaveSession, setSelectedLeaveSession] = useState<LiveSession | null>(null);
  const [leaveActionError, setLeaveActionError] = useState<string | null>(null);

  const handleSubmitLeave = async ({ reason }: { sessionId: string; reason: string }) => {
    if (!firebase || !selectedLeaveSession) {
      throw new Error('Layanan Firebase belum siap.');
    }
    setLeaveActionError(null);
    await submitLeaveRequest(firebase.db, activeUser.id, {
      sessionId: selectedLeaveSession.id,
      classId: selectedLeaveSession.classId,
      reason,
    });
    setSelectedLeaveSession(null);
  };

  const activeBannerError = error || attendance.error || leaveRequests.error || leaveActionError || submitError;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={SessionSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.brand}>LabSync</Text>
            <Text style={styles.identity}>
              {activeUser.name} · {activeUser.identifier} · {isAssistant ? 'Asisten' : 'Praktikan'}
            </Text>
            <Pressable accessibilityRole="button" onPress={logout} style={styles.button}>
              <Text style={styles.linkLabel}>Keluar</Text>
            </Pressable>
            {isAssistant ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/manage')} style={styles.button}>
                <Text style={styles.linkLabel}>Kelola Kelas & Sesi</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.push('/history')} style={styles.button}>
                <Text style={styles.linkLabel}>Riwayat Saya</Text>
              </Pressable>
            )}
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Jadwal praktikum</Text>
              {!loadingSessions && <Text style={styles.caption}>{sessions.length} sesi</Text>}
            </View>
            {!!activeBannerError && <Text accessibilityRole="alert" style={styles.body}>{activeBannerError}</Text>}
          </View>
        }
        ListEmptyComponent={loadingSessions
          ? <ActivityIndicator color={colors.primary} />
          : error ? undefined : <EmptyState title="Belum ada jadwal praktikum" description="Jadwal akan muncul saat sesi tersedia." />}
        renderItem={({ item }) => isAssistant ? (
          <SessionCard
            session={item}
            role={activeUser.role}
            onOpenSession={openSession}
            onCloseSession={closeSession}
            onViewRecap={(id) => router.push({ pathname: '/rekap/[id]', params: { id } })}
          />
        ) : (
          <SessionPraktikanCard
            session={item}
            isAttended={attendance.records.some((record) => record.sessionId === item.id)}
            onPressAttendance={(session) => {
              setSubmitError('');
              setSelectedSession(session);
            }}
            leaveRequest={leaveRequests.records.find((leave) => leave.sessionId === item.id)}
            onPressLeave={() => {
              setLeaveActionError(null);
              setSelectedLeaveSession(item);
            }}
          />
        )}
      />
      <AttendanceFormModal
        visible={!!selectedSession}
        sessionId={selectedSession?.id ?? ''}
        courseName={selectedSession?.courseName}
        className={selectedSession?.className}
        initialStudentId={activeUser.identifier}
        initialStudentName={activeUser.name}
        identityLocked
        onClose={() => setSelectedSession(null)}
        onSubmit={handleSubmitAttendance}
      />
      <AttendanceFeedbackModal
        visible={!!feedback}
        courseName={feedback?.courseName}
        attendance={feedback?.record ?? null}
        isDuplicate={feedback?.isDuplicate}
        onClose={() => setFeedback(null)}
      />
      {!isAssistant && selectedLeaveSession ? (
        <LeaveRequestModal
          visible={Boolean(selectedLeaveSession)}
          sessionId={selectedLeaveSession.id}
          courseName={selectedLeaveSession.courseName}
          className={selectedLeaveSession.className}
          studentId={activeUser.identifier}
          studentName={activeUser.name}
          onClose={() => setSelectedLeaveSession(null)}
          onSubmit={handleSubmitLeave}
        />
      ) : null}
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
  brand: { ...type.title, color: colors.primary },
  identity: { ...type.button, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  button: { minHeight: 48, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderDark, justifyContent: 'center', alignItems: 'center' },
  linkLabel: { ...type.button, color: colors.primary, textAlign: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  sectionTitle: { ...type.section, color: colors.text },
  caption: { ...type.caption, color: colors.textSecondary },
  separator: { height: space.lg },
});
