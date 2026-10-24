export type SessionStatus = 'TERJADWAL' | 'DIBUKA' | 'SELESAI';

export interface Session {
  id: string;
  courseName: string;
  className: string;
  labRoom: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date: string; // YYYY-MM-DD
  status: SessionStatus;
  assistantName: string;
}
