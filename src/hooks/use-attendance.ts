import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import { watchAttendance } from '@/firebase/queries';
import type { LiveAttendanceRecord } from '@/types/attendance-view';

const emptyRecords: LiveAttendanceRecord[] = [];

export function useAttendance(studentUid?: string, classId?: string, sessionId?: string) {
  const key = studentUid ? `student/${studentUid}` : (classId && sessionId ? `session/${classId}/${sessionId}` : undefined);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ key: string; attempt: number; records: LiveAttendanceRecord[]; error?: string }>();

  useEffect(() => {
    if (!firebase || !key) return;
    const scope = studentUid ? { studentUid } : classId && sessionId ? { classId, sessionId } : null;
    if (!scope) return;
    let active = true;
    const stop = watchAttendance(firebase.db, scope, (records) => {
      if (active) setSnapshot({ key, attempt, records });
    }, () => {
      if (active) setSnapshot({ key, attempt, records: emptyRecords, error: 'Data presensi gagal dimuat. Periksa koneksi lalu coba lagi.' });
    });
    return () => { active = false; stop(); };
  }, [key, studentUid, classId, sessionId, attempt]);

  const result = snapshot && snapshot.key === key && snapshot.attempt === attempt
    ? { records: snapshot.records, error: snapshot.error, loading: false }
    : { records: emptyRecords, error: undefined, loading: !!key };
  return { ...result, retry: () => setAttempt((current) => current + 1) };
}
