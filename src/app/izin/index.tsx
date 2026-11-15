import { router } from 'expo-router';

import { LeaveRequestsPanel } from '@/components/izin/LeaveRequestsPanel';
import { useLabSync } from '@/context/LabSyncContext';
import { useLeaveRequests } from '@/hooks/use-leave-requests';

export default function PersonalLeaveScreen() {
  const { activeUser, sessions, loadingSessions, error, retrySessions } = useLabSync();
  const permitted = activeUser.role === 'PRAKTISAN';
  const leave = useLeaveRequests(permitted ? activeUser.id : undefined);
  return <LeaveRequestsPanel key={activeUser.id} mode="student" permitted={permitted} requests={leave.records} sessions={sessions}
    loading={leave.loading || loadingSessions} error={leave.error || error}
    onRetry={() => { leave.retry(); retrySessions(); }} onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
