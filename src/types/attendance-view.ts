import type { AttendanceRecord } from './attendance';

// Keep the Sprint 1 payload contract intact; these fields belong to live reads.
export type LiveAttendanceRecord = AttendanceRecord & {
  studentUid: string;
  checkedInAtMillis: number | null;
};
