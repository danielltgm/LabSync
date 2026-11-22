import { router } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Chip, EmptyState, ListRow, Meter, RowDivider, RowGroup, StackedMeter, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { ATTENDANCE_STATUS, AttendancePill, TONE_CLASSES } from '@/components/app/status';
import { Text } from '@/components/ui/text';
import { studentStats, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import type { AttendanceStatus } from '@/data/types';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function HistoryScreen() {
  const { state } = useStore();
  const me = useMe();
  const [filter, setFilter] = useState<'all' | AttendanceStatus>('all');
  const [course, setCourse] = useState<string>('all');
  const stats = useMemo(() => studentStats(state, me.nim), [state, me.nim]);

  const records = useMemo(
    () =>
      state.attendance
        .filter((a) => a.nim === me.nim)
        .map((a) => ({ a, s: viewSession(state, state.sessions.find((s) => s.id === a.sessionId)!) }))
        .sort((x, y) => y.s.startsAt - x.s.startsAt),
    [state, me.nim],
  );
  const shown = records.filter(({ a, s }) => (filter === 'all' || a.status === filter) && (course === 'all' || s.classId === course));
  const o = stats.overall;

  return (
    <Screen header={<PageHeader title="Riwayat presensi" subtitle={`${o.total} pertemuan selesai`} />}>
      <Surface className="gap-4 p-5">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-muted-foreground text-sm">Tingkat kehadiran</Text>
            <Text className="text-4xl font-bold tracking-tight">{o.rate}%</Text>
          </View>
          <Text className={cn('text-sm font-semibold', o.rate >= 75 ? 'text-success-ink' : 'text-danger-ink')}>
            {o.rate >= 75 ? 'Memenuhi syarat' : 'Di bawah 75%'}
          </Text>
        </View>
        <StackedMeter parts={[{ value: o.HADIR, tone: 'success' }, { value: o.TERLAMBAT, tone: 'warning' }, { value: o.IZIN, tone: 'info' }, { value: o.ALPHA, tone: 'danger' }]} />
        <View className="flex-row gap-2">
          {(['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'] as const).map((k) => (
            <View key={k} className="flex-1 items-center gap-0.5">
              <Text className={cn('text-lg font-bold', TONE_CLASSES[ATTENDANCE_STATUS[k].tone].ink)}>{o[k]}</Text>
              <Text className="text-muted-foreground text-[11px]">{ATTENDANCE_STATUS[k].label}</Text>
            </View>
          ))}
        </View>
      </Surface>

      <Section title="Per mata praktikum">
        <RowGroup>
          {stats.perClass.map((p, i) => (
            <View key={p.cls.id}>
              {i > 0 && <RowDivider />}
              <View className="gap-2 px-4 py-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="min-w-0 flex-1 text-[15px] font-medium" numberOfLines={1}>{p.course.name}</Text>
                  <Text className="text-sm font-bold">{p.tally.rate}%</Text>
                </View>
                <Meter value={p.tally.rate} tone={p.tally.rate < 75 ? 'danger' : p.tally.rate < 80 ? 'warning' : 'success'} />
                <Text className="text-muted-foreground text-xs">
                  {p.tally.HADIR} hadir · {p.tally.TERLAMBAT} terlambat · {p.tally.IZIN} izin · {p.tally.ALPHA} alpha dari {p.finished}
                </Text>
              </View>
            </View>
          ))}
        </RowGroup>
      </Section>

      <Section title="Semua catatan">
        <View className="flex-row flex-wrap gap-2">
          <Chip label="Semua" active={filter === 'all'} onPress={() => setFilter('all')} />
          {(['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'] as const).map((k) => (
            <Chip key={k} label={ATTENDANCE_STATUS[k].label} active={filter === k} onPress={() => setFilter(k)} />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Chip label="Semua kelas" active={course === 'all'} onPress={() => setCourse('all')} />
          {stats.perClass.map((p) => (
            <Chip key={p.cls.id} label={p.course.name.split(' ').map((w) => w[0]).join('')} active={course === p.cls.id} onPress={() => setCourse(p.cls.id)} />
          ))}
        </View>
        {shown.length ? (
          <RowGroup>
            {shown.slice(0, 60).map(({ a, s }, i) => (
              <View key={a.id}>
                {i > 0 && <RowDivider />}
                <ListRow
                  title={`${s.course.name} · P${s.meetingNo}`}
                  subtitle={`${s.topic} · ${formatDateTime(a.status === 'HADIR' || a.status === 'TERLAMBAT' ? a.checkedInAt : s.startsAt)}`}
                  trailing={<AttendancePill status={a.status} />}
                  chevron={false}
                  onPress={() => router.push(`/sesi/${s.id}`)}
                />
              </View>
            ))}
          </RowGroup>
        ) : (
          <EmptyState icon={RotateCcw} title="Tidak ada catatan" />
        )}
      </Section>
    </Screen>
  );
}
