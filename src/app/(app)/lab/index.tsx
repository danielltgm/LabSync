import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Building, ChevronRight, Plus, Radar } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { IconTile } from '@/components/app/primitives';
import { PageHeader, Screen } from '@/components/app/screen';
import { Pill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { labActivity } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { formatDateTime } from '@/lib/format';

export default function LabList() {
  const { state } = useStore();
  const me = useMe();
  const now = useNow(30_000);
  const canEdit = me.role === 'ASLAB';

  return (
    <Screen
      header={
        <PageHeader
          title="Ruangan lab"
          subtitle={canEdit ? 'Foto, titik, dan radius presensi' : 'Foto dan petunjuk arah ruangan'}
          right={
            canEdit ? (
              <Button size="sm" className="rounded-full" onPress={() => router.push('/lab/baru/edit')}>
                <Icon as={Plus} className="text-primary-foreground size-4" />
                <Text>Lab</Text>
              </Button>
            ) : undefined
          }
        />
      }
    >
      {state.labs.map((lab) => {
        const act = labActivity(state, lab.id, now);
        return (
          <Pressable key={lab.id} accessibilityRole="button" onPress={() => router.push(`/lab/${lab.id}`)} className="bg-card border-border active:bg-accent gap-3 rounded-3xl border p-4">
            <View className="flex-row items-center gap-3">
              {lab.photos?.length ? (
                <Image source={{ uri: lab.photos[0] }} style={{ width: 56, height: 56, borderRadius: 16 }} contentFit="cover" />
              ) : (
                <IconTile icon={Building} tone={act.current ? 'success' : 'brand'} />
              )}
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-semibold" numberOfLines={1}>{lab.name}</Text>
                <Text className="text-muted-foreground text-xs">{lab.code} · {lab.building}, {lab.floor}</Text>
              </View>
              <Icon as={ChevronRight} className="text-muted-foreground size-5" />
            </View>
            <View className="flex-row flex-wrap items-center gap-2">
              <Pill tone={act.current ? 'success' : 'neutral'} label={act.current ? `Dipakai · ${act.current.course.name.split(' ').slice(0, 2).join(' ')}` : 'Kosong'} dot={!!act.current} />
              <View className="bg-muted flex-row items-center gap-1 rounded-full px-2.5 py-1">
                <Icon as={Radar} className="text-muted-foreground size-3" />
                <Text className="text-muted-foreground text-xs font-semibold">radius {lab.radiusM} m</Text>
              </View>
              {canEdit && <Text className="text-muted-foreground text-xs">{lab.lat.toFixed(5)}, {lab.lng.toFixed(5)}</Text>}
              <Text className="text-muted-foreground text-xs">{lab.photos?.length ? `${lab.photos.length} foto` : 'Belum ada foto'}</Text>
            </View>
            {lab.updatedAt && <Text className="text-muted-foreground text-xs">Diperbarui {formatDateTime(lab.updatedAt)}</Text>}
          </Pressable>
        );
      })}
    </Screen>
  );
}
