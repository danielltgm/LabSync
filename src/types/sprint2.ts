import type { Timestamp } from 'firebase/firestore';

import type { AttendanceRecord } from './attendance';
import type { Session } from './session';
import type { UserProfile } from './user';

export type UserDocument = Omit<UserProfile, 'id' | 'className'>;

export interface ClassDocument {
  name: string;
  assistantUid: string;
}

export interface EnrollmentDocument {
  enrolledAt: Timestamp;
}

export type SessionDocument = Omit<Session, 'id'> & { classId: string };
export type LiveSession = SessionDocument & { id: string };

export type AttendanceDocument = Omit<AttendanceRecord, 'id' | 'checkInTime'> & {
  classId: string;
  studentUid: string;
  checkedInAt: Timestamp;
};

export type LeaveClassification =
  | { status: 'pending' }
  | { status: 'classified'; category: string }
  | { status: 'unavailable' };

export interface LeaveRequestDocument {
  sessionId: string;
  classId: string;
  studentUid: string;
  reason: string;
  submittedAt: Timestamp;
  classification: LeaveClassification;
  decision: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
}

export interface LeaveClassificationInput {
  reason: string;
}

export interface LeaveClassificationResult {
  category: string;
}

export type ClassifyLeaveReason = (input: LeaveClassificationInput) => Promise<LeaveClassificationResult>;
