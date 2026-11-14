import type { AttendanceDocument } from '../types/sprint2';
import type { LiveAttendanceRecord } from '../types/attendance-view';

export function formatJakartaTime(milliseconds: number | null) {
  return milliseconds === null ? 'Menunggu sinkronisasi' : new Date(milliseconds)
    .toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false }).replaceAll('.', ':');
}

export function toAttendanceRecord(id: string, data: AttendanceDocument): LiveAttendanceRecord {
  const checkedInAtMillis = data.checkedInAt?.toMillis() ?? null;
  return {
    id, sessionId: data.sessionId, studentUid: data.studentUid, studentId: data.studentId,
    studentName: data.studentName, className: data.className, notes: data.notes,
    checkedInAtMillis, checkInTime: formatJakartaTime(checkedInAtMillis),
  };
}

export function personalAttendance(records: readonly LiveAttendanceRecord[], uid: string) {
  return records.filter((record) => record.studentUid === uid).sort((a, b) =>
    (b.checkedInAtMillis ?? 0) - (a.checkedInAtMillis ?? 0) || a.id.localeCompare(b.id));
}
