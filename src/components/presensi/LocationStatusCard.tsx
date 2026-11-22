import { StyleSheet, Text } from 'react-native';

import { ActionRow, Button, LoadingLine, MetaList, MetaRow, Notice, Panel } from '@/components/common/ui';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { DeviceLocationController } from '@/hooks/use-device-location';

export interface LocationStatusCardProps {
  location: DeviceLocationController;
  disabled?: boolean;
}

export function LocationStatusCard({ location, disabled = false }: LocationStatusCardProps) {
  const isBusy = location.status === 'acquiring';
  const needsSettings = location.status === 'permission-blocked' || location.status === 'services-disabled';

  return (
    <Panel style={styles.panel}>
      <Text style={styles.title}>Langkah 2 — Lokasi Perangkat (GPS)</Text>
      <Text style={styles.copy}>
        Lokasi foreground diambil saat ini tanpa cache lama. Anda dapat mengambil lokasi sebelum atau sesudah scan QR.
      </Text>

      {isBusy ? <LoadingLine label="Mengambil posisi GPS terkini…" /> : null}

      {location.message ? (
        <Notice tone="danger" message={location.message} alert />
      ) : null}

      {location.status === 'ready' && location.fix ? (
        <>
          <Notice tone="success" message="Lokasi perangkat terkini siap dikirim untuk verifikasi server." />
          <MetaList>
            <MetaRow label="Akurasi GPS" value={`±${Math.round(location.fix.accuracyMeters)} meter`} mono />
            <MetaRow
              label="Diambil pada"
              value={new Date(location.fix.capturedAtMs).toLocaleTimeString('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour12: false,
              }).replaceAll('.', ':') + ' WIB'}
              mono
            />
          </MetaList>
        </>
      ) : null}

      <ActionRow>
        <Button
          variant={location.status === 'ready' ? 'secondary' : 'primary'}
          label={location.status === 'ready' ? 'Ambil Ulang Lokasi' : 'Ambil Lokasi Terkini'}
          disabled={disabled || isBusy}
          onPress={() => void location.refreshLocation()}
          grow
        />
        {needsSettings ? (
          <Button label="Buka Pengaturan" onPress={location.openSettings} grow />
        ) : null}
      </ActionRow>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  title: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
  copy: { ...type.body, color: colors.textSecondary },
});
