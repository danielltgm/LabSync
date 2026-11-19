import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { SessionSheet } from '@/components/common/SessionSheet';
import { Button, Eyebrow, LoadingLine, MetaList, MetaRow, Notice, Panel, Rule } from '@/components/common/ui';
import { AttendanceStatusCard } from '@/components/presensi/AttendanceStatusCard';
import { CameraPermissionGate } from '@/components/presensi/CameraPermissionGate';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { useCameraGate } from '@/hooks/use-camera-gate';
import { usePresensiRealtime } from '@/hooks/use-presensi-realtime';
import { usePresensiSessionDetail } from '@/hooks/use-presensi-session-detail';
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
  const canAttend = Boolean(realtime.availability?.canScan);
  const cameraGate = useCameraGate(canAttend);

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
            {canAttend ? <CameraPermissionGate gate={cameraGate} disabled={!canAttend} /> : null}

            {!liveMeta.isGeotagReady ? (
              <Panel>
                <Notice
                  tone="warning"
                  message="Koordinat lab atau radius sesi belum dikonfigurasi. Hubungi asisten/PM sebelum presensi."
                />
              </Panel>
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
