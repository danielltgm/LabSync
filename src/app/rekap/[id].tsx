import { router, useLocalSearchParams } from 'expo-router';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { SessionRecap } from '@/components/rekap/SessionRecap';
import { useLabSync } from '@/context/LabSyncContext';
import { useAttendance } from '@/hooks/use-attendance';

export default function SessionRecapScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { sessions, activeUser, loadingSessions, error, openSession, closeSession } = useLabSync();
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
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      sessionControls={session && (
        <SessionControlAction sessionId={session.id} status={session.status} role={activeUser.role}
          onOpenSession={openSession} onCloseSession={closeSession} />
      )}
    />
  );
}
