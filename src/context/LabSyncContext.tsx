import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { DUMMY_USERS, INITIAL_SESSIONS } from '@/constants/dummy-data';
import { createLabSyncState, getActiveUser, labSyncReducer, type LabSyncState } from '@/state/labsync-store';
import type { Session } from '@/types/session';
import type { UserProfile, UserRole } from '@/types/user';

interface LabSyncContextValue extends LabSyncState {
  activeUser: UserProfile | undefined;
  setRole: (role: UserRole) => void;
  selectStudent: (studentId: string) => void;
  openSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
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
  }), [state]);

  return <LabSyncContext.Provider value={value}>{children}</LabSyncContext.Provider>;
}

export function useLabSync() {
  const context = useContext(LabSyncContext);
  if (!context) throw new Error('useLabSync must be used inside LabSyncProvider');
  return context;
}
