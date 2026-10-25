import type { AttendancePayload, AttendanceRecord } from '../types/attendance';
import type { Session } from '../types/session';
import type { UserProfile, UserRole } from '../types/user';

export type AttendanceResult =
  | { status: 'success' | 'duplicate'; attendance: AttendanceRecord }
  | { status: 'error'; message: string };

export interface LabSyncState {
  users: UserProfile[];
  sessions: Session[];
  activeRole: UserRole;
  activeStudentId: string | null;
  attendances: AttendanceRecord[];
  attendanceResult: AttendanceResult | null;
}

export type LabSyncAction =
  | { type: 'set_role'; role: UserRole }
  | { type: 'select_student'; studentId: string }
  | { type: 'open_session'; sessionId: string }
  | { type: 'close_session'; sessionId: string }
  | { type: 'submit_attendance'; payload: AttendancePayload; checkInTime: string }
  | { type: 'clear_attendance_result' };

export function createLabSyncState(users: readonly UserProfile[], sessions: readonly Session[]): LabSyncState {
  return {
    users: users.map((user) => ({ ...user })),
    sessions: sessions.map((session) => ({ ...session })),
    activeRole: users.some((user) => user.role === 'ASISTEN') ? 'ASISTEN' : 'PRAKTISAN',
    activeStudentId: users.find((user) => user.role === 'PRAKTISAN')?.id ?? null,
    attendances: [],
    attendanceResult: null,
  };
}

export function getActiveUser(state: LabSyncState): UserProfile | undefined {
  return state.users.find((user) => state.activeRole === 'ASISTEN'
    ? user.role === 'ASISTEN'
    : user.role === 'PRAKTISAN' && user.id === state.activeStudentId);
}

export function labSyncReducer(state: LabSyncState, action: LabSyncAction): LabSyncState {
  switch (action.type) {
    case 'set_role': {
      if (action.role !== 'ASISTEN' && action.role !== 'PRAKTISAN') return state;
      if (action.role === 'ASISTEN' && !state.users.some((user) => user.role === 'ASISTEN')) return state;
      return action.role === state.activeRole ? state : { ...state, activeRole: action.role, attendanceResult: null };
    }
    case 'select_student': {
      const student = state.users.find((user) => user.id === action.studentId && user.role === 'PRAKTISAN');
      if (state.activeRole !== 'PRAKTISAN' || !student || state.activeStudentId === student.id) return state;
      return { ...state, activeStudentId: student.id, attendanceResult: null };
    }
    case 'clear_attendance_result':
      return state.attendanceResult ? { ...state, attendanceResult: null } : state;
    case 'submit_attendance': {
      const user = getActiveUser(state);
      const { payload, checkInTime } = action;
      const session = state.sessions.find((item) => item.id === payload.sessionId);
      let message: string | undefined;
      if (user?.role !== 'PRAKTISAN') {
        message = 'Presensi hanya tersedia untuk praktikan dengan identitas aktif.';
      } else if (!session || session.status !== 'DIBUKA') {
        message = 'Sesi tidak tersedia atau sudah tidak dibuka. Presensi tidak dicatat.';
      } else if (payload.studentId.trim() !== user.identifier || payload.studentName.trim() !== user.name) {
        message = 'NIM dan nama harus sesuai dengan identitas praktikan aktif.';
      } else if (payload.className !== session.className || !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(checkInTime)) {
        message = 'Data sesi atau waktu presensi tidak valid.';
      }
      if (message || !user || !session) {
        return { ...state, attendanceResult: { status: 'error', message: message! } };
      }

      // Check against the latest reducer state, including queued double submissions.
      const existing = state.attendances.find((item) => item.sessionId === session.id && item.studentId === user.identifier);
      if (existing) {
        return { ...state, attendanceResult: { status: 'duplicate', attendance: existing } };
      }
      const attendance: AttendanceRecord = {
        id: `attendance-${state.attendances.length + 1}`,
        sessionId: session.id,
        studentId: user.identifier,
        studentName: user.name,
        className: session.className,
        checkInTime,
        notes: payload.notes?.trim() || undefined,
      };
      return {
        ...state,
        attendances: [...state.attendances, attendance],
        attendanceResult: { status: 'success', attendance },
      };
    }
    case 'open_session':
    case 'close_session': {
      const user = getActiveUser(state);
      const session = state.sessions.find((item) => item.id === action.sessionId);
      const expectedStatus = action.type === 'open_session' ? 'TERJADWAL' : 'DIBUKA';
      if (user?.role !== 'ASISTEN' || !session || session.assistantName !== user.name ||
          session.status !== expectedStatus) return state;

      return {
        ...state,
        sessions: state.sessions.map((item) => item.id === session.id
          ? { ...item, status: action.type === 'open_session' ? 'DIBUKA' : 'SELESAI' }
          : item),
      };
    }
    default:
      return state;
  }
}
