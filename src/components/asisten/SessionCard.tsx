import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SessionControlAction } from '@/components/asisten/SessionControlAction';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
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
    <View style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{session.courseName}</Text>
        <StatusBadge status={session.status} />
      </View>
      <View style={styles.details}>
        <Text style={styles.detail}>Kelas {session.className} · {session.date}</Text>
        <Text style={styles.detail}>{session.labRoom}</Text>
        <Text style={styles.time}>{session.startTime}–{session.endTime}</Text>
        <Text style={styles.detail}>Asisten: {session.assistantName}</Text>
      </View>

      {role === 'ASISTEN' && (
        <View style={styles.actions}>
          <SessionControlAction
            sessionId={session.id}
            status={session.status}
            role={role}
            onOpenSession={onOpenSession}
            onCloseSession={onCloseSession}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lihat rekap ${session.courseName}`}
            onPress={() => onViewRecap(session.id)}
            style={({ pressed }) => [styles.recapButton, pressed && styles.pressed]}
          >
            <Text style={styles.recapLabel}>Lihat Rekap Presensi</Text>
          </Pressable>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.xl,
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space.sm },
  title: { ...type.heading, color: colors.text, flexGrow: 1, flexBasis: 180 },
  details: { gap: space.sm },
  detail: { ...type.body, color: colors.textSecondary },
  time: { ...type.button, color: colors.text },
  actions: { gap: space.sm },
  recapButton: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapLabel: { ...type.button, color: colors.text, textAlign: 'center' },
  pressed: { opacity: 0.8 },
});

export default SessionCard;
