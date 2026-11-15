import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { ActionRow, Button, DialogFrame, DialogTitle, MetaList, MetaRow, Notice, TextField } from '@/components/common/ui';
import {
  LabSyncColors,
  LabSyncRadii,
  LabSyncSpacing,
  LabSyncTypography,
} from '@/constants/labsync-theme';

export interface LeaveRequestFormPayload {
  sessionId: string;
  reason: string;
}

export interface LeaveRequestModalProps {
  visible: boolean;
  sessionId: string;
  courseName?: string;
  className?: string;
  studentId?: string;
  studentName?: string;
  onClose: () => void;
  onSubmit: (payload: LeaveRequestFormPayload) => Promise<void> | void;
}

const REASON_LIMIT = 250;

export function LeaveRequestModal(props: LeaveRequestModalProps) {
  if (!props.visible) return null;
  return <LeaveRequestModalContent key={`${props.sessionId}:${props.studentId}`} {...props} />;
}

function LeaveRequestModalContent({
  visible,
  sessionId,
  courseName,
  className = '',
  studentId = '',
  studentName = '',
  onClose,
  onSubmit,
}: LeaveRequestModalProps) {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const cleanReason = reason.trim();
    if (!cleanReason) {
      setErrorMessage('Alasan izin wajib diisi sebelum mengirim pengajuan.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      await onSubmit({
        sessionId,
        reason: cleanReason,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim pengajuan izin.');
      setIsSubmitting(false);
    }
  };

  const reasonHasError = Boolean(errorMessage && !reason.trim());

  return (
    <DialogFrame visible={visible} onRequestClose={onClose} tone="warning" dismissKeyboard>
      <View style={styles.intro}>
        <DialogTitle>Formulir Pengajuan Izin</DialogTitle>
        <Text style={styles.subtitle}>
          {courseName
            ? `${courseName}${className ? ` • ${className}` : ''}`
            : 'Sampaikan alasan berhalangan hadir pada sesi praktikum ini.'}
        </Text>
      </View>

      {(studentName || studentId) ? (
        <View style={styles.identity}>
          <MetaList>
            <MetaRow label="Praktikan" value={`${studentName}${studentId ? ` (${studentId})` : ''}`} strong />
          </MetaList>
        </View>
      ) : null}

      <View style={styles.reasonBlock}>
        <TextField
          label="Alasan Izin *"
          accessibilityLabel="Alasan Izin"
          multiline
          numberOfLines={4}
          maxLength={REASON_LIMIT}
          value={reason}
          onChangeText={(val) => {
            setReason(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Contoh: Sakit demam dan sedang berobat ke klinik"
          textAlignVertical="top"
          invalid={reasonHasError}
          hint="Alasan akan diklasifikasikan otomatis oleh AI untuk membantu review asisten."
        />
        <Text style={styles.counter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {reason.length}/{REASON_LIMIT}
        </Text>
      </View>

      {errorMessage ? <Notice tone="danger" message={errorMessage} alert /> : null}

      <ActionRow>
        <Button label="Batal" accessibilityLabel="Batal Izin" disabled={isSubmitting} onPress={onClose} grow />
        <Button
          variant="primary"
          label={isSubmitting ? 'Mengirim...' : 'Kirim Izin'}
          accessibilityLabel="Kirim Izin"
          disabled={isSubmitting}
          onPress={() => { void handleSubmit(); }}
          grow
        />
      </ActionRow>
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  intro: { gap: LabSyncSpacing.sm },
  subtitle: { ...LabSyncTypography.bodyStrong, color: LabSyncColors.textSecondary },
  identity: {
    paddingVertical: LabSyncSpacing.md,
    paddingHorizontal: LabSyncSpacing.md + 2,
    borderRadius: LabSyncRadii.md,
    backgroundColor: LabSyncColors.surfaceSunken,
  },
  reasonBlock: { gap: LabSyncSpacing.xs },
  counter: { ...LabSyncTypography.mono, fontSize: 12, lineHeight: 16, color: LabSyncColors.textMuted, alignSelf: 'flex-end' },
});

export default LeaveRequestModal;
