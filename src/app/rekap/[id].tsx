import { router, useLocalSearchParams } from 'expo-router';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { SessionRecap } from '@/components/rekap/SessionRecap';
import { useLabSync } from '@/context/LabSyncContext';

export default function SessionRecapScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { sessions, activeUser, activeRole, openSession, closeSession, attendances } = useLabSync();
  const session = sessions.find((item) => item.id === id);

  return (
    <SessionRecap
      sessionId={id}
      sessions={sessions}
      attendances={attendances}
      activeUser={activeUser}
      notice="Demo Sprint 1: daftar hadir mengikuti presensi yang dikirim praktikan."
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      sessionControls={session && (
        <SessionControlAction sessionId={session.id} status={session.status} role={activeRole}
          onOpenSession={openSession} onCloseSession={closeSession} />
      )}
    />
  );
}
