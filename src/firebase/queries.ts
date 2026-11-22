import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where, type Firestore } from 'firebase/firestore';

import { dedupeAttendanceRecords } from '@/services/attendance/recap-sync';
import type { LiveAttendanceRecord } from '@/types/attendance-view';
import type { SessionStatus } from '@/types/session';
import type { AttendanceDocument, LiveSession, SessionDocument, UserDocument } from '@/types/sprint2';
import type { LabActivityDocument, LabId } from '@/types/sprint3';
import type { UserProfile } from '@/types/user';
import { toAttendanceRecord } from '@/utils/attendance-view';

type OnError = (error: Error) => void;

export function watchProfile(db: Firestore, uid: string, onChange: (profile: UserProfile | null) => void, onError: OnError) {
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    const data = snapshot.data() as UserDocument | undefined;
    onChange(data ? { ...data, id: uid } : null);
  }, onError);
}

export function watchClassIds(db: Firestore, profile: UserProfile, onChange: (ids: string[]) => void, onError: OnError) {
  const classes = profile.role === 'ASISTEN'
    ? query(collection(db, 'classes'), where('assistantUid', '==', profile.id))
    : collection(db, 'enrollments', profile.id, 'classes');

  return onSnapshot(classes, (snapshot) => onChange(snapshot.docs.map((item) => item.id)), onError);
}

export function watchSessions(db: Firestore, classId: string, onChange: (sessions: LiveSession[]) => void, onError: OnError) {
  const sessions = query(collection(db, 'sessions'), where('classId', '==', classId));
  return onSnapshot(sessions, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ ...item.data() as SessionDocument, id: item.id })));
  }, onError);
}

export function updateSessionStatus(db: Firestore, sessionId: string, status: Exclude<SessionStatus, 'TERJADWAL'>) {
  const ref = doc(db, 'sessions', sessionId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.data()?.status;
    if (current === status) return;
    const expected = status === 'DIBUKA' ? 'TERJADWAL' : 'DIBUKA';
    if (current !== expected) throw new Error('Session status has changed');
    transaction.update(ref, { status });
  });
}

type AttendanceScope = { studentUid: string } | { classId: string; sessionId: string };

export function watchAttendance(db: Firestore, scope: AttendanceScope, onChange: (records: LiveAttendanceRecord[]) => void, onError: OnError) {
  const records = collection(db, 'attendance');
  const scoped = 'studentUid' in scope
    ? query(records, where('studentUid', '==', scope.studentUid))
    : query(records, where('classId', '==', scope.classId), where('sessionId', '==', scope.sessionId));

  return onSnapshot(scoped, (snapshot) => onChange(dedupeAttendanceRecords(snapshot.docs.map((item) =>
    toAttendanceRecord(item.id, item.data() as AttendanceDocument)))), onError);
}

export interface ManagedClass {
  id: string;
  name: string;
  assistantUid: string;
}

export function watchClassesForAssistant(
  db: Firestore,
  assistantUid: string,
  onChange: (classes: ManagedClass[]) => void,
  onError?: OnError
) {
  const classesQuery = query(collection(db, 'classes'), where('assistantUid', '==', assistantUid));
  return onSnapshot(
    classesQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((item) => ({
          id: item.id,
          name: item.data().name as string,
          assistantUid: item.data().assistantUid as string,
        }))
      );
    },
    onError
  );
}

export function watchClass(
  db: Firestore,
  classId: string,
  onChange: (cls: ManagedClass | null) => void,
  onError?: OnError
) {
  return onSnapshot(
    doc(db, 'classes', classId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      onChange({
        id: snapshot.id,
        name: snapshot.data().name as string,
        assistantUid: snapshot.data().assistantUid as string,
      });
    },
    onError
  );
}

export interface SubmitLeaveInput {
  sessionId: string;
  classId: string;
  studentName: string;
  studentId: string;
  reason: string;
}

export async function submitLeaveRequest(
  db: Firestore,
  studentUid: string,
  input: SubmitLeaveInput,
): Promise<string> {
  const cleanReason = input.reason.trim();
  if (!cleanReason) {
    throw new Error('Alasan izin wajib diisi.');
  }
  if (cleanReason.length > 4000) throw new Error('Alasan izin maksimal 4.000 karakter.');

  const requestId = `${input.sessionId}__${studentUid}`;
  const sessionRef = doc(db, 'sessions', input.sessionId);
  const leaveRef = doc(db, 'leaveRequests', requestId);

  await runTransaction(db, async (transaction) => {
    const [sessionSnap, leaveSnap] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(leaveRef),
    ]);

    if (!sessionSnap.exists()) {
      throw new Error('Sesi praktikum tidak ditemukan.');
    }

    const sessionData = sessionSnap.data() as SessionDocument;
    if (sessionData.classId !== input.classId) {
      throw new Error('Kelas sesi praktikum tidak sesuai.');
    }

    if (leaveSnap.exists()) {
      throw new Error('Pengajuan izin untuk sesi ini sudah dikirim.');
    }

    transaction.set(leaveRef, {
      sessionId: input.sessionId,
      classId: sessionData.classId,
      studentUid,
      studentName: input.studentName,
      studentId: input.studentId,
      reason: cleanReason,
      submittedAt: serverTimestamp(),
      classification: { status: 'pending' },
      decision: 'pending',
    });
  });

  return requestId;
}

/**
 * Berlangganan (listen) ke aktivitas laboratorium tertentu secara realtime (D-07, Y-04).
 * Mengonsumsi dokumen publik dari koleksi `labActivities` tanpa mengakses sesi privat.
 */
export function watchLabActivities(
  db: Firestore,
  labId: LabId,
  onChange: (activities: LabActivityDocument[]) => void,
  onError?: OnError
) {
  const activitiesQuery = query(
    collection(db, 'labActivities'),
    where('labId', '==', labId)
  );

  return onSnapshot(
    activitiesQuery,
    (snapshot) => {
      const records: LabActivityDocument[] = snapshot.docs.map((item) => {
        const data = item.data() as LabActivityDocument;
        return {
          ...data,
          sessionId: item.id,
        };
      });
      onChange(records);
    },
    onError
  );
}

/**
 * Berlangganan (listen) ke seluruh aktivitas laboratorium secara realtime (D-07, Y-04).
 */
export function watchAllLabActivities(
  db: Firestore,
  onChange: (activities: LabActivityDocument[]) => void,
  onError?: OnError
) {
  const activitiesQuery = collection(db, 'labActivities');

  return onSnapshot(
    activitiesQuery,
    (snapshot) => {
      const records: LabActivityDocument[] = snapshot.docs.map((item) => {
        const data = item.data() as LabActivityDocument;
        return {
          ...data,
          sessionId: item.id,
        };
      });
      onChange(records);
    },
    onError
  );
}

