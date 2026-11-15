import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ActionRow, Button, Notice, PageHeader, Panel, TextField } from '@/components/common/ui';
import { jakartaNow, ScheduleFields } from '@/components/manage/ScheduleFields';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
} from '@/constants/labsync-theme';
import type { SessionInput } from '@/services/sessionService';

interface SessionFormProps {
  classId: string;
  defaultClassName?: string;
  defaultAssistantName?: string;
  initialSession?: SessionInput;
  onSubmit: (input: SessionInput) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function SessionForm({
  classId,
  defaultClassName = '',
  defaultAssistantName = '',
  initialSession,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const [courseName, setCourseName] = useState(initialSession?.courseName ?? '');
  const [className, setClassName] = useState(initialSession?.className ?? defaultClassName);
  const [labRoom, setLabRoom] = useState(initialSession?.labRoom ?? '');
  const [date, setDate] = useState(() => initialSession?.date ?? jakartaNow().date);
  const [startTime, setStartTime] = useState(initialSession?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(initialSession?.endTime ?? '09:00');
  const [assistantName, setAssistantName] = useState(initialSession?.assistantName ?? defaultAssistantName);

  const [showDetails, setShowDetails] = useState(!className || !assistantName);
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
        setError(result.error ?? 'Gagal menyimpan sesi praktikum.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <PageHeader
        title={initialSession ? 'Edit jadwal sesi' : 'Buat jadwal sesi'}
        subtitle={[className, assistantName].filter(Boolean).join(' · ') || undefined}
      />

      <Panel style={styles.formCard}>
        <TextField
          label="Nama Mata Praktikum"
          accessibilityLabel="Nama Praktikum"
          placeholder="Contoh: Pemrograman Mobile"
          value={courseName}
          onChangeText={setCourseName}
          editable={!busy}
        />

        <TextField label="Ruang Laboratorium" placeholder="Contoh: Lab RPL / Lab Jaringan"
          value={labRoom} onChangeText={setLabRoom} editable={!busy} />

        <ScheduleFields date={date} startTime={startTime} endTime={endTime} disabled={busy}
          onDateChange={setDate} onStartChange={setStartTime} onEndChange={setEndTime} />

        <View style={styles.details}>
          <Button compact variant="quiet" label={showDetails ? 'Tutup detail' : 'Ubah kelas atau asisten'}
            onPress={() => setShowDetails(!showDetails)} disabled={busy} style={styles.detailsToggle} />
          {showDetails && (
            <View style={styles.grid}>
              <TextField label="Nama Kelas" value={className} onChangeText={setClassName} editable={!busy} style={styles.half} />
              <TextField label="Nama Asisten Pengampu" value={assistantName} onChangeText={setAssistantName}
                editable={!busy} style={styles.half} />
            </View>
          )}
        </View>

        {!!error && <Notice tone="danger" message={error} alert />}
        {busy && <ActivityIndicator color={colors.primary} style={styles.loader} />}

        <ActionRow style={styles.actions}>
          <Button variant="quiet" label="Batal" onPress={onCancel} disabled={busy} />
          <Button
            variant="primary"
            label={busy ? 'Menyimpan…' : 'Simpan Jadwal Sesi'}
            onPress={() => { void handleSubmit(); }}
            disabled={busy || !courseName.trim() || !className.trim() || !labRoom.trim() || !assistantName.trim()}
            style={styles.saveButton}
          />
        </ActionRow>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space.lg,
    paddingBottom: space.huge,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    gap: space.xl,
  },
  formCard: { gap: space.md },
  details: { gap: space.sm },
  detailsToggle: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  half: { flexGrow: 1, flexShrink: 1, flexBasis: 220 },
  loader: { alignSelf: 'flex-start' },
  actions: { justifyContent: 'flex-end', borderTopWidth: 1, borderColor: colors.rule, paddingTop: space.md },
  saveButton: { flexGrow: 1, flexBasis: 160, maxWidth: 240 },
});
