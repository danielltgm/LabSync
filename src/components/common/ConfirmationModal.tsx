import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LabSyncColors,
  LabSyncRadii,
  LabSyncSpacing,
  LabSyncTypography,
} from '@/constants/labsync-theme';

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
}: ConfirmationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView style={styles.backdrop}>
        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.content}
          accessibilityViewIsModal
          onAccessibilityEscape={onCancel}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.icon, variant === 'danger' ? styles.iconDanger : styles.iconPrimary]}
          >
            <Text style={[styles.iconText, variant === 'danger' ? styles.dangerText : styles.primaryText]}>
              !
            </Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: confirmDisabled }}
              disabled={confirmDisabled}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                variant === 'danger' ? styles.dangerButton : styles.primaryButton,
                confirmDisabled && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: LabSyncColors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LabSyncSpacing.lg,
  },
  card: {
    flexGrow: 0,
    width: '88%',
    maxWidth: 480,
    backgroundColor: LabSyncColors.surface,
    borderRadius: LabSyncRadii.xl,
    shadowColor: LabSyncColors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    padding: LabSyncSpacing.xl,
    gap: LabSyncSpacing.lg,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: LabSyncRadii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPrimary: { backgroundColor: LabSyncColors.primarySurface },
  iconDanger: { backgroundColor: LabSyncColors.danger.background },
  iconText: { ...LabSyncTypography.heading },
  primaryText: { color: LabSyncColors.primary },
  dangerText: { color: LabSyncColors.danger.text },
  title: { ...LabSyncTypography.heading, color: LabSyncColors.text },
  message: { ...LabSyncTypography.body, color: LabSyncColors.textSecondary },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LabSyncSpacing.md,
    marginTop: LabSyncSpacing.xs,
  },
  button: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 48,
    paddingHorizontal: LabSyncSpacing.md,
    paddingVertical: LabSyncSpacing.md,
    borderRadius: LabSyncRadii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: LabSyncColors.borderDark,
    backgroundColor: LabSyncColors.surface,
  },
  primaryButton: { backgroundColor: LabSyncColors.primary },
  dangerButton: { backgroundColor: LabSyncColors.danger.text },
  cancelLabel: { ...LabSyncTypography.button, color: LabSyncColors.text, textAlign: 'center' },
  confirmLabel: { ...LabSyncTypography.button, color: LabSyncColors.surface, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});

export default ConfirmationModal;
