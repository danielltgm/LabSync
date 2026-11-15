import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { SessionRecap } from '@/components/rekap/SessionRecap';
import { LabSyncColors as colors, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { useAttendance } from '@/hooks/use-attendance';

export default function SessionRecapScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { sessions, activeUser, loadingSessions, error, openSession, closeSession, retrySessions } = useLabSync();
  const session = activeUser.role === 'ASISTEN' ? sessions.find((item) => item.id === id) : undefined;
  const attendance = useAttendance(undefined, session?.classId, session?.id);

  return (
    <SessionRecap
      sessionId={id}
      sessions={sessions}
      attendances={attendance.records}
      activeUser={activeUser}
      notice={attendance.error || error}
      loading={attendance.loading || loadingSessions}
      onRetry={() => { attendance.retry(); retrySessions(); }}
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      sessionControls={session && (
        <View>
          <SessionControlAction sessionId={session.id} status={session.status} role={activeUser.role}
            onOpenSession={openSession} onCloseSession={closeSession} />
          <Pressable accessibilityRole="button" style={styles.link} onPress={() => router.push({ pathname: '/izin/[id]', params: { id: session.id } })}>
            <Text style={styles.label}>Review izin sesi ini</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 48, paddingVertical: space.md, justifyContent: 'center' },
  label: { ...type.button, color: colors.primary },
});
