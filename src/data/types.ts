import type { LeaveCategory } from '@/firebase/ai-classifier';

// Domain model for the Sprint 3 UI. Identity is keyed by NIM (PM feedback: "uid pake nim").
// Timestamps are epoch milliseconds so the same shapes work for demo state and Firestore Timestamps.

export type Role = 'PRAKTIKAN' | 'ASISTEN' | 'SUPERADMIN';

export interface User {
  nim: string;
  name: string;
  email: string;
  role: Role;
  angkatan?: number;
  phone?: string;
}

export interface Lab {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  lat: number;
  lng: number;
  radiusM: number;
  maxAccuracyM: number;
  capacity: number;
  facilities: string[];
  /** Room photos (URIs), first one is the cover. Lets students recognise the room. */
  photos: string[];
  /** Short directions, e.g. "Naik tangga utara, pintu kedua kiri". */
  directions?: string;
  updatedBy?: string;
  updatedAt?: number;
}

/** A practicum subject, e.g. "Pemrograman Mobile". */
export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
}

/** One class of a course, e.g. Pemrograman Mobile · Kelas E. */
export interface ClassGroup {
  id: string;
  courseId: string;
  label: string;
  labId: string;
  assistantNims: string[];
  studentNims: string[];
  /** 0 = Minggu … 6 = Sabtu */
  weekday: number;
  startTime: string;
  endTime: string;
  /** Class resources: WhatsApp group, Drive folder, LMS… Edited by staff, visible to members. */
  links?: Material[];
}

export type SessionStatus = 'TERJADWAL' | 'DIBUKA' | 'SELESAI' | 'DIBATALKAN';

export interface Material {
  label: string;
  url: string;
}

/** One meeting (pertemuan) of a class. */
export interface Session {
  id: string;
  classId: string;
  meetingNo: number;
  topic: string;
  description: string;
  labId: string;
  startsAt: number;
  endsAt: number;
  status: SessionStatus;
  lateAfterMin: number;
  materials: Material[];
  openedAt?: number;
  closedAt?: number;
  /** Shown to students when the schedule changed. */
  changeNote?: string;
}

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'ALPHA';
export type CheckInMethod = 'GEO' | 'QR' | 'MANUAL';

export interface Attendance {
  id: string;
  sessionId: string;
  nim: string;
  status: AttendanceStatus;
  method: CheckInMethod;
  checkedInAt: number;
  distanceM?: number;
  accuracyM?: number;
  note?: string;
  overriddenBy?: string;
}

export type { LeaveCategory };
export type LeaveDecision = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  sessionId: string;
  nim: string;
  /** Set by the AI classifier after submit (Sprint 2 contract: the student can't pick it). Undefined = not classified yet. */
  category?: LeaveCategory;
  reason: string;
  attachmentName?: string;
  submittedAt: number;
  decision: LeaveDecision;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
}

export type NotificationType =
  | 'SESSION_OPENED'
  | 'SCHEDULE_CHANGED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_SUBMITTED'
  | 'REMINDER'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  nim: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: number;
  readAt?: number;
  href?: string;
}

export type CheckInFailure =
  | 'SESSION_NOT_OPEN'
  | 'OUTSIDE_TIME_WINDOW'
  | 'NOT_ENROLLED'
  | 'ALREADY_CHECKED_IN'
  | 'LOCATION_UNAVAILABLE'
  | 'LOW_ACCURACY'
  | 'MOCK_LOCATION'
  | 'OUT_OF_RADIUS'
  | 'INVALID_QR';

export interface CheckInAttempt {
  id: string;
  sessionId: string;
  nim: string;
  at: number;
  ok: boolean;
  method: CheckInMethod;
  failure?: CheckInFailure;
  distanceM?: number;
  accuracyM?: number;
}

export interface Position {
  lat: number;
  lng: number;
  accuracyM: number;
  mocked?: boolean;
  at: number;
}

/** A graded item in a class (tugas, laporan, responsi…). Optional feature for assistants. */
export interface Assignment {
  id: string;
  classId: string;
  title: string;
  /** Percent of the final grade. Weights of a class should add up to 100. */
  weight: number;
  maxScore: number;
  createdAt: number;
}

/** Scores keyed by `${assignmentId}__${nim}`. */
export type Grades = Record<string, number>;

/* ---------------------------------------------------------------- audit log */

export type LogKind = 'NILAI' | 'PRESENSI' | 'IZIN' | 'PERTEMUAN' | 'ANGGOTA' | 'PERAN' | 'LAB' | 'KELAS' | 'KUIS';

/**
 * One append-only audit entry. Entries are never edited or removed; each one carries the hash of the
 * previous entry, so a changed or deleted entry breaks the chain (see verifyLog in selectors).
 * Firestore later: `auditLog` collection with create-only rules, written by the server.
 */
export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  actorRole: Role;
  kind: LogKind;
  classId?: string;
  /** Short subject, e.g. "Raka Aditya Pratama · Laporan praktikum". */
  target: string;
  summary: string;
  changes?: { label: string; from?: string; to: string }[];
  reason?: string;
  prevHash: string;
  hash: string;
}

/* --------------------------------------------------------------------- quiz */

export type QuestionType = 'PILGAN' | 'ISIAN';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  /** PILGAN only. */
  options: string[];
  /** PILGAN: index of the correct option. */
  correct?: number;
  /** ISIAN: optional key for automatic grading; alternatives separated by "|". Empty = graded by the assistant. */
  answerKey?: string;
}

export type QuizStatus = 'DRAFT' | 'DIBUKA' | 'DITUTUP';

export interface Quiz {
  id: string;
  sessionId: string;
  classId: string;
  title: string;
  durationMin: number;
  /** Warnings allowed; leaving once more after the last warning submits the quiz automatically. */
  maxWarnings: number;
  shuffle: boolean;
  requireAttendance: boolean;
  /** Grade book column the final quiz score is written to, if linked. */
  assignmentId?: string;
  questions: QuizQuestion[];
  status: QuizStatus;
  createdBy: string;
  createdAt: number;
  openedAt?: number;
  closedAt?: number;
}

export type ViolationKind = 'KELUAR_APLIKASI' | 'SCREENSHOT' | 'PINDAH_TAB' | 'KELUAR_FULLSCREEN';

export interface QuizAttempt {
  /** `${quizId}__${nim}` */
  id: string;
  quizId: string;
  nim: string;
  startedAt: number;
  deadline: number;
  /** Question order shown to this student. */
  order: string[];
  answers: Record<string, number | string>;
  violations: { at: number; kind: ViolationKind }[];
  /** Extra chances given by the assistant after a kick-out. */
  allowance: number;
  status: 'MENGERJAKAN' | 'DIKUMPULKAN' | 'DIKELUARKAN';
  submittedAt?: number;
  /** Assistant scores for ISIAN questions without a key, keyed by question id. */
  manual: Record<string, number>;
}

export type NavSlot = 'jadwal' | 'presensi' | 'kelas' | 'izin' | 'admin' | 'peta' | 'log';
