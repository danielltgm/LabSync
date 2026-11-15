import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { ActionRow, Button, DialogFrame, DialogTitle, Notice, TextField } from '@/components/common/ui';
import { LabSyncColors, LabSyncSpacing, LabSyncTypography } from '@/constants/labsync-theme';
import type { AttendancePayload } from '@/types/attendance';

export type AttendanceFormPayload = AttendancePayload;

export interface AttendanceFormModalProps {
  visible: boolean;
  sessionId: string;
  courseName?: string;
  className?: string;
  initialStudentId?: string;
  initialStudentName?: string;
  identityLocked?: boolean;
  onClose: () => void;
  onSubmit: (payload: AttendanceFormPayload) => void;
}

export function AttendanceFormModal(props: AttendanceFormModalProps) {
  if (!props.visible) return null;
  return <AttendanceFormContent key={`${props.sessionId}:${props.initialStudentId}:${props.initialStudentName}`} {...props} />;
}

function AttendanceFormContent({
  visible,
  sessionId,
  courseName,
  className = '',
  initialStudentId = '',
  initialStudentName = '',
  identityLocked = false,
  onClose,
  onSubmit,
}: AttendanceFormModalProps) {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [studentName, setStudentName] = useState(initialStudentName);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (isSubmitting) return;

    const cleanNim = studentId.trim();
    const cleanName = studentName.trim();
    const cleanNotes = notes.trim();

    if (!cleanNim || !cleanName) {
      setErrorMessage('NIM dan Nama Mahasiswa wajib diisi sebelum mengirim presensi.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    Keyboard.dismiss();

    onSubmit({
      sessionId,
      studentId: cleanNim,
      studentName: cleanName,
      className,
      notes: cleanNotes ? cleanNotes : undefined,
    });
  };

  const nimHasError = Boolean(errorMessage && !studentId.trim());
  const nameHasError = Boolean(errorMessage && !studentName.trim());

  return (
    <DialogFrame visible={visible} onRequestClose={onClose} dismissKeyboard>
      <View style={styles.intro}>
        <DialogTitle>Formulir Presensi Praktikum</DialogTitle>
        <Text style={styles.subtitle}>
          {courseName
            ? `${courseName}${className ? ` • ${className}` : ''}`
            : 'Lengkapi data kehadiran Anda pada sesi praktikum ini.'}
        </Text>
      </View>

      <View style={styles.identity}>
        <TextField
          label="NIM Mahasiswa *"
          accessibilityLabel="NIM Mahasiswa"
          readOnly={identityLocked}
          value={studentId}
          onChangeText={(val) => {
            setStudentId(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Masukkan NIM (contoh: 123210001)"
          keyboardType="default"
          autoCapitalize="characters"
          mono
          invalid={nimHasError}
          style={styles.identityField}
        />
        <TextField
          label="Nama Lengkap Mahasiswa *"
          accessibilityLabel="Nama Lengkap Mahasiswa"
          readOnly={identityLocked}
          value={studentName}
          onChangeText={(val) => {
            setStudentName(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Masukkan nama lengkap mahasiswa"
          invalid={nameHasError}
          style={styles.identityField}
        />
      </View>

      <TextField
        label="Catatan / Nomor PC (Opsional)"
        accessibilityLabel="Catatan atau nomor PC"
        maxLength={50}
        value={notes}
        onChangeText={setNotes}
        placeholder="Contoh: PC-14 atau Meja 03"
        hint="Isi nomor workstation/PC laboratorium yang Anda gunakan."
        mono
      />

      {errorMessage ? <Notice tone="danger" message={errorMessage} alert /> : null}

      <ActionRow>
        <Button label="Batal" accessibilityLabel="Batal Presensi" onPress={onClose} grow />
        <Button
          variant="primary"
          label={isSubmitting ? 'Mengirim…' : 'Kirim Presensi'}
          accessibilityLabel="Kirim Presensi"
          disabled={isSubmitting}
          onPress={handleSubmit}
          grow
        />
      </ActionRow>
    </DialogFrame>
  );
}

const styles = StyleSheet.create({
  intro: { gap: LabSyncSpacing.sm },
  subtitle: { ...LabSyncTypography.bodyStrong, color: LabSyncColors.textSecondary },
  identity: { flexDirection: 'row', flexWrap: 'wrap', gap: LabSyncSpacing.md },
  identityField: { flexGrow: 1, flexBasis: 180 },
});

export default AttendanceFormModal;
