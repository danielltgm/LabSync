import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { DUMMY_USERS, INITIAL_SESSIONS, INITIAL_ATTENDANCES } from '@/constants/dummy-data';
import { createLabSyncState, getActiveUser, labSyncReducer, type LabSyncState } from '@/state/labsync-store';
import type { Session } from '@/types/session';
import type { UserProfile, UserRole } from '@/types/user';
import type { AttendancePayload, AttendanceRecord } from '@/types/attendance';

interface LabSyncContextValue extends LabSyncState {
  activeUser: UserProfile | undefined;
  setRole: (role: UserRole) => void;
  selectStudent: (studentId: string) => void;
  openSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  checkInSession: (payload: AttendancePayload) => void;
  clearCheckInResult: () => void;
}

const LabSyncContext = createContext<LabSyncContextValue | null>(null);

export function LabSyncProvider({
  children,
  initialUsers = DUMMY_USERS,
  initialSessions = INITIAL_SESSIONS,
  initialAttendances = INITIAL_ATTENDANCES,
}: {
  children: ReactNode;
  initialUsers?: readonly UserProfile[];
  initialSessions?: readonly Session[];
  initialAttendances?: readonly AttendanceRecord[];
}) {
  const [state, dispatch] = useReducer(
    labSyncReducer,
    { initialUsers, initialSessions, initialAttendances },
    ({ initialUsers: users, initialSessions: sessions, initialAttendances: attendances }) => createLabSyncState(users, sessions, attendances),
  );
  const value = useMemo<LabSyncContextValue>(() => ({
    ...state,
    activeUser: getActiveUser(state),
    setRole: (role) => dispatch({ type: 'set_role', role }),
    selectStudent: (studentId) => dispatch({ type: 'select_student', studentId }),
    openSession: (sessionId) => dispatch({ type: 'open_session', sessionId }),
    closeSession: (sessionId) => dispatch({ type: 'close_session', sessionId }),
    checkInSession: (payload) => {
      const now = new Date();
      const checkInTime = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((part) => String(part).padStart(2, '0')).join(':');
      dispatch({ type: 'check_in', payload, checkInTime });
    },
    clearCheckInResult: () => dispatch({ type: 'clear_check_in_result' }),
  }), [state]);

  return <LabSyncContext.Provider value={value}>{children}</LabSyncContext.Provider>;
}

export function useLabSync() {
  const context = useContext(LabSyncContext);
  if (!context) throw new Error('useLabSync must be used inside LabSyncProvider');
  return context;
}
