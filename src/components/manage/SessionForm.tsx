import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
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
import type { SessionInput } from '@/services/sessionService';

interface SessionFormProps {
  classId: string;
  defaultClassName?: string;
  defaultAssistantName?: string;
  onSubmit: (input: SessionInput) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function SessionForm({
  classId,
  defaultClassName = '',
  defaultAssistantName = '',
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const [courseName, setCourseName] = useState('');
  const [className, setClassName] = useState(defaultClassName);
  const [labRoom, setLabRoom] = useState('Lab Komputer');
  const [date, setDate] = useState('2026-11-20');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [assistantName, setAssistantName] = useState(defaultAssistantName);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setBusy(true);
    try {
      const result = await onSubmit({
        classId,
        courseName,
        className,
        labRoom,
        date,
        startTime,
        endTime,
        assistantName,
      });

      if (!result.success) {
        setError(result.error ?? 'Gagal membuat sesi praktikum.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.formCard}>
        <Text style={styles.heading}>Buat Jadwal Sesi Praktikum</Text>
        <Text style={styles.subtext}>
          Isi detail sesi praktikum baru. Status awal sesi akan otomatis menjadi TERJADWAL.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nama Mata Praktikum</Text>
          <TextInput
            placeholder="Contoh: Pemrograman Mobile"
            style={styles.input}
            value={courseName}
            onChangeText={setCourseName}
            editable={!busy}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nama Kelas</Text>
          <TextInput
            placeholder="Contoh: IF-3A"
            style={styles.input}
            value={className}
            onChangeText={setClassName}
            editable={!busy}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Ruang Laboratorium</Text>
          <TextInput
            placeholder="Contoh: Lab RPL / Lab Jaringan"
            style={styles.input}
            value={labRoom}
            onChangeText={setLabRoom}
            editable={!busy}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            style={styles.input}
            value={date}
            onChangeText={setDate}
            editable={!busy}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.half]}>
            <Text style={styles.label}>Jam Mulai (HH:mm)</Text>
            <TextInput
              placeholder="08:00"
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              editable={!busy}
            />
          </View>

          <View style={[styles.fieldGroup, styles.half]}>
            <Text style={styles.label}>Jam Selesai (HH:mm)</Text>
            <TextInput
              placeholder="10:00"
              style={styles.input}
              value={endTime}
              onChangeText={setEndTime}
              editable={!busy}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nama Asisten Pengampu</Text>
          <TextInput
            placeholder="Nama Lengkap Asisten"
            style={styles.input}
            value={assistantName}
            onChangeText={setAssistantName}
            editable={!busy}
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {busy && <ActivityIndicator color={colors.primary} style={styles.loader} />}

        <View style={styles.actions}>
          <Button title="Batal" onPress={onCancel} disabled={busy} color={colors.textSecondary} />
          <Button
            title={busy ? 'Menyimpan…' : 'Simpan Jadwal Sesi'}
            onPress={() => { void handleSubmit(); }}
            disabled={busy || !courseName.trim() || !className.trim() || !labRoom.trim()}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space.lg,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.xl,
    gap: space.md,
    borderColor: colors.borderDark,
    borderWidth: 1,
  },
  heading: {
    ...type.heading,
    color: colors.text,
  },
  subtext: {
    ...type.body,
    color: colors.textSecondary,
    marginBottom: space.sm,
  },
  fieldGroup: {
    gap: space.xs,
  },
  label: {
    ...type.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    ...type.body,
    color: colors.text,
    borderColor: colors.borderDark,
    borderWidth: 1,
    borderRadius: radii.sm,
    minHeight: 44,
    padding: space.md,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  half: {
    flex: 1,
  },
  loader: {
    marginVertical: space.xs,
  },
  errorText: {
    ...type.caption,
    color: colors.danger.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.md,
    marginTop: space.md,
  },
});
