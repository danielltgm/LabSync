import type { Session } from '../types/session';
import type { UserProfile, UserRole } from '../types/user';
import type { AttendancePayload, AttendanceRecord } from '../types/attendance';

export type CheckInResult =
  | { kind: 'success' | 'duplicate'; attendance: AttendanceRecord }
  | { kind: 'error'; message: string };

export interface LabSyncState {
  users: UserProfile[];
  sessions: Session[];
  attendances: AttendanceRecord[];
  checkInResult: CheckInResult | null;
  activeRole: UserRole;
  activeStudentId: string | null;
}

export type LabSyncAction =
  | { type: 'set_role'; role: UserRole }
  | { type: 'select_student'; studentId: string }
  | { type: 'open_session'; sessionId: string }
  | { type: 'close_session'; sessionId: string }
  | { type: 'check_in'; payload: AttendancePayload; checkInTime: string }
  | { type: 'clear_check_in_result' };

export function createLabSyncState(
  users: readonly UserProfile[],
  sessions: readonly Session[],
  attendances: readonly AttendanceRecord[] = [],
): LabSyncState {
  return {
    users: users.map((user) => ({ ...user })),
    sessions: sessions.map((session) => ({ ...session })),
    attendances: attendances.map((attendance) => ({ ...attendance })),
    checkInResult: null,
    activeRole: users.some((user) => user.role === 'ASISTEN') ? 'ASISTEN' : 'PRAKTISAN',
    activeStudentId: users.find((user) => user.role === 'PRAKTISAN')?.id ?? null,
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
      return action.role === state.activeRole ? state : { ...state, activeRole: action.role, checkInResult: null };
    }
    case 'select_student': {
      const student = state.users.find((user) => user.id === action.studentId && user.role === 'PRAKTISAN');
      if (state.activeRole !== 'PRAKTISAN' || !student || state.activeStudentId === student.id) return state;
      return { ...state, activeStudentId: student.id, checkInResult: null };
    }
    case 'clear_check_in_result':
      return state.checkInResult ? { ...state, checkInResult: null } : state;
    case 'check_in': {
      const fail = (message: string): LabSyncState => ({ ...state, checkInResult: { kind: 'error', message } });
      const user = getActiveUser(state);
      const { payload, checkInTime } = action;
      const session = state.sessions.find((item) => item.id === payload.sessionId);
      if (user?.role !== 'PRAKTISAN') return fail('Pilih peran praktikan untuk melakukan presensi.');
      if (!session || session.status !== 'DIBUKA') return fail('Sesi sudah berubah atau belum dibuka. Silakan periksa jadwal kembali.');
      const studentId = payload.studentId.trim();
      if (!/^\d+$/.test(studentId) || studentId !== user.identifier || payload.studentName.trim() !== user.name) {
        return fail('NIM dan nama harus sesuai dengan identitas praktikan yang aktif.');
      }
      const existing = state.attendances.find((item) => item.sessionId === session.id && item.studentId === studentId);
      if (existing) return { ...state, checkInResult: { kind: 'duplicate', attendance: existing } };
      const notes = payload.notes?.trim();
      if (notes && notes.length > 50) return fail('Catatan maksimal 50 karakter.');
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(checkInTime)) return fail('Waktu presensi tidak valid. Silakan coba lagi.');
      let nextId = state.attendances.length + 1;
      while (state.attendances.some((item) => item.id === `att-${String(nextId).padStart(3, '0')}`)) nextId++;
      const attendance: AttendanceRecord = {
        id: `att-${String(nextId).padStart(3, '0')}`,
        sessionId: session.id, studentId, studentName: user.name,
        className: session.className, checkInTime, notes: notes || undefined,
      };
      return {
        ...state,
        attendances: [...state.attendances, attendance],
        checkInResult: { kind: 'success', attendance },
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
