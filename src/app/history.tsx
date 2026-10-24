import { router } from 'expo-router';

import { AttendanceHistory } from '@/components/rekap/AttendanceHistory';
import { PREVIEW_ATTENDANCES } from '@/constants/preview-attendance';
import { useLabSync } from '@/context/LabSyncContext';

export default function AttendanceHistoryScreen() {
  const { activeUser, sessions } = useLabSync();

  return (
    <AttendanceHistory
      activeUser={activeUser}
      sessions={sessions}
      attendances={PREVIEW_ATTENDANCES}
      notice="Demo mandiri Zufar: data presensi contoh, belum terhubung ke formulir presensi."
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    />
  );
}
