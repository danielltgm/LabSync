import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { ActionRow, Button } from '@/components/common/ui';
import { SessionRecap } from '@/components/rekap/SessionRecap';
import { LabSyncSpacing as space } from '@/constants/labsync-theme';
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
        <ActionRow style={styles.controls}>
          <SessionControlAction sessionId={session.id} status={session.status} role={activeUser.role}
            onOpenSession={openSession} onCloseSession={closeSession} />
          <Button label="Review izin sesi ini" grow
            onPress={() => router.push({ pathname: '/izin/[id]', params: { id: session.id } })} />
        </ActionRow>
      )}
    />
  );
}

const styles = StyleSheet.create({
  controls: { marginTop: space.xs },
});
