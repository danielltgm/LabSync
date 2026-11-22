import { router } from 'expo-router';
import { ArrowRight, ArrowUpRight, CircleCheck, Clock, MapPin, QrCode, ScanLine, Play, Users } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Mascot } from '@/components/app/mascot';
import { AttendancePill, LeavePill, SessionStatusPill } from '@/components/app/status';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { SessionView } from '@/data/selectors';
import type { Attendance, LeaveRequest } from '@/data/types';
import { countdown, dayName, formatTime, formatTimeRange, isSameDay, relativeDay, relativeTime, startOfDay, DAY } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------ Hero card */

/**
 * Poster-style card for the session that matters right now.
 * Live = coral with ink text; upcoming = violet with white text.
 */
export function SessionHero({
  session,
  now,
  record,
  role,
  checkedInCount,
  rosterSize,
}: {
  session: SessionView;
  now: number;
  record?: Attendance;
  role: 'PRAKTIKAN' | 'ASISTEN';
  checkedInCount?: number;
  rosterSize?: number;
}) {
  const live = session.status === 'DIBUKA';
  const startsIn = session.startsAt - now;
  const eyebrow = live
    ? 'Live'
    : startsIn < 0
      ? 'Menunggu dibuka'
      : `${relativeDay(session.startsAt, now)} · ${relativeTime(session.startsAt, now)}`;
  const fg = live ? 'text-on-bright' : 'text-white';
  const pct = rosterSize ? Math.round(((checkedInCount ?? 0) / rosterSize) * 100) : 0;

  return (
    <View className={cn('overflow-hidden rounded-[32px] p-5', live ? 'bg-coral' : 'bg-violet')}>
      {/* Decorative rings, echoing the geofence radius. */}
      <View className="absolute -bottom-24 -right-20 size-72 rounded-full border-[32px] border-black/5" />
      <View className="absolute -bottom-8 -right-4 size-40 rounded-full border-[20px] border-black/5" />

      <View className="flex-row items-center justify-between gap-2">
        <View className="bg-ink flex-row items-center gap-2 rounded-full px-3 py-1.5">
          {live && <View className="bg-aqua size-2 rounded-full" />}
          <Text className="text-ink-foreground font-mono text-[11px] font-bold uppercase">{eyebrow}</Text>
          {live && (
            <Text className="text-mustard font-mono text-[11px] font-bold" style={{ fontVariant: ['tabular-nums'] }}>
              sisa {countdown(session.endsAt, now)}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Detail sesi"
          onPress={() => router.push(`/sesi/${session.id}`)}
          className="size-11 items-center justify-center rounded-full bg-white active:opacity-80"
        >
          <Icon as={ArrowUpRight} className="text-on-bright size-5" strokeWidth={2.4} />
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-end gap-2">
        <Pressable accessibilityRole="link" onPress={() => router.push(`/sesi/${session.id}`)} className="min-w-0 flex-1 gap-1 active:opacity-80">
          <Text className={cn('font-mono text-[11px] font-bold uppercase opacity-75', fg)} numberOfLines={1}>
            {session.course.name} · {session.cls.label}
          </Text>
          <Text className={cn('font-display text-[36px] font-extrabold uppercase leading-[36px]', fg)} numberOfLines={3}>
            {session.topic}
          </Text>
          <Text className={cn('text-sm font-medium opacity-80', fg)}>Pertemuan {session.meetingNo} dari 12</Text>
        </Pressable>
        <View className="-mb-2 -mr-2">
          <Mascot mood={live ? (role === 'ASISTEN' ? 'clipboard' : record ? 'happy' : 'scan') : 'waiting'} size={112} />
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <HeroMeta icon={Clock} label={formatTimeRange(session.startsAt, session.endsAt)} fg={fg} />
        <HeroMeta icon={MapPin} label={`${session.lab.code} · ${session.lab.name}`} fg={fg} />
      </View>

      {role === 'ASISTEN' && rosterSize ? (
        <View className="mt-4 gap-2">
          <View className="flex-row items-end justify-between">
            <Text className={cn('font-display text-3xl font-extrabold', fg)}>
              {checkedInCount}/{rosterSize}
              <Text className={cn('font-sans text-sm font-semibold', fg)}> sudah presensi</Text>
            </Text>
            <Text className={cn('font-mono text-xs font-bold', fg)}>{pct}%</Text>
          </View>
          <View className="h-3 overflow-hidden rounded-full bg-black/15">
            <View className="bg-ink h-full rounded-full" style={{ width: `${pct}%` }} />
          </View>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-2">
        {role === 'PRAKTIKAN' ? (
          record ? (
            <View className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-black/15">
              <Icon as={CircleCheck} className={cn('size-5', fg)} strokeWidth={2.4} />
              <Text className={cn('font-bold', fg)}>
                {record.status === 'TERLAMBAT' ? 'Terlambat' : 'Hadir'} · {formatTime(record.checkedInAt)}
              </Text>
            </View>
          ) : (
            <HeroButton
              icon={ScanLine}
              label={live ? 'Presensi sekarang' : 'Lihat detail'}
              onPress={() => router.push(live ? `/presensi/${session.id}` : `/sesi/${session.id}`)}
            />
          )
        ) : (
          <>
            <HeroButton
              icon={live ? QrCode : Play}
              label={live ? 'Tampilkan QR' : 'Buka sesi'}
              onPress={() => router.push(live ? `/qr/${session.id}` : `/sesi/${session.id}`)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rekap"
              onPress={() => router.push(`/rekap/${session.id}`)}
              className="size-14 items-center justify-center rounded-full bg-white active:opacity-80"
            >
              <Icon as={Users} className="text-on-bright size-5" strokeWidth={2.4} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function HeroMeta({ icon, label, fg }: { icon: typeof Clock; label: string; fg: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5">
      <Icon as={icon} className={cn('size-3.5', fg)} strokeWidth={2.4} />
      <Text className={cn('font-mono text-[11px] font-bold', fg)} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function HeroButton({ icon, label, onPress }: { icon: typeof Clock; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="bg-ink h-14 flex-1 flex-row items-center justify-between rounded-full pl-5 pr-1.5 active:opacity-90"
    >
      <View className="flex-row items-center gap-2">
        <Icon as={icon} className="text-ink-foreground size-5" strokeWidth={2.4} />
        <Text className="text-ink-foreground text-base font-bold">{label}</Text>
      </View>
      <View className="bg-aqua size-11 items-center justify-center rounded-full">
        <Icon as={ArrowRight} className="text-on-bright size-5" strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

/* --------------------------------------------------------- Timeline row */

export function TimelineRow({
  session,
  record,
  leave,
  now,
  last,
  showDate,
}: {
  session: SessionView;
  record?: Attendance;
  leave?: LeaveRequest;
  now: number;
  last?: boolean;
  showDate?: boolean;
}) {
  const live = session.status === 'DIBUKA';
  const past = session.endsAt < now && !live;
  const sub = live ? 'text-on-bright opacity-75' : 'text-muted-foreground';
  return (
    <View className="flex-row gap-3">
      <View className="w-12 items-end pt-3.5">
        <Text className={cn('font-mono text-[13px] font-bold', past && 'text-muted-foreground')} style={{ fontVariant: ['tabular-nums'] }}>
          {formatTime(session.startsAt)}
        </Text>
        <Text className="text-muted-foreground font-mono text-[11px]" style={{ fontVariant: ['tabular-nums'] }}>{formatTime(session.endsAt)}</Text>
      </View>
      <View className="items-center">
        <View className={cn('border-foreground mt-4 size-3.5 rounded-full border-[3px]', live ? 'bg-coral' : past ? 'bg-foreground' : 'bg-background')} />
        {!last && <View className="bg-foreground/15 w-[3px] flex-1 rounded-full" />}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/sesi/${session.id}`)}
        className={cn(
          'mb-3 min-w-0 flex-1 gap-2 rounded-[24px] p-4 active:opacity-90',
          live ? 'bg-coral' : 'bg-card',
          past && 'opacity-70',
        )}
      >
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            {showDate && <Text className={cn('mb-0.5 font-mono text-[11px] font-bold uppercase', sub)}>{relativeDay(session.startsAt, now)}</Text>}
            <Text className={cn('font-display text-[22px] font-extrabold uppercase leading-6', live && 'text-on-bright')} numberOfLines={2}>{session.course.name}</Text>
            <Text className={cn('mt-0.5 text-[13px] font-medium', sub)} numberOfLines={2}>
              P{session.meetingNo} · {session.topic}
            </Text>
          </View>
          {live ? (
            <View className="bg-ink flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
              <View className="bg-aqua size-2 rounded-full" />
              <Text className="text-ink-foreground font-mono text-[11px] font-bold">LIVE</Text>
            </View>
          ) : (
            <SessionStatusPill status={session.status} />
          )}
        </View>
        <View className="flex-row items-center gap-1.5">
          <Icon as={MapPin} className={cn('size-3.5', sub)} />
          <Text className={cn('font-mono text-[11px]', sub)} numberOfLines={1}>{session.lab.code} · {session.lab.name} · {session.cls.label}</Text>
        </View>
        {(record || leave || session.changeNote) && (
          <View className="flex-row flex-wrap items-center gap-1.5">
            {record && <AttendancePill status={record.status} />}
            {!record && leave && <LeavePill decision={leave.decision} />}
            {session.changeNote && session.status === 'TERJADWAL' && (
              <View className="bg-warning-soft rounded-full px-2.5 py-1">
                <Text className="text-warning-ink text-xs font-semibold">Jadwal berubah</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------- Day strip */

export function DayStrip({
  now,
  selected,
  onSelect,
  marks,
  days = 14,
  offset = -2,
  anchor,
}: {
  now: number;
  /** Day the strip is built around. Defaults to today. */
  anchor?: number;
  selected: number;
  onSelect: (day: number) => void;
  /** start-of-day ms → number of sessions */
  marks: Map<number, { count: number; live: boolean }>;
  days?: number;
  offset?: number;
}) {
  const today = startOfDay(now);
  const base = startOfDay(anchor ?? now);
  const list = Array.from({ length: days }, (_, i) => base + (i + offset) * DAY);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {list.map((day) => {
        const active = isSameDay(day, selected);
        const mark = marks.get(day);
        const isToday = day === today;
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(day)}
            className={cn(
              'h-[78px] w-[56px] items-center justify-center gap-0.5 rounded-full',
              active ? 'bg-foreground' : 'bg-card active:bg-accent',
            )}
          >
            <Text className={cn('font-mono text-[10px] font-bold uppercase', active ? 'text-background' : 'text-muted-foreground')}>
              {isToday ? 'Hari' : dayName(day, true)}
            </Text>
            <Text className={cn('font-display text-2xl font-extrabold leading-7', active ? 'text-background' : 'text-foreground')}>
              {new Date(day).getDate()}
            </Text>
            <View className="h-1.5 flex-row gap-0.5">
              {mark &&
                Array.from({ length: Math.min(mark.count, 3) }, (_, i) => (
                  <View
                    key={i}
                    className={cn('size-1.5 rounded-full', mark.live && i === 0 ? 'bg-coral' : active ? 'bg-background' : 'bg-violet')}
                  />
                ))}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
