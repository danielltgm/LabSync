import { router } from 'expo-router';
import { CalendarPlus, CalendarX, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { LayoutAnimation, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/app/pickers';
import { EmptyState, Meter, Segmented, Surface } from '@/components/app/primitives';
import { Screen, Section, TabTitle, Column } from '@/components/app/screen';
import { DayStrip, TimelineRow } from '@/components/app/session-blocks';
import { ATTENDANCE_STATUS, TONE_CLASSES } from '@/components/app/status';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attendanceFor, leaveFor, sessionsForUser, type SessionView } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useLayout } from '@/hooks/use-layout';
import { useNow } from '@/hooks/use-now';
import { DAY, formatDate, isSameDay, relativeDay, startOfDay, startOfMonth } from '@/lib/format';
import { cn } from '@/lib/utils';

type Mode = 'hari' | 'minggu' | 'kelas';

export default function ScheduleScreen() {
  const { state } = useStore();
  const me = useMe();
  const now = useNow(30_000);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('hari');
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [month, setMonth] = useState(() => startOfMonth(Date.now()));
  const [expanded, setExpanded] = useState(false);
  const { split } = useLayout();
  const sessions = useMemo(() => sessionsForUser(state, me), [state, me]);
  const isStaff = me.role !== 'PRAKTIKAN';

  const marks = useMemo(() => {
    const m = new Map<number, { count: number; live: boolean }>();
    sessions.forEach((s) => {
      const key = startOfDay(s.startsAt);
      const cur = m.get(key) ?? { count: 0, live: false };
      m.set(key, { count: cur.count + 1, live: cur.live || s.status === 'DIBUKA' });
    });
    return m;
  }, [sessions]);

  const daySessions = sessions.filter((s) => isSameDay(s.startsAt, day));
  const week = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 7 }, (_, i) => start + i * DAY).map((d) => ({ day: d, items: sessions.filter((s) => isSameDay(s.startsAt, d)) }));
  }, [sessions, now]);

  const row = (s: SessionView, i: number, arr: SessionView[]) => (
    <TimelineRow
      key={s.id}
      session={s}
      now={now}
      record={isStaff ? undefined : attendanceFor(state, s.id, me.nim)}
      leave={isStaff ? undefined : leaveFor(state, s.id, me.nim)}
      last={i === arr.length - 1}
    />
  );

  const pickDay = (d: number) => {
    setDay(d);
    setMonth(startOfMonth(d));
  };
  const toggle = (next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(next);
  };
  // Keep the strip around the picked day when it's outside the default 3-weeks window.
  const today = startOfDay(now);
  const stripAnchor = day < today - 3 * DAY || day > today + 17 * DAY ? day : now;
  const calendar = (
    <MonthCalendar month={month} onMonthChange={setMonth} selected={day} onSelect={pickDay} marks={marks} today={now} />
  );
  const dayList = (
    <Section title={`${relativeDay(day, now)} · ${daySessions.length} sesi`}>
      {daySessions.length ? (
        <View>{daySessions.map(row)}</View>
      ) : (
        <Surface>
          <EmptyState icon={CalendarX} title="Tidak ada praktikum" body={`${formatDate(day, { weekday: true })} kosong. Pilih tanggal lain.`} />
        </Surface>
      )}
    </Section>
  );

  return (
    <Screen
      tabs
      header={
        <View className="bg-background gap-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
          <Column className="gap-4">
            <TabTitle
              eyebrow={formatDate(now, { year: true })}
              title="Jadwal"
              right={
                isStaff ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Buat sesi"
                    onPress={() => router.push('/sesi/baru')}
                    className="bg-primary h-10 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-90"
                  >
                    <Icon as={CalendarPlus} className="text-primary-foreground size-4" />
                    <Text className="text-primary-foreground text-sm font-semibold">Sesi</Text>
                  </Pressable>
                ) : undefined
              }
            />
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'hari', label: 'Harian' },
                { value: 'minggu', label: '7 hari' },
                { value: 'kelas', label: 'Per kelas' },
              ]}
            />
          </Column>
          {mode === 'hari' && !split && (
            <Column flush>
              {expanded ? (
                <Column>{calendar}</Column>
              ) : (
                <DayStrip now={now} anchor={stripAnchor} selected={day} onSelect={pickDay} marks={marks} days={21} offset={-3} />
              )}
              <Grabber expanded={expanded} onToggle={toggle} />
            </Column>
          )}
        </View>
      }
    >
      {mode === 'hari' &&
        (split ? (
          // Landscape tablet: the month stays open next to the selected day.
          <View className="flex-row items-start gap-6">
            <Surface className="w-[400px] p-4">{calendar}</Surface>
            <View className="min-w-0 flex-1">{dayList}</View>
          </View>
        ) : (
          dayList
        ))}

      {mode === 'minggu' &&
        week.map(({ day: d, items }) => (
          <Section key={d} title={`${relativeDay(d, now)} · ${formatDate(d, { short: true })}`}>
            {items.length ? (
              <View>{items.map(row)}</View>
            ) : (
              <Text className="text-muted-foreground pl-[76px] text-sm">Tidak ada sesi</Text>
            )}
          </Section>
        ))}

      {mode === 'kelas' && <ByClass sessions={sessions} now={now} isStaff={isStaff} />}
    </Screen>
  );
}

function ByClass({ sessions, now, isStaff }: { sessions: SessionView[]; now: number; isStaff: boolean }) {
  const { state } = useStore();
  const me = useMe();
  const groups = useMemo(() => {
    const map = new Map<string, SessionView[]>();
    sessions.forEach((s) => map.set(s.classId, [...(map.get(s.classId) ?? []), s]));
    return [...map.values()].map((list) => list.sort((a, b) => a.meetingNo - b.meetingNo));
  }, [sessions]);

  return (
    <View className="gap-4">
      {groups.map((list) => {
        const first = list[0];
        const done = list.filter((s) => s.status === 'SELESAI').length;
        return (
          <Surface key={first.classId} className="gap-4 p-4">
            <Pressable onPress={() => router.push(isStaff ? `/kelas/${first.classId}` : `/sesi/${list.find((s) => s.endsAt > now)?.id ?? first.id}`)} className="gap-1">
              <Text className="text-base font-semibold">{first.course.name}</Text>
              <Text className="text-muted-foreground text-[13px]">
                {first.cls.label} · {first.lab.name} · {first.cls.startTime}–{first.cls.endTime}
              </Text>
            </Pressable>
            <View className="gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground text-xs font-medium">Progres pertemuan</Text>
                <Text className="text-xs font-semibold">{done}/{list.length}</Text>
              </View>
              <Meter value={(done / list.length) * 100} />
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {list.map((s) => {
                const record = isStaff ? undefined : attendanceFor(state, s.id, me.nim);
                const tone = record ? TONE_CLASSES[ATTENDANCE_STATUS[record.status].tone] : null;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Pertemuan ${s.meetingNo}`}
                    onPress={() => router.push(`/sesi/${s.id}`)}
                    className={cn(
                      'size-10 items-center justify-center rounded-xl border',
                      tone ? cn(tone.soft, 'border-transparent') : s.status === 'DIBUKA' ? 'bg-success border-success' : 'border-border bg-background',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-[13px] font-bold',
                        tone ? tone.ink : s.status === 'DIBUKA' ? 'text-white' : s.status === 'SELESAI' ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {record ? ATTENDANCE_STATUS[record.status].short : s.meetingNo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>
        );
      })}
      {!isStaff && (
        <View className="flex-row flex-wrap gap-x-4 gap-y-2 px-1">
          {(['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'] as const).map((k) => (
            <View key={k} className="flex-row items-center gap-1.5">
              <View className={cn('size-3 rounded', TONE_CLASSES[ATTENDANCE_STATUS[k].tone].solid)} />
              <Text className="text-muted-foreground text-xs">{ATTENDANCE_STATUS[k].short} = {ATTENDANCE_STATUS[k].label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Handle under the date strip: tap it, or drag down to open the month and up to close it.
 */
function Grabber({ expanded, onToggle }: { expanded: boolean; onToggle: (next: boolean) => void }) {
  // Created once; onToggle only sets state, so the first closure stays valid.
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 24) onToggle(true);
        else if (g.dy < -24) onToggle(false);
      },
    }),
  );
  return (
    <View {...pan.panHandlers} className="items-center pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Tutup kalender bulan' : 'Buka kalender bulan'}
        accessibilityState={{ expanded }}
        onPress={() => onToggle(!expanded)}
        hitSlop={8}
        className="items-center gap-1 px-6 py-1"
      >
        <View className="bg-foreground/20 h-1.5 w-12 rounded-full" />
        <View className="flex-row items-center gap-1">
          <Icon as={expanded ? ChevronUp : ChevronDown} className="text-muted-foreground size-3.5" strokeWidth={2.6} />
          <Text className="text-muted-foreground font-mono text-[10px] font-bold uppercase">{expanded ? 'Tutup bulan' : 'Lihat sebulan'}</Text>
        </View>
      </Pressable>
    </View>
  );
}
