import type { Session } from '../types/session';
import type { UserProfile, UserRole } from '../types/user';

export interface LabSyncState {
  users: UserProfile[];
  sessions: Session[];
  activeRole: UserRole;
  activeStudentId: string | null;
}

export type LabSyncAction =
  | { type: 'set_role'; role: UserRole }
  | { type: 'select_student'; studentId: string }
  | { type: 'open_session'; sessionId: string }
  | { type: 'close_session'; sessionId: string };

export function createLabSyncState(users: readonly UserProfile[], sessions: readonly Session[]): LabSyncState {
  return {
    users: users.map((user) => ({ ...user })),
    sessions: sessions.map((session) => ({ ...session })),
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
      return action.role === state.activeRole ? state : { ...state, activeRole: action.role };
    }
    case 'select_student': {
      const student = state.users.find((user) => user.id === action.studentId && user.role === 'PRAKTISAN');
      if (state.activeRole !== 'PRAKTISAN' || !student || state.activeStudentId === student.id) return state;
      return { ...state, activeStudentId: student.id };
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
