import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ArrowRight,
  CircleCheck,
  CircleExclamationPoint,
  CircleX,
  Clock,
  LocateFixed,
  LocateOff,
  MapPin,
  Navigation,
  RefreshCw,
  ScanLine,
  Settings,
  ShieldCheck,
  Signal,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { DemoLocationPicker } from '@/components/app/demo-location';
import { GeoRadar } from '@/components/app/geo-radar';
import { Mascot } from '@/components/app/mascot';
import { Surface } from '@/components/app/primitives';
import { AttendancePill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attendanceFor, type SessionView } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import type { CheckInMethod } from '@/data/types';
import { useLayout } from '@/hooks/use-layout';
import { useLiveLocation, type LocationState } from '@/hooks/use-location';
import { useNow } from '@/hooks/use-now';
import { EARLY_OPEN_MIN, FAILURE_COPY, type CheckInVerdict } from '@/lib/attendance-rules';
import { formatClock, formatTime, formatTimeRange, MINUTE, relativeDay } from '@/lib/format';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { cn } from '@/lib/utils';

export function CheckInPanel({ session, compact = false }: { session: SessionView; compact?: boolean }) {
  const { state, checkIn } = useStore();
  const me = useMe();
  const now = useNow(1000);
  const record = attendanceFor(state, session.id, me.nim);
  const { state: loc, retry, openSettings } = useLiveLocation(session.lab, !record);
  const [result, setResult] = useState<{ verdict: CheckInVerdict; method: CheckInMethod } | null>(null);
  const [busy, setBusy] = useState(false);

  const position = loc.status === 'ready' ? loc.position : null;
  const distance = position ? distanceMeters(position, session.lab) : null;
  const inWindow = now >= session.startsAt - EARLY_OPEN_MIN * MINUTE && now <= session.endsAt;

  const checks: { label: string; ok: boolean; bad?: boolean; detail: string }[] = [
    { label: 'Sesi dibuka asisten', ok: session.status === 'DIBUKA', detail: session.status === 'DIBUKA' ? 'Dibuka' : 'Belum dibuka' },
    { label: 'Dalam jam praktikum', ok: inWindow, detail: `Jam server ${formatClock(now)}` },
    {
      label: 'Lokasi akurat',
      ok: !!position && !position.mocked && position.accuracyM <= session.lab.maxAccuracyM,
      bad: !!position?.mocked,
      detail: position ? (position.mocked ? 'Lokasi palsu' : `± ${Math.round(position.accuracyM)} m`) : locationLabel(loc),
    },
    {
      label: 'Di dalam radius lab',
      ok: distance !== null && distance <= session.lab.radiusM,
      // Known and failing (we have a fix and it's outside): shown in alarm red, not just greyed out.
      bad: distance !== null && distance > session.lab.radiusM,
      detail: distance === null ? '—' : `${formatDistance(distance)} / ${session.lab.radiusM} m`,
    },
  ];
  const ready = checks.every((c) => c.ok);
  const { wide } = useLayout();

  const submit = () => {
    setBusy(true);
    // The server checks time window, radius, accuracy and mock location with its own clock.
    checkIn({ sessionId: session.id, method: 'GEO', position })
      .then((verdict) => {
        setResult({ verdict, method: 'GEO' });
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(verdict.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
        }
      }, () => undefined)
      .finally(() => setBusy(false));
  };

  if (record) {
    return (
      <>
        <CheckedIn session={session} record={record} />
        <ResultDialog result={result} onClose={() => setResult(null)} session={session} />
      </>
    );
  }

  const radar = (
    <Surface className="bg-ink items-center gap-2 px-4 pb-6 pt-5">
      <LocationBanner state={loc} onRetry={retry} onSettings={openSettings} />
      <GeoRadar lab={session.lab} position={position} size={wide ? 280 : compact ? 200 : 236} />
    </Surface>
  );

  const controls = (
    <>
      <Surface className="gap-0 overflow-hidden">
        {checks.map((c, i) => (
          <View key={c.label} className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 && 'border-foreground/10 border-t')}>
            <View className={cn('size-7 items-center justify-center rounded-full', c.ok ? 'bg-sage' : c.bad ? 'bg-alarm' : 'bg-foreground/10')}>
              <Icon as={c.ok ? CircleCheck : CircleX} className={cn('size-4', c.ok ? 'text-on-bright' : c.bad ? 'text-white' : 'text-muted-foreground')} strokeWidth={2.6} />
            </View>
            <Text className="min-w-0 flex-1 text-sm font-semibold">{c.label}</Text>
            <Text className={cn('font-mono text-[11px] font-bold', c.ok ? 'text-success-ink' : c.bad ? 'text-alarm' : 'text-muted-foreground')} style={{ fontVariant: ['tabular-nums'] }}>
              {c.detail}
            </Text>
          </View>
        ))}
      </Surface>

      <View className="gap-2">
        <Button size="lg" onPress={submit} disabled={busy} className={cn('h-16 justify-between pl-6 pr-2', ready ? 'bg-coral active:bg-coral/90' : 'bg-foreground/10')}>
          <View className="flex-row items-center gap-2">
            {busy ? <ActivityIndicator color="#1B1B1B" /> : <Icon as={MapPin} className={cn('size-5', ready ? 'text-on-bright' : 'text-foreground')} strokeWidth={2.4} />}
            <Text className={cn('text-base font-bold', ready ? 'text-on-bright' : 'text-foreground')}>
              {busy ? 'Memverifikasi…' : ready ? 'Presensi dengan lokasi' : 'Coba presensi'}
            </Text>
          </View>
          <View className="bg-ink size-12 items-center justify-center rounded-full">
            <Icon as={ArrowRight} className="text-ink-foreground size-5" strokeWidth={2.4} />
          </View>
        </Button>
        <Button variant="outline" size="lg" className="h-14" onPress={() => router.push({ pathname: '/scan', params: { session: session.id } })}>
          <Icon as={ScanLine} className="size-5" strokeWidth={2.4} />
          <Text className="text-base">Pindai QR asisten</Text>
        </Button>
        <View className="flex-row items-start gap-2 px-1 pt-1">
          <Icon as={ShieldCheck} className="text-muted-foreground mt-0.5 size-4" />
          <Text className="text-muted-foreground min-w-0 flex-1 text-xs leading-5">
            Lokasi dan jam diverifikasi ulang oleh server saat kamu menekan presensi. Presensi yang gagal tidak dicatat sebagai hadir.
          </Text>
        </View>
      </View>

      {__DEV__ ? <DemoLocationPicker /> : null}
    </>
  );

  return (
    <View className="gap-4">
      {!compact && <SessionSummary session={session} now={now} />}
      {/* Wide screens: radar beside the checklist and buttons, so the button is visible without scrolling. */}
      {wide ? (
        <View className="flex-row items-start gap-4">
          <View className="min-w-0" style={{ flex: 1 }}>{radar}</View>
          <View className="min-w-0 gap-4" style={{ flex: 1 }}>{controls}</View>
        </View>
      ) : (
        <>
          {radar}
          {controls}
        </>
      )}
      <ResultDialog result={result} onClose={() => setResult(null)} session={session} />
    </View>
  );
}

function locationLabel(loc: LocationState) {
  switch (loc.status) {
    case 'denied':
      return 'Izin ditolak';
    case 'services-off':
      return 'GPS mati';
    case 'error':
      return 'Gagal';
    default:
      return 'Mencari…';
  }
}

export function SessionSummary({ session, now }: { session: SessionView; now: number }) {
  return (
    <Surface className="bg-violet gap-3 overflow-hidden p-5">
      <View className="absolute -right-16 -top-16 size-48 rounded-full border-[24px] border-black/5" />
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 font-mono text-[11px] font-bold uppercase text-white/80" numberOfLines={1}>
          {session.course.name} · {session.cls.label}
        </Text>
        <View className="bg-ink flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
          {session.status === 'DIBUKA' && <View className="bg-aqua size-2 rounded-full" />}
          <Text className="text-ink-foreground font-mono text-[11px] font-bold uppercase">{session.status === 'DIBUKA' ? 'Live' : session.status.toLowerCase()}</Text>
        </View>
      </View>
      <Text className="font-display text-[34px] font-extrabold uppercase leading-[34px] text-white">
        <Text className="font-display text-[34px] font-extrabold text-mustard">P{session.meetingNo} </Text>
        {session.topic}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-black/15 px-3 py-1.5">
          <Icon as={Clock} className="size-3.5 text-white" strokeWidth={2.4} />
          <Text className="font-mono text-[11px] font-bold text-white">{relativeDay(session.startsAt, now)}, {formatTimeRange(session.startsAt, session.endsAt)}</Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-black/15 px-3 py-1.5">
          <Icon as={MapPin} className="size-3.5 text-white" strokeWidth={2.4} />
          <Text className="font-mono text-[11px] font-bold text-white">{session.lab.code} · {session.lab.name}</Text>
        </View>
      </View>
    </Surface>
  );
}

function LocationBanner({ state, onRetry, onSettings }: { state: LocationState; onRetry: () => void; onSettings: () => void }) {
  if (state.status === 'ready') {
    const p = state.position;
    return (
      <View className="mb-1 flex-row items-center gap-1.5 self-center rounded-full bg-white/10 px-3 py-1.5">
        <Icon as={p.accuracyM > 50 ? Signal : LocateFixed} className={cn('size-3.5', p.mocked ? 'text-coral' : p.accuracyM > 50 ? 'text-mustard' : 'text-aqua')} strokeWidth={2.4} />
        <Text className="text-ink-foreground font-mono text-[11px] font-bold">
          {p.mocked ? 'Lokasi palsu terdeteksi' : `Lokasi aktif · akurasi ± ${Math.round(p.accuracyM)} m`}
        </Text>
      </View>
    );
  }
  if (state.status === 'searching' || state.status === 'requesting' || state.status === 'idle') {
    return (
      <View className="mb-1 flex-row items-center gap-2 self-center rounded-full bg-white/10 px-3 py-1.5">
        <ActivityIndicator size="small" color="#A6E4EF" />
        <Text className="text-ink-foreground font-mono text-[11px] font-bold">
          {state.status === 'requesting' ? 'Meminta izin lokasi…' : 'Mencari sinyal GPS…'}
        </Text>
      </View>
    );
  }
  const copy =
    state.status === 'denied'
      ? { title: 'Izin lokasi ditolak', body: 'LabSync butuh lokasi untuk memastikan kamu ada di lab. Izinkan akses lokasi di pengaturan.', icon: LocateOff }
      : state.status === 'services-off'
        ? { title: 'Layanan lokasi mati', body: 'Nyalakan GPS / Location di pengaturan perangkat, lalu coba lagi.', icon: Navigation }
        : { title: 'Lokasi tidak bisa didapat', body: state.message, icon: CircleExclamationPoint };
  return (
    <View className="bg-coral mb-2 w-full gap-3 rounded-[24px] p-4">
      <View className="flex-row items-start gap-3">
        <Icon as={copy.icon} className="text-on-bright mt-0.5 size-6" strokeWidth={2.4} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-on-bright font-display text-xl font-extrabold uppercase leading-6">{copy.title}</Text>
          <Text className="text-on-bright text-[13px] font-medium leading-5">{copy.body}</Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Button size="sm" onPress={onRetry} className="bg-ink flex-1">
          <Icon as={RefreshCw} className="text-ink-foreground size-4" />
          <Text className="text-ink-foreground">Coba lagi</Text>
        </Button>
        {Platform.OS !== 'web' && (
          <Button size="sm" onPress={onSettings} className="flex-1 bg-white">
            <Icon as={Settings} className="text-on-bright size-4" />
            <Text className="text-on-bright">Pengaturan</Text>
          </Button>
        )}
      </View>
    </View>
  );
}

function CheckedIn({ session, record }: { session: SessionView; record: NonNullable<ReturnType<typeof attendanceFor>> }) {
  return (
    <View className="gap-4">
      <Surface className="bg-aqua items-center gap-4 overflow-hidden px-5 py-8">
        <View className="absolute -bottom-24 -left-16 size-64 rounded-full border-[28px] border-black/5" />
        <Mascot mood="success" size={120} />
        <View className="items-center gap-1">
          <Text className="text-on-bright font-display text-[40px] font-extrabold uppercase leading-[40px]">Presensi tercatat</Text>
          <Text className="text-on-bright text-center text-sm font-medium opacity-75">
            {session.course.name} · P{session.meetingNo}
          </Text>
        </View>
        <AttendancePill status={record.status} />
        <View className="w-full flex-row gap-2">
          <Fact label="Waktu" value={formatTime(record.checkedInAt)} />
          <Fact label="Metode" value={record.method === 'QR' ? 'QR + lokasi' : record.method === 'GEO' ? 'Lokasi' : 'Manual'} />
          <Fact label="Jarak" value={record.distanceM !== undefined ? `${record.distanceM} m` : '—'} />
        </View>
      </Surface>
      <Button variant="outline" size="lg" onPress={() => router.push(`/sesi/${session.id}`)}>
        <Text>Lihat detail sesi</Text>
      </Button>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-2xl bg-white/60 py-2.5">
      <Text className="text-on-bright font-mono text-[10px] font-bold uppercase opacity-70">{label}</Text>
      <Text className="text-on-bright font-display text-xl font-extrabold">{value}</Text>
    </View>
  );
}

export function ResultDialog({
  result,
  onClose,
  session,
}: {
  result: { verdict: CheckInVerdict; method: CheckInMethod } | null;
  onClose: () => void;
  session: SessionView;
}) {
  const verdict = result?.verdict;
  const ok = verdict?.ok;
  const copy = verdict && !verdict.ok ? FAILURE_COPY[verdict.failure] : null;
  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl">
        <DialogHeader className="items-center gap-3">
          <Mascot mood={ok ? 'success' : 'oops'} size={112} />
          <DialogTitle className="font-display text-center text-[32px] font-extrabold uppercase leading-8">
            {ok ? (verdict.status === 'TERLAMBAT' ? 'Tercatat terlambat' : 'Kamu hadir!') : copy?.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {ok
              ? `${session.course.name} P${session.meetingNo}. Asisten sudah bisa melihatmu di rekap.`
              : copy?.body}
          </DialogDescription>
        </DialogHeader>
        {verdict?.distanceM !== undefined && (
          <View className="bg-ink flex-row justify-around rounded-[24px] py-3">
            <View className="items-center">
              <Text className="text-ink-muted font-mono text-[10px] font-bold uppercase">Jarak</Text>
              <Text className="text-ink-foreground font-display text-2xl font-extrabold">{formatDistance(verdict.distanceM)}</Text>
            </View>
            <View className="items-center">
              <Text className="text-ink-muted font-mono text-[10px] font-bold uppercase">Radius</Text>
              <Text className="text-ink-foreground font-display text-2xl font-extrabold">{session.lab.radiusM} m</Text>
            </View>
            {verdict.accuracyM !== undefined && (
              <View className="items-center">
                <Text className="text-ink-muted font-mono text-[10px] font-bold uppercase">Akurasi</Text>
                <Text className="text-ink-foreground font-display text-2xl font-extrabold">± {Math.round(verdict.accuracyM)} m</Text>
              </View>
            )}
          </View>
        )}
        <DialogFooter>
          <Button size="lg" className={ok ? 'bg-coral active:bg-coral/90' : 'bg-ink active:bg-ink/90'} onPress={onClose}>
            <Text className={ok ? 'text-on-bright text-base' : 'text-ink-foreground text-base'}>{ok ? 'Selesai' : 'Mengerti'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
