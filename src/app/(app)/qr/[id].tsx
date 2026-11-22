import { useLocalSearchParams } from 'expo-router';
import { QrCode } from 'lucide-react-native';

import { EmptyState } from '@/components/app/primitives';
import { QrPanel } from '@/components/app/qr-panel';
import { PageHeader, Screen } from '@/components/app/screen';
import { viewSession } from '@/data/selectors';
import { useStore } from '@/data/store';

export default function FullscreenQr() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const raw = state.sessions.find((s) => s.id === id);
  if (!raw || raw.status !== 'DIBUKA') {
    return (
      <Screen header={<PageHeader title="QR presensi" />}>
        <EmptyState icon={QrCode} title="Sesi belum dibuka" body="QR hanya tampil selama sesi dibuka." />
      </Screen>
    );
  }
  const session = viewSession(state, raw);
  return (
    <Screen header={<PageHeader title="QR presensi" subtitle="Tampilkan di proyektor atau layar lab" />}>
      <QrPanel session={session} big />
    </Screen>
  );
}
