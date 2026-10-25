import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

type FocusedField = 'nim' | 'name' | 'notes' | null;

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
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Formulir Presensi Praktikum</Text>
            <Text style={styles.subtitle}>
              {courseName
                ? `${courseName}${className ? ` • ${className}` : ''}`
                : 'Lengkapi data kehadiran Anda pada sesi praktikum ini.'}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NIM Mahasiswa *</Text>
              <TextInput
                accessibilityLabel="NIM Mahasiswa"
                readOnly={identityLocked}
                value={studentId}
                onChangeText={(val) => {
                  setStudentId(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setFocusedField('nim')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan NIM (contoh: 123210001)"
                placeholderTextColor="#94A3B8"
                keyboardType="default"
                autoCapitalize="characters"
                style={[
                  styles.input,
                  focusedField === 'nim' && styles.inputFocused,
                  nimHasError && styles.inputError,
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Lengkap Mahasiswa *</Text>
              <TextInput
                accessibilityLabel="Nama Lengkap Mahasiswa"
                readOnly={identityLocked}
                value={studentName}
                onChangeText={(val) => {
                  setStudentName(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan nama lengkap mahasiswa"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused,
                  nameHasError && styles.inputError,
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Catatan / Nomor PC (Opsional)</Text>
              <TextInput
                accessibilityLabel="Catatan atau nomor PC"
                maxLength={50}
                value={notes}
                onChangeText={setNotes}
                onFocus={() => setFocusedField('notes')}
                onBlur={() => setFocusedField(null)}
                placeholder="Contoh: PC-14 atau Meja 03"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'notes' && styles.inputFocused,
                ]}
              />
              <Text style={styles.hintText}>
                Isi nomor workstation/PC laboratorium yang Anda gunakan.
              </Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Batal Presensi"
                style={({ pressed }) => [
                  styles.button,
                  styles.buttonOutline,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonOutlineText}>Batal</Text>
              </Pressable>

              <Pressable
                disabled={isSubmitting}
                onPress={handleSubmit}
                accessibilityRole="button"
                accessibilityLabel="Kirim Presensi"
                accessibilityState={{ disabled: isSubmitting }}
                style={({ pressed }) => [
                  styles.button,
                  isSubmitting ? styles.buttonDisabled : styles.buttonPrimary,
                  !isSubmitting && pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.buttonPrimaryText,
                    isSubmitting && styles.buttonDisabledText,
                  ]}
                >
                  Kirim Presensi
                </Text>
              </Pressable>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  scrollArea: { width: '100%', flexGrow: 0, maxHeight: '100%' },
  scrollContent: { alignItems: 'center' },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '88%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#475569',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '400',
    color: '#0F172A',
  },
  inputFocused: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  hintText: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: '#B91C1C',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
  },
  buttonDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonOutlineText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#0F172A',
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#FFFFFF',
  },
  buttonDisabledText: {
    color: '#94A3B8',
  },
});

export default AttendanceFormModal;
