import { useLocalSearchParams } from 'expo-router';
import { CalendarX } from 'lucide-react-native';

import { CheckInPanel } from '@/components/app/check-in-panel';
import { EmptyState } from '@/components/app/primitives';
import { PageHeader, Screen } from '@/components/app/screen';
import { viewSession } from '@/data/selectors';
import { useStore } from '@/data/store';

/** Dedicated attendance page, separate from the session detail (Sprint 3 requirement 1). */
export default function AttendancePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const raw = state.sessions.find((s) => s.id === id);
  if (!raw) {
    return (
      <Screen header={<PageHeader title="Presensi" />}>
        <EmptyState icon={CalendarX} title="Sesi tidak ditemukan" />
      </Screen>
    );
  }
  const session = viewSession(state, raw);
  return (
    <Screen header={<PageHeader title="Presensi" subtitle={`${session.course.name} · P${session.meetingNo}`} />}>
      <CheckInPanel session={session} />
    </Screen>
  );
}
