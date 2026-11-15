import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useEnrollments } from '@/hooks/useEnrollments';

interface EnrollmentListProps {
  classId: string;
}

export function EnrollmentList({ classId }: EnrollmentListProps) {
  const [studentUid, setStudentUid] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean }>();
  const { enroll, busy } = useEnrollments(classId);

  async function handleEnroll() {
    if (!studentUid.trim()) {
      setStatusMessage({ text: 'Masukkan UID praktikan.', isError: true });
      return;
    }
    setStatusMessage(undefined);
    const result = await enroll(studentUid.trim());
    if (result.success) {
      setStatusMessage({ text: 'Praktikan berhasil didaftarkan ke kelas.', isError: false });
      setStudentUid('');
    } else {
      setStatusMessage({ text: result.error ?? 'Gagal mendaftarkan praktikan.', isError: true });
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pendaftaran Praktikan (Enrollment)</Text>
      <Text style={styles.description}>
        Daftarkan praktikan ke kelas ini menggunakan UID akun praktikan.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          placeholder="UID Akun Praktikan"
          style={styles.input}
          value={studentUid}
          onChangeText={(text) => {
            setStudentUid(text);
            if (statusMessage) setStatusMessage(undefined);
          }}
          editable={!busy}
          autoCapitalize="none"
        />
        <Button
          title={busy ? 'Mendaftarkan…' : 'Daftarkan'}
          onPress={() => { void handleEnroll(); }}
          disabled={busy || !studentUid.trim()}
        />
      </View>

      {busy && <ActivityIndicator color={colors.primary} style={styles.loader} />}

      {statusMessage && (
        <Text style={[styles.statusText, statusMessage.isError ? styles.errorText : styles.successText]}>
          {statusMessage.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.lg,
    gap: space.sm,
    borderColor: colors.borderDark,
    borderWidth: 1,
  },
  title: {
    ...type.heading,
    color: colors.text,
  },
  description: {
    ...type.body,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xs,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.text,
    borderColor: colors.borderDark,
    borderWidth: 1,
    borderRadius: radii.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    backgroundColor: colors.background,
  },
  loader: {
    marginTop: space.xs,
  },
  statusText: {
    ...type.caption,
  },
  errorText: {
    color: colors.danger.text,
  },
  successText: {
    color: colors.success.text,
  },
});
