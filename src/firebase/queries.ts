import { collection, doc, onSnapshot, query, runTransaction, where, type Firestore } from 'firebase/firestore';

import type { AttendanceRecord } from '@/types/attendance';
import type { SessionStatus } from '@/types/session';
import type { AttendanceDocument, LiveSession, SessionDocument, UserDocument } from '@/types/sprint2';
import type { UserProfile } from '@/types/user';

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

export function watchAttendance(db: Firestore, scope: AttendanceScope, onChange: (records: AttendanceRecord[]) => void, onError: OnError) {
  const records = collection(db, 'attendance');
  const scoped = 'studentUid' in scope
    ? query(records, where('studentUid', '==', scope.studentUid))
    : query(records, where('classId', '==', scope.classId), where('sessionId', '==', scope.sessionId));

  return onSnapshot(scoped, (snapshot) => onChange(snapshot.docs.map((item) => {
    const { checkedInAt, sessionId, studentId, studentName, className, notes } = item.data() as AttendanceDocument;
    return {
      id: item.id,
      sessionId,
      studentId,
      studentName,
      className,
      notes,
      checkInTime: checkedInAt.toDate().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replaceAll('.', ':'),
    };
  })), onError);
}
