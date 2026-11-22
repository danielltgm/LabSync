import type { LiveAttendanceRecord } from '../../types/attendance-view';
import type { CheckInResult } from '../../types/sprint3';

export interface CheckInRecordParams {
  result: CheckInResult;
  sessionId: string;
  studentUid: string;
  studentId: string;
  studentName: string;
  className: string;
  notes?: string;
}

function formatJakartaTime(milliseconds: number | null): string {
  return milliseconds === null
    ? 'Menunggu sinkronisasi'
    : new Date(milliseconds)
        .toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })
        .replaceAll('.', ':');
}

export function buildAttendanceRecordId(sessionId: string, studentUid: string): string {
  return `${sessionId.trim()}__${studentUid.trim()}`;
}

export function toLiveAttendanceFromCheckIn(params: CheckInRecordParams): LiveAttendanceRecord {
  const deterministicId = buildAttendanceRecordId(params.sessionId, params.studentUid);
  const parsedMs = Date.parse(params.result.checkedInAt);
  const checkedInAtMillis = Number.isFinite(parsedMs) ? parsedMs : null;
  const cleanNotes = params.notes?.trim();

  return {
    id: deterministicId,
    sessionId: params.sessionId.trim(),
    studentUid: params.studentUid.trim(),
    studentId: params.studentId.trim(),
    studentName: params.studentName.trim(),
    className: params.className.trim(),
    ...(cleanNotes ? { notes: cleanNotes } : {}),
    checkedInAtMillis,
    checkInTime: formatJakartaTime(checkedInAtMillis),
  };
}

export function reconcileOwnAttendance(
  liveRecord: LiveAttendanceRecord | null,
  checkInRecord: LiveAttendanceRecord | null,
): LiveAttendanceRecord | null {
  if (liveRecord && checkInRecord && liveRecord.id === checkInRecord.id) {
    if (liveRecord.checkedInAtMillis === null && checkInRecord.checkedInAtMillis !== null) {
      return {
        ...liveRecord,
        checkedInAtMillis: checkInRecord.checkedInAtMillis,
        checkInTime: checkInRecord.checkInTime,
      };
    }
    return liveRecord;
  }
  return liveRecord ?? checkInRecord ?? null;
}

export function dedupeAttendanceRecords(
  records: readonly LiveAttendanceRecord[],
): LiveAttendanceRecord[] {
  const byKey = new Map<string, LiveAttendanceRecord>();

  for (const record of records) {
    const key =
      record.sessionId && record.studentUid
        ? buildAttendanceRecordId(record.sessionId, record.studentUid)
        : record.id;
    const normalized: LiveAttendanceRecord = record.id === key ? record : { ...record, id: key };
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, normalized);
      continue;
    }

    const existingMs = existing.checkedInAtMillis ?? -1;
    const candidateMs = normalized.checkedInAtMillis ?? -1;
    if (candidateMs >= existingMs) {
      byKey.set(key, normalized);
    }
  }

  return Array.from(byKey.values());
}

export function hasSessionAttendance(
  records: readonly LiveAttendanceRecord[],
  sessionId: string,
  studentUid: string,
): boolean {
  const targetId = buildAttendanceRecordId(sessionId, studentUid);
  return records.some(
    (record) =>
      record.id === targetId ||
      (record.sessionId === sessionId && record.studentUid === studentUid),
  );
}
