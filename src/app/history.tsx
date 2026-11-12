import { router } from 'expo-router';

import { AttendanceHistory } from '@/components/rekap/AttendanceHistory';
import { useLabSync } from '@/context/LabSyncContext';
import { useAttendance } from '@/hooks/use-attendance';

export default function AttendanceHistoryScreen() {
  const { activeUser, sessions, loadingSessions, error } = useLabSync();
  const attendance = useAttendance(activeUser.role === 'PRAKTISAN' ? activeUser.id : undefined);

  return (
    <AttendanceHistory
      activeUser={activeUser}
      sessions={sessions}
      attendances={attendance.records}
      notice={attendance.error || error}
      loading={attendance.loading || loadingSessions}
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    />
  );
}
