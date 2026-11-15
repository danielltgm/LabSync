import { router, useLocalSearchParams } from 'expo-router';

import { LeaveRequestsPanel } from '@/components/izin/LeaveRequestsPanel';
import { useLabSync } from '@/context/LabSyncContext';
import { firebase } from '@/firebase/client';
import { reviewLeaveRequest } from '@/firebase/leave-requests';
import { useLeaveRequests } from '@/hooks/use-leave-requests';

export default function SessionLeaveScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const { activeUser, sessions, loadingSessions, error, retrySessions } = useLabSync();
  const session = activeUser.role === 'ASISTEN' ? sessions.find((item) => item.id === id) : undefined;
  const leave = useLeaveRequests(undefined, session?.classId, session?.id);
  return <LeaveRequestsPanel key={`${activeUser.id}/${id}`} mode="assistant" permitted={!!session} session={session}
    requests={leave.records} sessions={sessions} loading={leave.loading || loadingSessions} error={leave.error || error}
    onRetry={() => { leave.retry(); retrySessions(); }} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    onReview={async (requestId, decision) => {
      if (!firebase || !session || activeUser.role !== 'ASISTEN') throw new Error('permission-denied');
      await reviewLeaveRequest(firebase.db, requestId, activeUser.id, decision);
    }} />;
}
