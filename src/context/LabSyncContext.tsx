import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { DUMMY_USERS, INITIAL_SESSIONS } from '@/constants/dummy-data';
import { createLabSyncState, getActiveUser, labSyncReducer, type LabSyncState } from '@/state/labsync-store';
import type { AttendancePayload } from '@/types/attendance';
import type { Session } from '@/types/session';
import type { UserProfile, UserRole } from '@/types/user';

interface LabSyncContextValue extends LabSyncState {
  activeUser: UserProfile | undefined;
  setRole: (role: UserRole) => void;
  selectStudent: (studentId: string) => void;
  openSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  submitAttendance: (payload: AttendancePayload) => void;
  clearAttendanceResult: () => void;
}

const LabSyncContext = createContext<LabSyncContextValue | null>(null);

export function LabSyncProvider({
  children,
  initialUsers = DUMMY_USERS,
  initialSessions = INITIAL_SESSIONS,
}: {
  children: ReactNode;
  initialUsers?: readonly UserProfile[];
  initialSessions?: readonly Session[];
}) {
  const [state, dispatch] = useReducer(
    labSyncReducer,
    { initialUsers, initialSessions },
    ({ initialUsers: users, initialSessions: sessions }) => createLabSyncState(users, sessions),
  );
  const value = useMemo<LabSyncContextValue>(() => ({
    ...state,
    activeUser: getActiveUser(state),
    setRole: (role) => dispatch({ type: 'set_role', role }),
    selectStudent: (studentId) => dispatch({ type: 'select_student', studentId }),
    openSession: (sessionId) => dispatch({ type: 'open_session', sessionId }),
    closeSession: (sessionId) => dispatch({ type: 'close_session', sessionId }),
    submitAttendance: (payload) => dispatch({
      type: 'submit_attendance', payload,
      checkInTime: new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false }),
    }),
    clearAttendanceResult: () => dispatch({ type: 'clear_attendance_result' }),
  }), [state]);

  return <LabSyncContext.Provider value={value}>{children}</LabSyncContext.Provider>;
}

export function useLabSync() {
  const context = useContext(LabSyncContext);
  if (!context) throw new Error('useLabSync must be used inside LabSyncProvider');
  return context;
}
