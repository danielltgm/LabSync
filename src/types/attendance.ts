export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;    // NIM praktikan
  studentName: string;
  className: string;
  checkInTime: string;  // Contoh: '08:15:22'
  notes?: string;       // Catatan opsional (e.g. 'PC-14')
}

export interface AttendancePayload {
  sessionId: string;
  studentId: string;
  studentName: string;
  className: string;
  notes?: string;
}
