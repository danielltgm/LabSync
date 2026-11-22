import { router } from 'expo-router';
import { CalendarRange, Plus, ShieldCheck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { DateField, PeoplePicker, TimeField } from '@/components/app/pickers';
import { Chip, EmptyState, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { Stepper } from '@/components/app/session-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { DAY, formatDate, formatTimeRange, fromDateTimeInput, MINUTE, startOfDay, toDateInput, weekdayName } from '@/lib/format';

const LABELS = ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D', 'Kelas E', 'Kelas F', 'Kelas G', 'Kelas H'];

/** Koordinator: create a class with its whole weekly schedule, assistants and students in one go. */
export default function NewClass() {
  const { state, createClass, enroll, toast } = useStore();
  const me = useMe();
  const now = useNow(60_000);
  const { confirm, dialog } = useConfirm();
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? '');
  const [newCourse, setNewCourse] = useState<{ name: string; code: string } | null>(null);
  const [label, setLabel] = useState('');
  const [labId, setLabId] = useState(state.labs[0]?.id ?? '');
  const [date, setDate] = useState(() => toDateInput(startOfDay(Date.now()) + 7 * DAY));
  const [time, setTime] = useState('08:00');
  const [durationMin, setDurationMin] = useState(120);
  const [meetings, setMeetings] = useState(12);
  const [assistants, setAssistants] = useState<string[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [error, setError] = useState('');

  const usedLabels = useMemo(
    () => new Set(state.classes.filter((c) => c.courseId === courseId && !newCourse).map((c) => c.label)),
    [state.classes, courseId, newCourse],
  );
  const staff = useMemo(() => state.users.filter((u) => u.role === 'ASISTEN'), [state.users]);
  const pupils = useMemo(() => state.users.filter((u) => u.role === 'PRAKTIKAN'), [state.users]);

  if (me.role !== 'SUPERADMIN') {
    return (
      <Screen header={<PageHeader title="Kelas baru" />}>
        <EmptyState icon={ShieldCheck} title="Khusus koordinator lab" />
      </Screen>
    );
  }

  const first = fromDateTimeInput(date, time);
  const last = first + (meetings - 1) * 7 * DAY;
  const end = first + durationMin * MINUTE;
  const courseName = newCourse ? newCourse.name : state.courses.find((c) => c.id === courseId)?.name;
  const labName = state.labs.find((l) => l.id === labId)?.name;
  // Another class already uses this lab at the same weekday and time.
  const clash = state.classes.find((c) => {
    if (c.labId !== labId || c.weekday !== new Date(first).getDay()) return false;
    const [h, m] = c.startTime.split(':').map(Number);
    const [eh, em] = c.endTime.split(':').map(Number);
    const startMin = new Date(first).getHours() * 60 + new Date(first).getMinutes();
    return startMin < eh * 60 + em && startMin + durationMin > h * 60 + m;
  });

  const submit = () => {
    if (newCourse && newCourse.name.trim().length < 3) return setError('Isi nama mata praktikum.');
    if (!newCourse && !courseId) return setError('Pilih mata praktikum.');
    if (label.trim().length < 1) return setError('Isi nama kelas.');
    if (!labId) return setError('Pilih lab.');
    setError('');
    const known = new Set(state.users.map((u) => u.nim));
    const fresh = students.filter((n) => !known.has(n));
    confirm({
      title: 'Buat kelas ini?',
      body: `${meetings} pertemuan langsung dijadwalkan.${assistants.length ? ' Asisten yang dipilih dapat notifikasi.' : ''}`,
      confirmLabel: 'Buat kelas',
      changes: [
        { label: 'Kelas', to: `${courseName} · ${label.trim()}` },
        { label: 'Jadwal', to: `Tiap ${weekdayName(new Date(first).getDay())}, ${time.replace(':', '.')} · ${labName}` },
        { label: 'Periode', to: `${formatDate(first, { short: true })} – ${formatDate(last, { short: true, year: true })}` },
        { label: 'Anggota', to: `${assistants.length} asisten · ${students.length} praktikan${fresh.length ? ` (${fresh.length} NIM baru)` : ''}` },
      ],
      onConfirm: async () => {
        const id = await createClass({
          courseId: newCourse ? undefined : courseId,
          newCourse: newCourse ? { name: newCourse.name.trim(), code: newCourse.code.trim() } : undefined,
          label: label.trim(),
          labId,
          firstDay: startOfDay(first),
          startTime: time,
          durationMin,
          meetings,
          assistantNims: assistants,
          studentNims: students.filter((n) => known.has(n)),
        });
        // Unknown NIMs get placeholder accounts, same as the bulk add on the class page.
        if (fresh.length) await enroll(id, fresh);
        toast({ title: 'Kelas dibuat', body: `${courseName} · ${label.trim()}, ${meetings} pertemuan.`, tone: 'success' });
        router.replace(`/kelas/${id}`);
      },
    });
  };

  return (
    <Screen width="medium" header={<PageHeader title="Kelas baru" subtitle="Jadwal, asisten, dan praktikan sekaligus" />}>
      <Section title="Mata praktikum">
        <View className="flex-row flex-wrap gap-2">
          {state.courses.map((c) => (
            <Chip key={c.id} label={c.name} active={!newCourse && courseId === c.id} onPress={() => {
                setNewCourse(null);
                setCourseId(c.id);
              }} />
          ))}
          <Chip label="Baru" icon={Plus} active={!!newCourse} onPress={() => setNewCourse({ name: '', code: '' })} />
        </View>
        {newCourse && (
          <View className="flex-row gap-2">
            <Input
              className="min-w-0 flex-[2]"
              placeholder="Nama, mis. Grafika Komputer"
              value={newCourse.name}
              onChangeText={(name) => setNewCourse({ ...newCourse, name })}
            />
            <Input
              className="min-w-0 flex-1"
              placeholder="Kode"
              autoCapitalize="characters"
              value={newCourse.code}
              onChangeText={(code) => setNewCourse({ ...newCourse, code })}
            />
          </View>
        )}
      </Section>

      <Section title="Kelas">
        <View className="flex-row flex-wrap gap-2">
          {LABELS.map((l) => (
            <Chip key={l} label={usedLabels.has(l) ? `${l} ✓` : l} active={label === l} onPress={() => setLabel(l)} />
          ))}
        </View>
        <Input placeholder="Atau tulis nama kelas sendiri" value={label} onChangeText={setLabel} />
        {usedLabels.has(label.trim()) && <Text className="text-warning-ink text-xs font-medium">{label.trim()} sudah ada untuk mata praktikum ini.</Text>}
      </Section>

      <Section title="Jadwal mingguan">
        <View className="flex-row gap-3">
          <DateField label="Pertemuan pertama" value={date} onChange={setDate} />
          <View className="w-36">
            <TimeField label="Mulai" value={time} onChange={setTime} />
          </View>
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium">Durasi</Text>
          <View className="flex-row flex-wrap gap-2">
            {[100, 120, 150, 170].map((m) => (
              <Chip key={m} label={`${m} mnt`} active={durationMin === m} onPress={() => setDurationMin(m)} />
            ))}
          </View>
        </View>
        <View className="bg-card flex-row items-center gap-3 rounded-2xl p-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-medium">{meetings} pertemuan</Text>
            <Text className="text-muted-foreground text-xs">Satu per minggu, hari dan jam yang sama</Text>
          </View>
          <Stepper value={meetings} onChange={setMeetings} min={1} max={16} />
        </View>
      </Section>

      <Section title="Lab">
        <View className="flex-row flex-wrap gap-2">
          {state.labs.map((l) => (
            <Chip key={l.id} label={`${l.code} · ${l.name.replace('Lab ', '')}`} active={labId === l.id} onPress={() => setLabId(l.id)} />
          ))}
        </View>
        {clash && (
          <Text className="text-alarm text-xs font-semibold">
            Bentrok: {state.courses.find((c) => c.id === clash.courseId)?.name} · {clash.label} juga di lab ini tiap {weekdayName(clash.weekday)}{' '}
            {clash.startTime}–{clash.endTime}.
          </Text>
        )}
      </Section>

      <Section title={`Asisten · ${assistants.length}`}>
        <PeoplePicker candidates={staff} value={assistants} onChange={setAssistants} placeholder="Cari asisten, Enter untuk tambah" />
      </Section>

      <Section title={`Praktikan · ${students.length}`}>
        <PeoplePicker candidates={pupils} value={students} onChange={setStudents} allowNewNim />
      </Section>

      <Surface className="bg-ink gap-3 p-4">
        <View className="flex-row items-center gap-2">
          <Icon as={CalendarRange} className="text-mustard size-4" />
          <Text className="text-mustard font-mono text-[11px] font-bold uppercase">Ringkasan</Text>
        </View>
        <Text className="text-ink-foreground font-display text-[26px] font-extrabold uppercase leading-7">
          {courseName || 'Mata praktikum'} · {label.trim() || 'Kelas ?'}
        </Text>
        <Text className="text-ink-muted text-sm">
          Tiap {weekdayName(new Date(first).getDay())}, {formatDate(first, { short: true })} – {formatDate(last, { short: true, year: true })} ·{' '}
          {formatTimeRange(first, end)} · {labName}
        </Text>
        <Text className="text-ink-muted text-sm">
          {assistants.length} asisten · {students.length} praktikan · {Math.round((startOfDay(first) - startOfDay(now)) / DAY)} hari lagi
        </Text>
      </Surface>

      {!!error && <Text className="text-destructive text-sm">{error}</Text>}
      <Button size="lg" className="h-14 rounded-2xl" onPress={submit}>
        <Text className="text-base font-bold">Buat kelas · {meetings} pertemuan</Text>
      </Button>
      {dialog}
    </Screen>
  );
}
