import { router, useLocalSearchParams } from 'expo-router';
import { Building, Info, Navigation, Pencil, Radar, Target, Users } from 'lucide-react-native';
import { View } from 'react-native';

import { LabCover, LabPhotoStrip } from '@/components/app/lab-photos';
import { EmptyState, StatTile, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { TimelineRow } from '@/components/app/session-blocks';
import { Pill } from '@/components/app/status';
import { LabMap } from '@/components/map/lab-map';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { labActivity, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { useColors } from '@/hooks/use-theme';
import { DAY, startOfDay } from '@/lib/format';

export default function LabDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const me = useMe();
  const now = useNow(15_000);
  const { scheme } = useColors();
  const lab = state.labs.find((l) => l.id === id);

  if (!lab) {
    return (
      <Screen header={<PageHeader title="Lab" />}>
        <EmptyState icon={Building} title="Lab tidak ditemukan" />
      </Screen>
    );
  }
  const act = labActivity(state, lab.id, now);
  const week = state.sessions
    .filter((s) => s.labId === lab.id && s.startsAt >= startOfDay(now) && s.startsAt < startOfDay(now) + 7 * DAY && s.status !== 'DIBATALKAN')
    .sort((a, b) => a.startsAt - b.startsAt)
    .map((s) => viewSession(state, s));
  const canEdit = me.role !== 'PRAKTIKAN';
  const photos = lab.photos ?? [];
  const sharing = state.labs.filter((l) => l.id !== lab.id && l.lat === lab.lat && l.lng === lab.lng);

  return (
    <Screen
      header={
        <PageHeader
          title={lab.name}
          subtitle={`${lab.code} · ${lab.building}, ${lab.floor}`}
          right={
            canEdit ? (
              <Button size="sm" variant="outline" className="rounded-full" onPress={() => router.push(`/lab/${lab.id}/edit`)}>
                <Icon as={Pencil} className="size-4" />
                <Text>Atur</Text>
              </Button>
            ) : undefined
          }
        />
      }
    >
      {photos.length ? (
        <View className="gap-2">
          <LabCover photos={photos} name={lab.name} />
          {photos.length > 1 && <LabPhotoStrip photos={photos.slice(1)} />}
        </View>
      ) : (
        <Surface className="items-center gap-1 p-5">
          <Text className="text-sm font-semibold">Belum ada foto ruangan</Text>
          <Text className="text-muted-foreground text-center text-xs">
            {canEdit ? 'Tambahkan lewat tombol Atur supaya praktikan mudah mengenali ruangannya.' : 'Koordinator lab akan menambahkan foto.'}
          </Text>
        </Surface>
      )}

      {!!lab.directions && (
        <View className="bg-info-soft flex-row gap-2.5 rounded-2xl p-3.5">
          <Icon as={Navigation} className="text-info-ink mt-0.5 size-4" />
          <Text className="text-info-ink min-w-0 flex-1 text-sm leading-5">{lab.directions}</Text>
        </View>
      )}

      <View className="border-border h-56 overflow-hidden rounded-3xl border">
        <LabMap labs={[lab]} selectedId={lab.id} busyLabIds={act.current ? [lab.id] : []} focus={{ lat: lab.lat, lng: lab.lng, zoom: 18 }} focusKey={lab.id} dark={scheme === 'dark'} />
      </View>

      <View className="flex-row gap-3">
        <StatTile label="Radius" value={`${lab.radiusM} m`} icon={Radar} tone="brand" />
        <StatTile label="Akurasi" value={`${lab.maxAccuracyM} m`} icon={Target} tone="info" />
        <StatTile label="Kapasitas" value={lab.capacity} icon={Users} tone="neutral" />
      </View>

      <Surface className="gap-2 p-4">
        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Fasilitas</Text>
        <View className="flex-row flex-wrap gap-2">
          {lab.facilities.map((f) => <Pill key={f} label={f} />)}
        </View>
        <Text className="text-muted-foreground pt-1 text-xs">Titik: {lab.lat.toFixed(6)}, {lab.lng.toFixed(6)}</Text>
      </Surface>

      {sharing.length > 0 && (
        <View className="bg-muted flex-row gap-2.5 rounded-2xl p-3.5">
          <Icon as={Info} className="text-muted-foreground mt-0.5 size-4" />
          <Text className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
            Titik lokasi sama dengan {sharing.map((l) => l.name).join(', ')} (patokan Gedung E). Presensi lokasi memastikan kamu di gedung; QR di
            ruangan memastikan ruangannya.
          </Text>
        </View>
      )}

      <Section title="Sekarang">
        {act.current ? <TimelineRow session={act.current} now={now} last /> : <Text className="text-muted-foreground text-sm">Tidak ada praktikum yang sedang berlangsung.</Text>}
      </Section>
      <Section title="7 hari ke depan">
        {week.length ? (
          <View>{week.map((s, i) => <TimelineRow key={s.id} session={s} now={now} last={i === week.length - 1} showDate />)}</View>
        ) : (
          <Text className="text-muted-foreground text-sm">Belum ada jadwal.</Text>
        )}
      </Section>
    </Screen>
  );
}
