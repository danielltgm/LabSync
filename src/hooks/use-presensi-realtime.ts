import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import {
  resolvePresensiAvailability,
  type PresensiAvailability,
} from '@/services/attendance/session-guard';
import type { PresensiSessionDocument } from '@/services/attendance/session-view';
import type { LiveAttendanceRecord } from '@/types/attendance-view';
import type { AttendanceDocument } from '@/types/sprint2';
import { toAttendanceRecord } from '@/utils/attendance-view';

export interface PresensiRealtimeState {
  session: PresensiSessionDocument | null;
  ownAttendance: LiveAttendanceRecord | null;
  availability: PresensiAvailability | null;
  loading: boolean;
  error: string | null;
}

export function usePresensiRealtime(sessionId?: string, studentUid?: string): PresensiRealtimeState {
  const [session, setSession] = useState<PresensiSessionDocument | null>(null);
  const [ownAttendance, setOwnAttendance] = useState<LiveAttendanceRecord | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(null);
    setOwnAttendance(null);
    setSessionLoaded(false);
    setAttendanceLoaded(false);
    setError(null);

    if (!firebase || !sessionId || !studentUid) return;
    const { db } = firebase;
    let active = true;

    const stopSession = onSnapshot(
      doc(db, 'sessions', sessionId),
      (snap) => {
        if (!active) return;
        setSession(snap.exists() ? { ...(snap.data() as Omit<PresensiSessionDocument, 'id'>), id: snap.id } : null);
        setSessionLoaded(true);
      },
      () => {
        if (!active) return;
        setSessionLoaded(true);
        setError('Pembaruan realtime sesi terganggu.');
      },
    );

    const attendanceId = `${sessionId}__${studentUid}`;
    const stopAttendance = onSnapshot(
      doc(db, 'attendance', attendanceId),
      (snap) => {
        if (!active) return;
        setOwnAttendance(snap.exists() ? toAttendanceRecord(snap.id, snap.data() as AttendanceDocument) : null);
        setAttendanceLoaded(true);
      },
      () => {
        if (!active) return;
        setAttendanceLoaded(true);
        setError('Status presensi akun gagal disinkronkan.');
      },
    );

    return () => {
      active = false;
      stopSession();
      stopAttendance();
    };
  }, [sessionId, studentUid]);

  const availability = session ? resolvePresensiAvailability(session.status, ownAttendance) : null;
  return {
    session,
    ownAttendance,
    availability,
    loading: Boolean(sessionId && studentUid) && (!sessionLoaded || !attendanceLoaded),
    error,
  };
}
