import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import { watchLeaveRequests } from '@/firebase/leave-requests';
import type { LiveLeaveRequest } from '@/types/leave-request';

const emptyRecords: LiveLeaveRequest[] = [];

export function useLeaveRequests(studentUid?: string, classId?: string, sessionId?: string) {
  const key = studentUid ? `student/${studentUid}` : classId && sessionId ? `session/${classId}/${sessionId}` : undefined;
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ key: string; attempt: number; records: LiveLeaveRequest[]; error?: string }>();

  useEffect(() => {
    if (!firebase || !key) return;
    const scope = studentUid ? { studentUid } : classId && sessionId ? { classId, sessionId } : null;
    if (!scope) return;
    let active = true;
    const stop = watchLeaveRequests(firebase.db, scope, (records) => {
      if (active) setSnapshot({ key, attempt, records });
    }, () => {
      if (active) setSnapshot({ key, attempt, records: emptyRecords, error: 'Data izin gagal dimuat. Periksa koneksi lalu coba lagi.' });
    });
    return () => { active = false; stop(); };
  }, [key, studentUid, classId, sessionId, attempt]);

  const result = snapshot?.key === key && snapshot?.attempt === attempt
    ? { records: snapshot.records, loading: false, error: snapshot.error }
    : { records: emptyRecords, loading: !!key, error: undefined };
  return { ...result, retry: () => setAttempt((current) => current + 1) };
}
