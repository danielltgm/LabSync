import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Notice, Panel } from '@/components/common/ui';
import { CameraPermissionGate } from '@/components/presensi/CameraPermissionGate';
import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { CameraGateController } from '@/hooks/use-camera-gate';
import type { QrScannerController } from '@/hooks/use-qr-scanner';

export interface QrScannerPanelProps {
  cameraGate: CameraGateController;
  scanner: QrScannerController;
  disabled?: boolean;
}

export function QrScannerPanel({ cameraGate, scanner, disabled = false }: QrScannerPanelProps) {
  const handleBarcode = (result: BarcodeScanningResult) => {
    const valid = scanner.handleScanData(result.data ?? '');
    if (valid) {
      cameraGate.stopScan();
    }
  };

  if (scanner.payload) {
    return (
      <Panel accent={colors.success.solid} style={styles.panel}>
        <Text style={styles.title}>QR Sesi Terbaca</Text>
        <Notice
          tone="success"
          message={`Challenge ${scanner.payload.challengeId} valid untuk sesi ini. Lanjutkan pemeriksaan lokasi untuk mengirim presensi.`}
        />
        <Button
          label="Scan QR Ulang"
          disabled={disabled}
          onPress={() => {
            scanner.resetQr();
            void cameraGate.startScan();
          }}
        />
      </Panel>
    );
  }

  return (
    <View style={styles.stack}>
      {scanner.errorMessage ? (
        <Notice tone="danger" message={scanner.errorMessage} alert>
          <Button
            compact
            label="Scan Ulang"
            disabled={disabled}
            onPress={() => {
              scanner.resetQr();
              void cameraGate.startScan();
            }}
          />
        </Notice>
      ) : null}

      <CameraPermissionGate gate={cameraGate} disabled={disabled}>
        <View style={styles.viewport}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanner.locked ? undefined : handleBarcode}
          />
        </View>
      </CameraPermissionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  panel: { gap: space.md },
  title: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text },
  viewport: {
    height: 260,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  camera: { flex: 1 },
});
