import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Clock, Crosshair, ExternalLink, Layers, MapPin, Navigation, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE, useBarPlacement, useTabInsets } from '@/components/app/screen';
import { Pill, SessionStatusPill } from '@/components/app/status';
import { LabMap } from '@/components/map/lab-map';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { labActivity, type SessionView } from '@/data/selectors';
import { useStore } from '@/data/store';
import { useLayout } from '@/hooks/use-layout';
import { useLiveLocation } from '@/hooks/use-location';
import { useNow } from '@/hooks/use-now';
import { useColors } from '@/hooks/use-theme';
import { formatTimeRange, relativeDay } from '@/lib/format';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { cn } from '@/lib/utils';

export default function MapScreen() {
  const { state } = useStore();
  const now = useNow(15_000);
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  // Overlays clear the side rail (left or right) or the floating bottom bar.
  const place = useBarPlacement();
  const { left: railLeft, right: railRight } = useTabInsets(true);
  const barAtBottom = place === 'phone' || place === 'bottom';
  const { scheme } = useColors();
  const [selected, setSelected] = useState<string>(() => state.sessions.find((s) => s.status === 'DIBUKA')?.labId ?? state.labs[0]?.id);
  const [focusKey, setFocusKey] = useState(0);
  const [focusOn, setFocusOn] = useState<'lab' | 'me'>('lab');
  const [onlyBusy, setOnlyBusy] = useState(false);
  const { state: loc } = useLiveLocation(state.labs[0]);
  const user = loc.status === 'ready' ? loc.position : null;

  const busy = useMemo(() => state.sessions.filter((s) => s.status === 'DIBUKA').map((s) => s.labId), [state.sessions]);
  const labs = onlyBusy ? state.labs.filter((l) => busy.includes(l.id)) : state.labs;
  const lab = state.labs.find((l) => l.id === selected);
  const activity = lab ? labActivity(state, lab.id, now) : null;

  const select = (id: string) => {
    setSelected(id);
    setFocusOn('lab');
    setFocusKey((k) => k + 1);
  };
  const focus = focusOn === 'me' && user ? { lat: user.lat, lng: user.lng, zoom: 18 } : lab ? { lat: lab.lat, lng: lab.lng, zoom: 18 } : undefined;

  return (
    <View className="bg-background flex-1">
      <View className="absolute inset-0">
        <LabMap
          labs={labs}
          selectedId={selected}
          onSelectLab={select}
          user={user}
          busyLabIds={busy}
          focus={focus}
          focusKey={`${focusOn}-${focusKey}`}
          dark={scheme === 'dark'}
        />
      </View>

      {/* Top overlay */}
      <View pointerEvents="box-none" className="absolute inset-x-0 top-0 z-10 gap-3" style={{ paddingTop: insets.top + 10, left: railLeft, right: railRight }}>
        <View pointerEvents="box-none" className="w-full max-w-2xl flex-row items-center gap-2 self-center px-4">
          <View className="bg-card/95 border-border flex-1 flex-row items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-black/10">
            <Icon as={MapPin} className="text-primary size-5" />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-bold">Peta Lab Informatika</Text>
              <Text className="text-muted-foreground text-xs">{busy.length} lab dipakai · {state.labs.length} total</Text>
            </View>
          </View>
          <MapButton icon={Layers} active={onlyBusy} label={onlyBusy ? 'Tampilkan semua lab' : 'Hanya lab yang dipakai'} onPress={() => setOnlyBusy(!onlyBusy)} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
          {labs.map((l) => {
            const active = l.id === selected;
            const isBusy = busy.includes(l.id);
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => select(l.id)}
                className={cn(
                  'h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 shadow-sm shadow-black/10',
                  active ? 'bg-primary border-primary' : 'bg-card border-border',
                )}
              >
                <View className={cn('size-2 rounded-full', isBusy ? 'bg-success' : active ? 'bg-primary-foreground' : 'bg-muted-foreground')} />
                <Text className={cn('text-[13px] font-semibold', active ? 'text-primary-foreground' : 'text-foreground')}>
                  {l.name.replace('Lab ', '')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom card */}
      <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 z-10" style={{ paddingBottom: barAtBottom ? TAB_BAR_SPACE + insets.bottom - 24 : insets.bottom + 20, left: railLeft, right: railRight }}>
        <View pointerEvents="box-none" className={cn('w-full max-w-md gap-2 px-4', wide && place !== 'right' ? 'self-end' : wide ? 'self-start' : 'self-center')}>
          <View pointerEvents="box-none" className="flex-row justify-end">
            <MapButton
              icon={Crosshair}
              label="Pusatkan ke lokasiku"
              active={focusOn === 'me'}
              onPress={() => {
                setFocusOn('me');
                setFocusKey((k) => k + 1);
              }}
            />
          </View>
          {lab && activity && (
            <View className="bg-card border-border gap-3 rounded-3xl border p-4 shadow-xl shadow-black/15">
              <View className="flex-row items-start gap-3">
                {!!lab.photos?.length && (
                  <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Foto ${lab.name}`} onPress={() => router.push(`/lab/${lab.id}`)}>
                    <Image source={{ uri: lab.photos[0] }} style={{ width: 64, height: 64, borderRadius: 16 }} contentFit="cover" />
                  </Pressable>
                )}
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-lg font-bold leading-6">{lab.name}</Text>
                  <Text className="text-muted-foreground text-[13px]">
                    {lab.code} · {lab.building}, {lab.floor}
                    {user ? ` · ${formatDistance(distanceMeters(user, lab))} darimu` : ''}
                  </Text>
                </View>
                <Pill tone={activity.current ? 'success' : 'neutral'} label={activity.current ? 'Dipakai' : 'Kosong'} dot={!!activity.current} />
              </View>
              <ActivityRow label="Sekarang" session={activity.current} now={now} empty="Tidak ada praktikum berlangsung" />
              <ActivityRow label="Berikutnya" session={activity.next} now={now} empty="Belum ada jadwal berikutnya" />
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/lab/${lab.id}`)}
                  className="bg-primary h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90"
                >
                  <Icon as={Clock} className="text-primary-foreground size-4" />
                  <Text className="text-primary-foreground text-sm font-semibold">Jadwal lab</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rute ke lab"
                  onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lab.lat},${lab.lng}&travelmode=walking`)}
                  className="bg-secondary h-11 flex-row items-center justify-center gap-2 rounded-2xl px-4 active:opacity-90"
                >
                  <Icon as={Navigation} className="size-4" />
                  <Text className="text-sm font-semibold">Rute</Text>
                  <Icon as={ExternalLink} className="text-muted-foreground size-3.5" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ActivityRow({ label, session, now, empty }: { label: string; session?: SessionView; now: number; empty: string }) {
  return (
    <Pressable
      disabled={!session}
      onPress={() => session && router.push(`/sesi/${session.id}`)}
      className="bg-muted flex-row items-center gap-3 rounded-2xl p-3 active:opacity-90"
    >
      <View className="w-[74px]">
        <Text className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">{label}</Text>
        {session && <Text className="text-xs font-semibold">{relativeDay(session.startsAt, now)}</Text>}
      </View>
      {session ? (
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-sm font-semibold" numberOfLines={1}>{session.course.name}</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>
              {session.cls.label} · {formatTimeRange(session.startsAt, session.endsAt)}
            </Text>
          </View>
        </View>
      ) : (
        <Text className="text-muted-foreground min-w-0 flex-1 text-[13px]">{empty}</Text>
      )}
      {session && <SessionStatusPill status={session.status} />}
    </Pressable>
  );
}

function MapButton({ icon, label, active, onPress }: { icon: typeof Users; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'size-12 items-center justify-center rounded-2xl border shadow-lg shadow-black/10',
        active ? 'bg-primary border-primary' : 'bg-card border-border',
      )}
    >
      <Icon as={icon} className={cn('size-5', active ? 'text-primary-foreground' : 'text-foreground')} />
    </Pressable>
  );
}
