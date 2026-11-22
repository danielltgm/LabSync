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

interface RealtimeSnapshot {
  key: string;
  session: PresensiSessionDocument | null;
  ownAttendance: LiveAttendanceRecord | null;
  sessionLoaded: boolean;
  attendanceLoaded: boolean;
  error: string | null;
}

export function usePresensiRealtime(sessionId?: string, studentUid?: string): PresensiRealtimeState {
  const key = sessionId && studentUid ? `${sessionId}__${studentUid}` : '';
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);

  useEffect(() => {
    if (!firebase || !sessionId || !studentUid || !key) return;
    const { db } = firebase;
    let active = true;

    const patch = (updater: (prev: RealtimeSnapshot) => RealtimeSnapshot) => {
      if (!active) return;
      setSnapshot((current) => {
        const base: RealtimeSnapshot =
          current && current.key === key
            ? current
            : { key, session: null, ownAttendance: null, sessionLoaded: false, attendanceLoaded: false, error: null };
        return updater(base);
      });
    };

    const stopSession = onSnapshot(
      doc(db, 'sessions', sessionId),
      (snap) => {
        const nextSession = snap.exists()
          ? { ...(snap.data() as Omit<PresensiSessionDocument, 'id'>), id: snap.id }
          : null;
        patch((prev) => ({ ...prev, session: nextSession, sessionLoaded: true }));
      },
      () => patch((prev) => ({ ...prev, sessionLoaded: true, error: 'Pembaruan realtime sesi terganggu.' })),
    );

    const stopAttendance = onSnapshot(
      doc(db, 'attendance', key),
      (snap) => {
        const nextAttendance = snap.exists()
          ? toAttendanceRecord(snap.id, snap.data() as AttendanceDocument)
          : null;
        patch((prev) => ({ ...prev, ownAttendance: nextAttendance, attendanceLoaded: true }));
      },
      () => patch((prev) => ({ ...prev, attendanceLoaded: true, error: 'Status presensi akun gagal disinkronkan.' })),
    );

    return () => {
      active = false;
      stopSession();
      stopAttendance();
    };
  }, [key, sessionId, studentUid]);

  const current = snapshot && snapshot.key === key ? snapshot : null;
  const session = current?.session ?? null;
  const ownAttendance = current?.ownAttendance ?? null;
  const availability = session ? resolvePresensiAvailability(session.status, ownAttendance) : null;

  return {
    session,
    ownAttendance,
    availability,
    loading: Boolean(key) && (!current?.sessionLoaded || !current?.attendanceLoaded),
    error: current?.error ?? null,
  };
}
