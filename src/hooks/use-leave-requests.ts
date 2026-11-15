import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import { watchLeaveRequests, type LeaveRequestRecord } from '@/firebase/queries';

const emptyRecords: LeaveRequestRecord[] = [];

export function useLeaveRequests(studentUid?: string, classId?: string, sessionId?: string) {
  const key = studentUid ?? (classId ? `${classId}/${sessionId ?? '*'}` : undefined);
  const [snapshot, setSnapshot] = useState<{ key: string; records: LeaveRequestRecord[]; error?: string }>();

  useEffect(() => {
    if (!firebase || !key) return;
    const scope = studentUid ? { studentUid } : classId ? { classId, sessionId } : null;
    if (!scope) return;
    return watchLeaveRequests(firebase.db, scope, (records) => setSnapshot({ key, records }), () => {
      setSnapshot({ key, records: emptyRecords, error: 'Data pengajuan izin gagal dimuat.' });
    });
  }, [key, studentUid, classId, sessionId]);

  return snapshot && snapshot.key === key
    ? { records: snapshot.records, error: snapshot.error, loading: false }
    : { records: emptyRecords, error: undefined, loading: !!key };
}
