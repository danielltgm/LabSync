import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ActionRow, Button, Notice, Panel } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { CameraGateController } from '@/hooks/use-camera-gate';

export interface CameraPermissionGateProps {
  gate: CameraGateController;
  disabled?: boolean;
  children?: ReactNode;
}

export function CameraPermissionGate({ gate, disabled = false, children }: CameraPermissionGateProps) {
  if (gate.state === 'web-unsupported') {
    return (
      <Panel style={styles.panel}>
        <Text style={styles.title}>Pemindaian QR</Text>
        <Notice
          tone="warning"
          message="Pemindaian QR presensi memerlukan perangkat Android/iOS yang mendukung kamera. Buka LabSync di perangkat seluler."
        />
      </Panel>
    );
  }

  if (gate.state === 'active') {
    return (
      <Panel style={styles.panel}>
        <Text style={styles.title}>Arahkan Kamera ke QR Sesi</Text>
        {children}
        <Button label="Tutup Kamera" onPress={gate.stopScan} />
      </Panel>
    );
  }

  return (
    <Panel style={styles.panel}>
      <Text style={styles.title}>Langkah 1 — Pindai QR Sesi</Text>
      <Text style={styles.copy}>
        Kamera hanya digunakan untuk memindai QR presensi asisten (tanpa akses mikrofon) dan dilepas otomatis saat layar ditutup.
      </Text>

      {gate.state === 'denied-retryable' ? (
        <Notice tone="danger" message="Izin kamera ditolak. Izinkan akses kamera untuk memindai QR presensi." alert />
      ) : null}

      {gate.state === 'denied-settings' ? (
        <Notice
          tone="danger"
          message="Izin kamera diblokir permanen oleh perangkat. Aktifkan izin kamera LabSync melalui Pengaturan."
          alert
        />
      ) : null}

      <ActionRow>
        {gate.state === 'denied-settings' ? (
          <Button variant="primary" label="Buka Pengaturan" onPress={gate.openSettings} grow />
        ) : (
          <Button
            variant="primary"
            label={gate.state === 'denied-retryable' ? 'Izinkan & Mulai Scan' : 'Mulai Scan QR'}
            disabled={disabled}
            onPress={() => void gate.startScan()}
            grow
          />
        )}
      </ActionRow>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  title: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
  copy: { ...type.body, color: colors.textSecondary },
});
