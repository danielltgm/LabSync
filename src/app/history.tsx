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
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    />
  );
}
