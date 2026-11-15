import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionCard } from '@/components/asisten/SessionCard';
import { EmptyState } from '@/components/common/EmptyState';
import { AttendanceFeedbackModal, findExistingAttendance } from '@/components/praktikan/AttendanceFeedbackModal';
import { AttendanceFormModal } from '@/components/praktikan/AttendanceFormModal';
import { SessionPraktikanCard } from '@/components/praktikan/SessionPraktikanCard';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { firebase } from '@/firebase/client';
import { submitAttendance } from '@/firebase/queries';
import { useAttendance } from '@/hooks/use-attendance';
import type { AttendancePayload, AttendanceRecord } from '@/types/attendance';
import type { Session } from '@/types/session';

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

  const alertMessage = error || attendance.error || submitError;

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
            {!isAssistant && (
              <Pressable accessibilityRole="button" onPress={() => router.push('/history')} style={styles.button}>
                <Text style={styles.linkLabel}>Riwayat Saya</Text>
              </Pressable>
            )}
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Jadwal praktikum</Text>
              {!loadingSessions && <Text style={styles.caption}>{sessions.length} sesi</Text>}
            </View>
            {!!alertMessage && <Text accessibilityRole="alert" style={styles.body}>{alertMessage}</Text>}
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
