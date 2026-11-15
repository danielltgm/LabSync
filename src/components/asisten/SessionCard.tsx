import type { ReactNode } from 'react';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { SessionSheet } from '@/components/common/SessionSheet';
import { ActionRow, Button } from '@/components/common/ui';
import type { Session } from '@/types/session';
import type { UserRole } from '@/types/user';

export interface SessionCardProps {
  session: Session;
  role: UserRole;
  onOpenSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onViewRecap: (sessionId: string) => void;
  children?: ReactNode;
}

export function SessionCard({
  session,
  role,
  onOpenSession,
  onCloseSession,
  onViewRecap,
  children,
}: SessionCardProps) {
  return (
    <SessionSheet session={session}>
      {role === 'ASISTEN' && (
        <ActionRow>
          <SessionControlAction
            sessionId={session.id}
            status={session.status}
            role={role}
            onOpenSession={onOpenSession}
            onCloseSession={onCloseSession}
          />
          <Button
            label="Lihat Rekap Presensi"
            accessibilityLabel={`Lihat rekap ${session.courseName}`}
            onPress={() => onViewRecap(session.id)}
            grow
          />
        </ActionRow>
      )}
      {children}
    </SessionSheet>
  );
}

export default SessionCard;
