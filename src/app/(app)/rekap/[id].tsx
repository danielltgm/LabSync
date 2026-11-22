import { useLocalSearchParams } from 'expo-router';
import { FileSpreadsheet, ShieldAlert, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { Avatar, Chip, EmptyState, RowDivider, RowGroup, StackedMeter, Surface, SearchField } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { ATTENDANCE_STATUS, AttendancePill, Pill, SessionStatusPill, TONE_CLASSES } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { sessionRoster, userByNim, viewSession, type RosterRow } from '@/data/selectors';
import { useStore } from '@/data/store';
import type { AttendanceStatus } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { FAILURE_COPY } from '@/lib/attendance-rules';
import { exportErrorMessage, exportSessionRecap } from '@/lib/export';
import { formatTime, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type Filter = 'all' | AttendanceStatus | 'BELUM';

export default function SessionRecap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, overrideAttendance, toast } = useStore();
  const now = useNow(5000);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<RosterRow | null>(null);
  const { confirm, dialog } = useConfirm();
  const raw = state.sessions.find((s) => s.id === id);
  const roster = useMemo(() => (raw ? sessionRoster(state, raw) : []), [state, raw]);

  if (!raw) {
    return (
      <Screen width="medium" header={<PageHeader title="Rekap" />}>
        <EmptyState icon={Users} title="Sesi tidak ditemukan" />
      </Screen>
    );
  }
  const s = viewSession(state, raw);
  const count = (k: Filter) => (k === 'all' ? roster.length : k === 'BELUM' ? roster.filter((r) => !r.status).length : roster.filter((r) => r.status === k).length);
  const shown = roster.filter((r) => {
    if (filter === 'BELUM' && r.status) return false;
    if (filter !== 'all' && filter !== 'BELUM' && r.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || r.user.name.toLowerCase().includes(q) || r.user.nim.includes(q);
  });
  const attempts = state.attempts.filter((a) => a.sessionId === s.id && !a.ok);

  const exportNow = () =>
    exportSessionRecap(state, s.id)
      .then(() => toast({ title: 'File Excel siap', tone: 'success' }))
      .catch((e) => toast({ title: exportErrorMessage(e), tone: 'danger' }));

  return (
    <Screen width="medium"
      header={
        <PageHeader
          title={`Rekap P${s.meetingNo}`}
          subtitle={`${s.course.name} · ${s.cls.label}`}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="Export Excel" onPress={exportNow} className="active:bg-accent size-10 items-center justify-center rounded-full">
              <Icon as={FileSpreadsheet} className="size-5" />
            </Pressable>
          }
        />
      }
    >
      <Surface className="gap-4 p-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-bold">{s.topic}</Text>
            <Text className="text-muted-foreground text-[13px]">{s.lab.name} · {formatTime(s.startsAt)}–{formatTime(s.endsAt)}</Text>
          </View>
          <SessionStatusPill status={s.status} />
        </View>
        <View className="flex-row gap-2">
          {(['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'] as const).map((k) => (
            <View key={k} className={cn('flex-1 items-center rounded-2xl py-2.5', TONE_CLASSES[ATTENDANCE_STATUS[k].tone].soft)}>
              <Text className={cn('text-xl font-bold', TONE_CLASSES[ATTENDANCE_STATUS[k].tone].ink)}>{count(k)}</Text>
              <Text className={cn('text-[11px] font-semibold', TONE_CLASSES[ATTENDANCE_STATUS[k].tone].ink)}>{ATTENDANCE_STATUS[k].label}</Text>
            </View>
          ))}
        </View>
        <StackedMeter
          parts={[
            { value: count('HADIR'), tone: 'success' },
            { value: count('TERLAMBAT'), tone: 'warning' },
            { value: count('IZIN'), tone: 'info' },
            { value: count('ALPHA'), tone: 'danger' },
            { value: count('BELUM'), tone: 'neutral' },
          ]}
        />
        {s.status === 'DIBUKA' && <Text className="text-muted-foreground text-xs">{count('BELUM')} praktikan belum presensi · diperbarui langsung</Text>}
      </Surface>

      <View className="gap-3">
        <SearchField placeholder="Cari nama atau NIM" value={query} onChangeText={setQuery} />
        <View className="flex-row flex-wrap gap-2">
          {([
            ['all', 'Semua'],
            ['BELUM', 'Belum'],
            ['HADIR', 'Hadir'],
            ['TERLAMBAT', 'Terlambat'],
            ['IZIN', 'Izin'],
            ['ALPHA', 'Alpha'],
          ] as [Filter, string][]).map(([k, label]) => (
            <Chip key={k} label={`${label} ${count(k)}`} active={filter === k} onPress={() => setFilter(k)} />
          ))}
        </View>
      </View>

      <RowGroup>
        {shown.length === 0 && <EmptyState icon={Users} title="Tidak ada yang cocok" />}
        {shown.map((r, i) => (
          <View key={r.user.nim}>
            {i > 0 && <RowDivider />}
            <Pressable accessibilityRole="button" onPress={() => setEditing(r)} className="active:bg-accent flex-row items-center gap-3 px-4 py-3">
              <Avatar name={r.user.name} size="sm" />
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-medium" numberOfLines={1}>{r.user.name}</Text>
                <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                  {r.user.nim}
                  {r.record ? ` · ${formatTime(r.record.checkedInAt)} · ${r.record.method === 'MANUAL' ? 'manual' : r.record.method === 'QR' ? 'QR' : 'lokasi'}` : ''}
                  {r.record?.distanceM !== undefined ? ` · ${r.record.distanceM} m` : ''}
                  {!r.record && r.leave ? ` · izin ${r.leave.decision === 'pending' ? 'menunggu' : r.leave.decision === 'approved' ? 'disetujui' : 'ditolak'}` : ''}
                </Text>
              </View>
              {r.status ? <AttendancePill status={r.status} /> : <Pill label="Belum" />}
            </Pressable>
          </View>
        ))}
      </RowGroup>

      {attempts.length > 0 && (
        <Section title="Ditolak sistem">
          <RowGroup>
            {attempts.map((a, i) => {
              const u = userByNim(state, a.nim);
              return (
                <View key={a.id}>
                  {i > 0 && <RowDivider />}
                  <View className="flex-row items-center gap-3 px-4 py-3">
                    <View className="bg-danger-soft size-8 items-center justify-center rounded-lg">
                      <Icon as={ShieldAlert} className="text-danger-ink size-4" />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-medium" numberOfLines={1}>{u?.name ?? a.nim}</Text>
                      <Text className="text-muted-foreground text-xs">
                        {a.failure ? FAILURE_COPY[a.failure].title : ''}
                        {a.distanceM !== undefined ? ` · ${Math.round(a.distanceM)} m` : ''}
                        {a.accuracyM !== undefined ? ` · ±${Math.round(a.accuracyM)} m` : ''} · {relativeTime(a.at, now)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </RowGroup>
        </Section>
      )}

      <Button variant="outline" className="h-12 rounded-2xl" onPress={exportNow}>
        <Icon as={FileSpreadsheet} className="size-4" />
        <Text>Export ke Excel (.xlsx)</Text>
      </Button>

      <OverrideDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSave={(status, note) => {
          if (!editing) return;
          const row = editing;
          setEditing(null);
          confirm({
            title: 'Ubah status presensi?',
            body: `Perubahan manual tercatat atas namamu dan terlihat oleh ${row.user.name.split(' ')[0]}.`,
            confirmLabel: 'Ubah status',
            changes: [
              { label: row.user.name, from: row.status ? ATTENDANCE_STATUS[row.status].label : 'Belum presensi', to: status ? ATTENDANCE_STATUS[status].label : 'Dikosongkan' },
              ...(note ? [{ label: 'Alasan', to: note }] : []),
            ],
            onConfirm: () => {
              overrideAttendance(s.id, row.user.nim, status, note);
              toast({ title: 'Status diperbarui', body: `${row.user.name}: ${status ? ATTENDANCE_STATUS[status].label : 'dikosongkan'}`, tone: 'success' });
            },
          });
        }}
      />
      {dialog}
    </Screen>
  );
}

function OverrideDialog({ row, onClose, onSave }: { row: RosterRow | null; onClose: () => void; onSave: (s: AttendanceStatus | null, note?: string) => void }) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [note, setNote] = useState('');
  const [prev, setPrev] = useState<RosterRow | null>(null);
  if (row !== prev) {
    setPrev(row);
    setStatus(row?.status ?? null);
    setNote(row?.record?.note ?? '');
  }
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{row?.user.name}</DialogTitle>
          <DialogDescription>Ubah status secara manual, misalnya HP praktikan rusak. Perubahan tercatat atas namamu.</DialogDescription>
        </DialogHeader>
        <View className="flex-row flex-wrap gap-2">
          {(['HADIR', 'TERLAMBAT', 'IZIN', 'ALPHA'] as const).map((k) => (
            <Chip key={k} label={ATTENDANCE_STATUS[k].label} active={status === k} onPress={() => setStatus(k)} />
          ))}
        </View>
        <Input placeholder="Alasan (wajib untuk perubahan manual)" value={note} onChangeText={setNote} className="h-11 rounded-xl" />
        <DialogFooter>
          <Button className="h-11 rounded-xl" disabled={!status || status === row?.status || note.trim().length < 3} onPress={() => onSave(status, note.trim())}>
            <Text>Lanjut</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
