import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { SessionStatus } from '@/types/session';
import type { UserRole } from '@/types/user';

export interface SessionControlActionProps {
  sessionId: string;
  status: SessionStatus;
  role: UserRole;
  onOpenSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
}

export function SessionControlAction(props: SessionControlActionProps) {
  if (props.role !== 'ASISTEN') return null;
  if (props.status === 'SELESAI') {
    return <Text style={styles.finished}>Sesi telah selesai</Text>;
  }

  // A new session/status gets a fresh confirmation dialog; stale dialogs cannot reappear.
  return <SessionActionButton key={`${props.sessionId}:${props.status}`} {...props} />;
}

function SessionActionButton({
  sessionId,
  status,
  onOpenSession,
  onCloseSession,
}: SessionControlActionProps) {
  const [visible, setVisible] = useState(false);
  const isOpening = status === 'TERJADWAL';
  const label = isOpening ? 'Buka Sesi' : 'Tutup Sesi';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.button,
          isOpening ? styles.openButton : styles.closeButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.buttonLabel}>{label}</Text>
      </Pressable>
      <ConfirmationModal
        visible={visible}
        title={isOpening ? 'Buka sesi praktikum?' : 'Tutup sesi praktikum?'}
        message={isOpening
          ? 'Apakah Anda yakin ingin membuka sesi ini? Praktikan akan dapat melakukan presensi.'
          : 'Apakah Anda yakin ingin menutup sesi ini? Presensi baru tidak dapat dilakukan lagi setelah sesi ditutup.'}
        confirmLabel={isOpening ? 'Ya, Buka Sesi' : 'Ya, Tutup Sesi'}
        variant={isOpening ? 'primary' : 'danger'}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          if (isOpening) onOpenSession(sessionId);
          else onCloseSession(sessionId);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButton: { backgroundColor: colors.primary },
  closeButton: { backgroundColor: colors.danger.text },
  buttonLabel: { ...type.button, color: colors.surface, textAlign: 'center' },
  finished: { ...type.button, color: colors.textSecondary },
  pressed: { opacity: 0.8 },
});

export default SessionControlAction;
