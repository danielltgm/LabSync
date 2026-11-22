import { router, useLocalSearchParams } from 'expo-router';

import { LeaveRequestsPanel } from '@/components/izin/LeaveRequestsPanel';
import { useLabSync } from '@/context/LabSyncContext';
import { useLeaveRequests } from '@/hooks/use-leave-requests';

export default function PersonalLeaveScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { activeUser, sessions, loadingSessions, error, retrySessions } = useLabSync();
  const permitted = activeUser.role === 'PRAKTISAN';
  const leave = useLeaveRequests(permitted ? activeUser.id : undefined);
  const requests = requestId ? leave.records.filter((record) => record.id === requestId) : leave.records;
  return <LeaveRequestsPanel key={activeUser.id} mode="student" permitted={permitted} requests={requests} sessions={sessions}
    loading={leave.loading || loadingSessions} error={leave.error || error}
    onRetry={() => { leave.retry(); retrySessions(); }} onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
