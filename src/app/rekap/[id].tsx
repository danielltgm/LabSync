import { router, useLocalSearchParams } from 'expo-router';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { SessionRecap } from '@/components/rekap/SessionRecap';
import { PREVIEW_ATTENDANCES } from '@/constants/preview-attendance';
import { useLabSync } from '@/context/LabSyncContext';

export default function SessionRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, activeUser, activeRole, openSession, closeSession } = useLabSync();
  const session = sessions.find((item) => item.id === id);

  return (
    <SessionRecap
      sessionId={id}
      sessions={sessions}
      attendances={PREVIEW_ATTENDANCES}
      activeUser={activeUser}
      notice="Demo mandiri Zufar: data presensi contoh, belum terhubung ke formulir presensi."
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      sessionControls={session && (
        <SessionControlAction sessionId={session.id} status={session.status} role={activeRole}
          onOpenSession={openSession} onCloseSession={closeSession} />
      )}
    />
  );
}
