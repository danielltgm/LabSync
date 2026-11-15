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
  const [isFocused, setIsFocused] = useState(false);
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
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Formulir Pengajuan Izin
                </Text>
                <Text style={styles.subtitle}>
                  {courseName
                    ? `${courseName}${className ? ` • ${className}` : ''}`
                    : 'Sampaikan alasan berhalangan hadir pada sesi praktikum ini.'}
                </Text>

                {(studentName || studentId) ? (
                  <View style={styles.identityBanner}>
                    <Text style={styles.identityLabel}>Identitas Praktikan</Text>
                    <Text style={styles.identityValue}>
                      {studentName}{studentId ? ` (${studentId})` : ''}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Alasan Izin *</Text>
                  <TextInput
                    accessibilityLabel="Alasan Izin"
                    multiline
                    numberOfLines={4}
                    maxLength={250}
                    value={reason}
                    onChangeText={(val) => {
                      setReason(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Contoh: Sakit demam dan sedang berobat ke klinik"
                    placeholderTextColor="#94A3B8"
                    textAlignVertical="top"
                    style={[
                      styles.textArea,
                      isFocused && styles.inputFocused,
                      reasonHasError && styles.inputError,
                    ]}
                  />
                  <Text style={styles.hintText}>
                    Alasan akan diklasifikasikan otomatis oleh AI untuk membantu review asisten.
                  </Text>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <Pressable
                    disabled={isSubmitting}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Batal Izin"
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
                    accessibilityLabel="Kirim Izin"
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
                      {isSubmitting ? 'Mengirim...' : 'Kirim Izin'}
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
  identityBanner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  identityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
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
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
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

export default LeaveRequestModal;
