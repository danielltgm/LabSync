import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where, type Firestore } from 'firebase/firestore';

import type { AttendancePayload, AttendanceRecord } from '@/types/attendance';
import { resolveLeaveClassification } from '@/firebase/ai-classifier';
import type { SessionStatus } from '@/types/session';
import type {
  AttendanceDocument,
  ClassifyLeaveReason,
  LeaveClassification,
  LeaveRequestDocument,
  LiveSession,
  SessionDocument,
  UserDocument,
} from '@/types/sprint2';
import type { UserProfile } from '@/types/user';

type OnError = (error: Error) => void;

function formatJakartaTime(date: Date) {
  return date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replaceAll('.', ':');
}

function toAttendanceRecord(id: string, data: AttendanceDocument): AttendanceRecord {
  const { checkedInAt, sessionId, studentId, studentName, className, notes } = data;
  return {
    id,
    sessionId,
    studentId,
    studentName,
    className,
    notes,
    checkInTime: formatJakartaTime(checkedInAt ? checkedInAt.toDate() : new Date()),
  };
}

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

export function submitAttendance(db: Firestore, studentUid: string, payload: AttendancePayload) {
  const sessionRef = doc(db, 'sessions', payload.sessionId);
  const attendanceRef = doc(db, 'attendance', `${payload.sessionId}__${studentUid}`);

  return runTransaction(db, async (transaction) => {
    const [sessionSnap, attendanceSnap] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(attendanceRef),
    ]);

    if (attendanceSnap.exists()) {
      return {
        isDuplicate: true,
        record: toAttendanceRecord(attendanceSnap.id, attendanceSnap.data() as AttendanceDocument),
      };
    }

    const session = sessionSnap.data() as SessionDocument | undefined;
    if (!session || session.status !== 'DIBUKA') {
      throw new Error('Sesi praktikum tidak sedang dibuka.');
    }

    const notes = payload.notes?.trim();
    const studentId = payload.studentId.trim();
    const studentName = payload.studentName.trim();

    transaction.set(attendanceRef, {
      sessionId: payload.sessionId,
      classId: session.classId,
      studentUid,
      studentId,
      studentName,
      className: session.className,
      checkedInAt: serverTimestamp(),
      ...(notes ? { notes } : {}),
    });

    return {
      isDuplicate: false,
      record: {
        id: attendanceRef.id,
        sessionId: payload.sessionId,
        studentId,
        studentName,
        className: session.className,
        notes: notes || undefined,
        checkInTime: formatJakartaTime(new Date()),
      } satisfies AttendanceRecord,
    };
  });
}

type AttendanceScope = { studentUid: string } | { classId: string; sessionId: string };

export function watchAttendance(db: Firestore, scope: AttendanceScope, onChange: (records: AttendanceRecord[]) => void, onError: OnError) {
  const records = collection(db, 'attendance');
  const scoped = 'studentUid' in scope
    ? query(records, where('studentUid', '==', scope.studentUid))
    : query(records, where('classId', '==', scope.classId), where('sessionId', '==', scope.sessionId));

  return onSnapshot(
    scoped,
    (snapshot) => onChange(snapshot.docs.map((item) => toAttendanceRecord(item.id, item.data() as AttendanceDocument))),
    onError,
  );
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

export interface LeaveRequestRecord {
  id: string;
  sessionId: string;
  classId: string;
  studentUid: string;
  reason: string;
  submittedTime: string;
  classification: LeaveClassification;
  decision: LeaveRequestDocument['decision'];
}

type LeaveRequestScope = { studentUid: string } | { classId: string; sessionId?: string };

export interface SubmitLeaveInput {
  sessionId: string;
  classId: string;
  reason: string;
}

export function watchLeaveRequests(
  db: Firestore,
  scope: LeaveRequestScope,
  onChange: (records: LeaveRequestRecord[]) => void,
  onError: OnError,
) {
  const requests = collection(db, 'leaveRequests');
  const scoped = 'studentUid' in scope
    ? query(requests, where('studentUid', '==', scope.studentUid))
    : scope.sessionId
      ? query(requests, where('classId', '==', scope.classId), where('sessionId', '==', scope.sessionId))
      : query(requests, where('classId', '==', scope.classId));

  return onSnapshot(scoped, (snapshot) => onChange(snapshot.docs.map((item) => {
    const data = item.data() as LeaveRequestDocument;
    const submittedDate = data.submittedAt && typeof data.submittedAt.toDate === 'function'
      ? data.submittedAt.toDate()
      : new Date();
    return {
      id: item.id,
      sessionId: data.sessionId,
      classId: data.classId,
      studentUid: data.studentUid,
      reason: data.reason,
      submittedTime: submittedDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replaceAll('.', ':'),
      classification: data.classification,
      decision: data.decision,
    };
  })), onError);
}

export async function submitLeaveRequest(
  db: Firestore,
  studentUid: string,
  input: SubmitLeaveInput,
  classifier?: ClassifyLeaveReason,
): Promise<{ id: string; classification: LeaveClassification }> {
  const cleanReason = input.reason.trim();
  if (!cleanReason) {
    throw new Error('Alasan izin wajib diisi.');
  }

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
      reason: cleanReason,
      submittedAt: serverTimestamp(),
      classification: { status: 'pending' },
      decision: 'pending',
    });
  });

  const classification = await resolveLeaveClassification(cleanReason, classifier);
  try {
    await updateDoc(leaveRef, { classification });
  } catch {
    // Jika pembaruan klasifikasi terkendala jaringan, pengajuan izin tetap tersimpan untuk direview asisten.
  }

  return { id: requestId, classification };
}

