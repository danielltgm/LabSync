import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionCard } from '@/components/asisten/SessionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionRow, Button, Eyebrow, LoadingLine, Notice, Rule } from '@/components/common/ui';
import { Wordmark } from '@/components/common/Wordmark';
import { AttendanceFeedbackModal, findExistingAttendance } from '@/components/praktikan/AttendanceFeedbackModal';
import { AttendanceFormModal } from '@/components/praktikan/AttendanceFormModal';
import { LeaveRequestModal } from '@/components/praktikan/LeaveRequestModal';
import { SessionPraktikanCard } from '@/components/praktikan/SessionPraktikanCard';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { firebase } from '@/firebase/client';
import { requestLeaveClassification } from '@/firebase/request-leave-classification';
import { submitAttendance, submitLeaveRequest } from '@/firebase/queries';
import { useAttendance } from '@/hooks/use-attendance';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { AttendancePayload, AttendanceRecord } from '@/types/attendance';
import type { Session } from '@/types/session';
import { useLeaveRequests } from '@/hooks/use-leave-requests';
import type { LiveSession } from '@/types/sprint2';

export default function HomeScreen() {
  const { wide, compact } = useResponsiveLayout();
  const columns = wide ? 2 : 1;
  const { sessions, activeUser, loadingSessions, error, retrySessions, openSession, closeSession, logout } = useLabSync();
  const isAssistant = activeUser.role === 'ASISTEN';
  const attendance = useAttendance(isAssistant ? undefined : activeUser.id);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
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
    if (!firebase || submittingAttendance) return;
    setSubmittingAttendance(true);
    setSubmitError('');
    void submitAttendance(firebase.db, activeUser.id, payload)
      .then((result) => {
        setSelectedSession(null);
        setFeedback({ courseName, record: result.record, isDuplicate: result.isDuplicate });
      })
      .catch(() => {
        setSelectedSession(null);
        setSubmitError('Presensi gagal dikirim. Pastikan sesi masih dibuka dan koneksi stabil.');
      })
      .finally(() => setSubmittingAttendance(false));
  };

  const leaveRequests = useLeaveRequests(isAssistant ? undefined : activeUser.id);
  const [selectedLeaveSession, setSelectedLeaveSession] = useState<LiveSession | null>(null);

  const handleSubmitLeave = async ({ reason }: { sessionId: string; reason: string }) => {
    if (!firebase || !selectedLeaveSession) {
      throw new Error('Layanan Firebase belum siap.');
    }
    const requestId = await submitLeaveRequest(firebase.db, activeUser.id, {
      sessionId: selectedLeaveSession.id,
      classId: selectedLeaveSession.classId,
      studentName: activeUser.name,
      studentId: activeUser.identifier,
      reason,
    });
    setSelectedLeaveSession(null);
    void requestLeaveClassification(requestId).catch(() => {
      // The leave is already saved and available to the assistant.
    });
  };

  const activeSessionCount = sessions.filter((session) => session.status === 'DIBUKA').length;
  const activeBannerError = error || attendance.error || leaveRequests.error || submitError;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns === 2 ? styles.columns : undefined}
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, compact && styles.compactContent, columns === 2 && styles.wideContent]}
        ItemSeparatorComponent={SessionSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.masthead}>
              <View style={styles.mastTop}>
                <Wordmark />
                <Button variant="quiet" compact label="Keluar" onPress={logout} style={styles.logout} />
              </View>
              <Rule strong />
              <View style={[styles.identityRow, columns === 2 && styles.identityRowWide]}>
                <View style={styles.identityCopy}>
                  <Eyebrow color={colors.primary}>{isAssistant ? 'Asisten' : 'Praktikan'}</Eyebrow>
                  <Text style={[styles.name, compact && styles.nameCompact]}>{activeUser.name}</Text>
                  <Text selectable style={styles.identifier}>{activeUser.identifier}</Text>
                </View>
                {!loadingSessions && (
                  <View style={[styles.activePill, activeSessionCount > 0 && styles.activePillLive]}>
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[styles.activeDot, activeSessionCount > 0 && styles.activeDotLive]}
                    />
                    <Text style={[styles.activeText, activeSessionCount > 0 && styles.activeTextLive]}>
                      {activeSessionCount} sesi aktif
                    </Text>
                  </View>
                )}
              </View>
              {!isAssistant && (
                <View style={styles.uid}>
                  <Text style={styles.uidLabel}>UID akun</Text>
                  <Text selectable style={styles.uidValue}>{activeUser.id}</Text>
                </View>
              )}
              {isAssistant ? (
                <ActionRow>
                  <Button
                    variant="primary"
                    label="Kelola Kelas & Sesi"
                    onPress={() => router.push('/manage')}
                    style={columns === 2 ? styles.shortcutWide : styles.shortcut}
                  />
                </ActionRow>
              ) : (
                <ActionRow>
                  <Button label="Riwayat Saya" onPress={() => router.push('/history')}
                    style={columns === 2 ? styles.shortcutWide : styles.shortcut} />
                  <Button label="Status Izin Saya" onPress={() => router.push('/izin')}
                    style={columns === 2 ? styles.shortcutWide : styles.shortcut} />
                </ActionRow>
              )}
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Jadwal praktikum</Text>
              {!loadingSessions && <Text style={styles.caption}>{sessions.length} sesi</Text>}
            </View>
            {!!activeBannerError && (
              <Notice tone="danger" message={activeBannerError} alert>
                {!!error && <Button compact label="Muat ulang jadwal" onPress={retrySessions} />}
                {!!leaveRequests.error && <Button compact label="Muat ulang status izin" onPress={leaveRequests.retry} />}
              </Notice>
            )}
          </View>
        }
        ListEmptyComponent={loadingSessions
          ? <LoadingLine label="Memuat jadwal…" />
          : error ? undefined : <EmptyState title="Belum ada jadwal praktikum" description="Jadwal akan muncul saat sesi tersedia." />}
        renderItem={({ item }) => (
          <View style={columns === 2 ? styles.halfCell : undefined} testID="session-cell">
            {isAssistant ? (
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
                  setSelectedLeaveSession(item);
                }}
              />
            )}
          </View>
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
  content: { padding: space.lg, paddingBottom: space.huge, width: '100%', maxWidth: layout.readable, alignSelf: 'center' },
  compactContent: { paddingHorizontal: space.md },
  wideContent: { maxWidth: layout.wide, paddingHorizontal: space.xxl, paddingTop: space.xxl },
  columns: { marginHorizontal: -space.sm, alignItems: 'stretch' },
  halfCell: { width: '50%', paddingHorizontal: space.sm, minWidth: 0 },
  header: { gap: space.xl, paddingBottom: space.xl },
  masthead: { gap: space.lg },
  mastTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  logout: { marginRight: -space.md },
  identityRow: { gap: space.md },
  identityRowWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  identityCopy: { gap: space.xs, flexShrink: 1, minWidth: 0 },
  name: { ...type.display, color: colors.text },
  nameCompact: { fontSize: 28, lineHeight: 34 },
  identifier: { ...type.mono, color: colors.textSecondary },
  activePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.surface,
  },
  activePillLive: { backgroundColor: colors.success.background, borderColor: colors.success.border },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neutral.solid },
  activeDotLive: { backgroundColor: colors.success.solid },
  activeText: { ...type.label, color: colors.neutral.text },
  activeTextLive: { color: colors.success.text },
  uid: {
    gap: space.xxs,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  uidLabel: { ...type.eyebrow, color: colors.textMuted },
  uidValue: { ...type.mono, color: colors.text },
  shortcut: { flexGrow: 1, flexBasis: 130 },
  shortcutWide: { flexGrow: 0, minWidth: 200 },
  section: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  sectionTitle: { ...type.heading, fontSize: 24, lineHeight: 30, color: colors.text },
  caption: { ...type.mono, fontSize: 13, color: colors.textMuted },
  separator: { height: space.lg },
});
