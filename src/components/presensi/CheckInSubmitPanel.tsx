import { StyleSheet, Text } from 'react-native';

import { Button, Notice, Panel, TextField } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';

export interface CheckInSubmitPanelProps {
  notes: string;
  onChangeNotes: (value: string) => void;
  hasValidQr: boolean;
  hasValidLocation: boolean;
  submitting: boolean;
  disabled?: boolean;
  onSubmit: () => void;
}

export function CheckInSubmitPanel({
  notes,
  onChangeNotes,
  hasValidQr,
  hasValidLocation,
  submitting,
  disabled = false,
  onSubmit,
}: CheckInSubmitPanelProps) {
  const ready = hasValidQr && hasValidLocation && !disabled && !submitting;

  return (
    <Panel style={styles.panel}>
      <Text style={styles.title}>Langkah 3 — Kirim Presensi</Text>
      <TextField
        label="Catatan / Nomor PC (Opsional)"
        accessibilityLabel="Catatan atau nomor PC"
        maxLength={50}
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="Contoh: PC-14 atau Meja 03"
        mono
        editable={!submitting && !disabled}
      />

      {!hasValidQr || !hasValidLocation ? (
        <Notice
          tone="info"
          message={
            !hasValidQr
              ? 'Pindai QR sesi terlebih dahulu sebelum mengirim presensi.'
              : 'Ambil lokasi GPS terkini terlebih dahulu sebelum mengirim presensi.'
          }
        />
      ) : null}

      <Button
        variant="primary"
        label={submitting ? 'Mengirim Presensi…' : 'Kirim Presensi ke Server'}
        disabled={!ready}
        onPress={onSubmit}
      />
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  title: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
});
