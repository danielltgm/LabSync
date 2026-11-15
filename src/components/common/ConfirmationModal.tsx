import { StyleSheet, Text } from 'react-native';

import { ActionRow, Button, DialogFrame, DialogTitle } from '@/components/common/ui';
import { LabSyncColors, LabSyncTypography } from '@/constants/labsync-theme';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'primary',
  confirmDisabled = false,
  cancelDisabled = false,
}: ConfirmationModalProps) {
  return (
    <DialogFrame visible={visible} onRequestClose={onCancel} tone={variant === 'danger' ? 'danger' : 'info'}>
      <DialogTitle>{title}</DialogTitle>
      <Text style={styles.message}>{message}</Text>
      <ActionRow style={styles.actions}>
        <Button label={cancelLabel} onPress={onCancel} disabled={cancelDisabled} grow />
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          disabled={confirmDisabled}
          variant={variant === 'danger' ? 'danger' : 'primary'}
          grow
        />
      </ActionRow>
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  message: { ...LabSyncTypography.body, color: LabSyncColors.textSecondary },
  actions: { marginTop: 4 },
});

export default ConfirmationModal;
