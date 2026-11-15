import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { Button } from '@/components/common/ui';
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
    return (
      <View style={styles.finished}>
        <Text style={styles.finishedText}>Sesi telah selesai</Text>
      </View>
    );
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
      <Button
        label={label}
        variant={isOpening ? 'primary' : 'danger'}
        onPress={() => setVisible(true)}
        grow
      />
      <ConfirmationModal
        visible={visible}
        title={isOpening ? 'Buka sesi praktikum?' : 'Tutup sesi praktikum?'}
        message={isOpening
          ? 'Praktikan akan melihat sesi ini sebagai dibuka.'
          : 'Praktikan akan melihat sesi ini sebagai selesai.'}
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
  finished: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 48,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishedText: { ...type.button, color: colors.neutral.text, textAlign: 'center' },
});

export default SessionControlAction;
