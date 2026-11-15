import { firebase } from './client';

export async function requestLeaveClassification(requestId: string) {
  const user = firebase?.auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const response = await fetch(`/api/leave-requests/${encodeURIComponent(requestId)}/classify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Klasifikasi izin belum tersedia.');
}
