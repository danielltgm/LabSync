import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { SessionSheet } from '@/components/common/SessionSheet';
import { Button, Eyebrow, LoadingLine, MetaList, MetaRow, Notice, Rule } from '@/components/common/ui';
import { AttendanceStatusCard } from '@/components/presensi/AttendanceStatusCard';
import { CheckInSubmitPanel } from '@/components/presensi/CheckInSubmitPanel';
import { LocationHintBanner } from '@/components/presensi/LocationHintBanner';
import { LocationStatusCard } from '@/components/presensi/LocationStatusCard';
import { QrScannerPanel } from '@/components/presensi/QrScannerPanel';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { firebase } from '@/firebase/client';
import { useCameraGate } from '@/hooks/use-camera-gate';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { useLocationHint } from '@/hooks/use-location-hint';
import { usePresensiRealtime } from '@/hooks/use-presensi-realtime';
import { usePresensiSessionDetail } from '@/hooks/use-presensi-session-detail';
import { useQrScanner } from '@/hooks/use-qr-scanner';
import { submitAttendanceCheckIn } from '@/services/attendance/check-in-client';
import { buildCheckInRequest, resolveCheckInUrl } from '@/services/attendance/check-in-request';
import { validateDeviceLocationFix } from '@/services/attendance/location-validator';
import { buildPresensiSessionMeta } from '@/services/attendance/session-view';

export default function PresensiSessionScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const sessionId = typeof params.id === 'string' ? params.id : undefined;
  const { activeUser } = useLabSync();
  const detail = usePresensiSessionDetail(sessionId);
  const realtime = usePresensiRealtime(
    detail.status === 'ready' ? sessionId : undefined,
    activeUser.role === 'PRAKTISAN' ? activeUser.id : undefined,
  );
  const liveSession = realtime.session ?? detail.session;
  const liveMeta = liveSession ? buildPresensiSessionMeta(liveSession, detail.lab) : detail.meta;
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canAttend = Boolean(realtime.availability?.canScan);
  const cameraGate = useCameraGate(canAttend && !submitting);
  const qrScanner = useQrScanner(sessionId ?? '', submitting);
  const deviceLocation = useDeviceLocation();
  const locationHint = useLocationHint(deviceLocation.fix, liveMeta, detail.lab);

  const handleSubmit = async () => {
    if (!sessionId || !qrScanner.payload || !deviceLocation.fix || submitting) return;
    const freshness = validateDeviceLocationFix(deviceLocation.fix);
    if (!freshness.ok) {
      await deviceLocation.refreshLocation();
      return;
    }
    setSubmitting(true);
    try {
      const request = buildCheckInRequest({
        sessionId,
        qr: qrScanner.payload,
        location: deviceLocation.fix,
        notes,
      });
      await submitAttendanceCheckIn(request, {
        endpointUrl: resolveCheckInUrl(process.env.EXPO_PUBLIC_LABSYNC_API_ORIGIN),
        getIdToken: async () => (await firebase?.auth.currentUser?.getIdToken()) ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button variant="quiet" compact label="Kembali" onPress={goBack} style={styles.back} />
          <View style={styles.titleBlock}>
            <Eyebrow color={colors.primary}>Presensi QR & Geotag</Eyebrow>
            <Text accessibilityRole="header" style={styles.title}>Presensi Sesi Praktikum</Text>
          </View>
          <Rule />
        </View>

        {activeUser.role !== 'PRAKTISAN' ? (
          <EmptyState
            title="Halaman khusus praktikan"
            description="Akun asisten tidak melakukan presensi dari halaman ini."
          />
        ) : detail.status === 'loading' ? (
          <LoadingLine label="Memuat informasi sesi…" />
        ) : detail.status === 'not-found' || detail.status === 'forbidden' ? (
          <EmptyState
            title={detail.status === 'forbidden' ? 'Akses ditolak' : 'Sesi tidak ditemukan'}
            description={detail.errorMessage ?? 'Periksa kembali daftar jadwal praktikum Anda.'}
          />
        ) : detail.status === 'error' || !liveSession || !liveMeta ? (
          <Notice tone="danger" message={detail.errorMessage ?? 'Gagal memuat sesi.'} alert>
            <Button compact label="Muat ulang" onPress={detail.retry} />
          </Notice>
        ) : (
          <View style={styles.stack}>
            <SessionSheet session={liveSession}>
              <MetaList>
                <MetaRow label="Lokasi Lab" value={liveMeta.labName} />
                <MetaRow
                  label="Radius Presensi"
                  value={liveMeta.radiusMeters ? `${liveMeta.radiusMeters} meter` : 'Belum dikonfigurasi'}
                  mono
                />
                <MetaRow label="Akun Praktikan" value={`${activeUser.name} (${activeUser.identifier})`} />
              </MetaList>
            </SessionSheet>

            {realtime.error ? <Notice tone="warning" message={realtime.error} /> : null}
            {realtime.availability ? <AttendanceStatusCard availability={realtime.availability} /> : null}
            {canAttend ? (
              <>
                <QrScannerPanel cameraGate={cameraGate} scanner={qrScanner} disabled={!canAttend || submitting} />
                <LocationStatusCard location={deviceLocation} disabled={!canAttend || submitting} />
                {locationHint ? <LocationHintBanner hint={locationHint} /> : null}
                <CheckInSubmitPanel
                  notes={notes}
                  onChangeNotes={setNotes}
                  hasValidQr={qrScanner.payload !== null}
                  hasValidLocation={deviceLocation.status === 'ready' && deviceLocation.fix !== null}
                  submitting={submitting}
                  disabled={!canAttend}
                  onSubmit={() => void handleSubmit()}
                />
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: space.lg,
    paddingBottom: space.huge,
    width: '100%',
    maxWidth: layout.readable,
    alignSelf: 'center',
    gap: space.lg,
  },
  header: { gap: space.md },
  back: { alignSelf: 'flex-start', marginLeft: -space.md },
  titleBlock: { gap: space.xs },
  title: { ...type.heading, fontSize: 24, lineHeight: 30, color: colors.text },
  stack: { gap: space.lg },
});
