import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where, type Firestore, type Timestamp } from 'firebase/firestore';

import type { LeaveDecision, LiveLeaveRequest } from '@/types/leave-request';
import type { LeaveRequestDocument } from '@/types/sprint2';

export type LeaveScope = { studentUid: string } | { classId: string; sessionId: string };

export function watchLeaveRequests(db: Firestore, scope: LeaveScope,
  onChange: (records: LiveLeaveRequest[]) => void, onError: (error: Error) => void) {
  const records = collection(db, 'leaveRequests');
  const scoped = 'studentUid' in scope
    ? query(records, where('studentUid', '==', scope.studentUid))
    : query(records, where('classId', '==', scope.classId), where('sessionId', '==', scope.sessionId));
  return onSnapshot(scoped, (snapshot) => onChange(snapshot.docs.map((item) => {
    const data = item.data() as LeaveRequestDocument & { studentName?: string; studentId?: string };
    return {
      ...data, id: item.id,
      submittedAtMillis: (data.submittedAt as Timestamp | null)?.toMillis() ?? null,
      reviewedAtMillis: data.reviewedAt?.toMillis() ?? null,
    };
  }).sort((a, b) => (b.submittedAtMillis ?? 0) - (a.submittedAtMillis ?? 0) || a.id.localeCompare(b.id))), onError);
}

export function reviewLeaveRequest(db: Firestore, requestId: string, reviewerUid: string, decision: LeaveDecision) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('invalid-decision');
  const ref = doc(db, 'leaveRequests', requestId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('request-not-found');
    if (snapshot.data().decision !== 'pending') throw new Error('already-reviewed');
    transaction.update(ref, { decision, reviewedBy: reviewerUid, reviewedAt: serverTimestamp() });
  });
}
