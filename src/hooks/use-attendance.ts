import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import { watchAttendance } from '@/firebase/queries';
import type { AttendanceRecord } from '@/types/attendance';

const emptyRecords: AttendanceRecord[] = [];

export function useAttendance(studentUid?: string, classId?: string, sessionId?: string) {
  const key = studentUid ?? (classId && sessionId ? `${classId}/${sessionId}` : undefined);
  const [snapshot, setSnapshot] = useState<{ key: string; records: AttendanceRecord[]; error?: string }>();

  useEffect(() => {
    if (!firebase || !key) return;
    const scope = studentUid ? { studentUid } : classId && sessionId ? { classId, sessionId } : null;
    if (!scope) return;
    return watchAttendance(firebase.db, scope, (records) => setSnapshot({ key, records }), () => {
      setSnapshot({ key, records: emptyRecords, error: 'Data presensi gagal dimuat.' });
    });
  }, [key, studentUid, classId, sessionId]);

  return snapshot && snapshot.key === key
    ? { records: snapshot.records, error: snapshot.error, loading: false }
    : { records: emptyRecords, error: undefined, loading: !!key };
}
