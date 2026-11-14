import type { LeaveRequestDocument } from './sprint2';

export type LeaveDecision = Exclude<LeaveRequestDocument['decision'], 'pending'>;

// Optional identity snapshots are supplied by the submission module, not fetched
// from other users' private profiles. Old documents remain readable.
export type LiveLeaveRequest = Omit<LeaveRequestDocument, 'submittedAt' | 'reviewedAt'> & {
  id: string;
  studentName?: string;
  studentId?: string;
  submittedAtMillis: number | null;
  reviewedAtMillis: number | null;
};
