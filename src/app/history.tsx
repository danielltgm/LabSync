import { router } from 'expo-router';

import { AttendanceHistory } from '@/components/rekap/AttendanceHistory';
import { useLabSync } from '@/context/LabSyncContext';

export default function AttendanceHistoryScreen() {
  const { activeUser, sessions, attendances } = useLabSync();

  return (
    <AttendanceHistory
      activeUser={activeUser}
      sessions={sessions}
      attendances={attendances}
      notice="Demo Sprint 1: data disimpan selama aplikasi berjalan."
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    />
  );
}
