import type { LucideIcon } from 'lucide-react-native';
import { ArrowRight, BookOpen, Building, CalendarDays, FileText, ListChecks, Lock, PencilLine, ShieldAlert, ShieldCheck, UserCheck, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { IconTile, Surface } from '@/components/app/primitives';
import type { Tone } from '@/components/app/status';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { verifyLog } from '@/data/audit';
import { userByNim } from '@/data/selectors';
import { useStore } from '@/data/store';
import type { AuditEntry, LogKind, Role } from '@/data/types';
import { formatDate, formatTime, isSameDay, startOfDay } from '@/lib/format';
import { cn } from '@/lib/utils';

export const LOG_KIND: Record<LogKind, { label: string; icon: LucideIcon; tone: Tone }> = {
  NILAI: { label: 'Nilai', icon: PencilLine, tone: 'brand' },
  PRESENSI: { label: 'Presensi', icon: UserCheck, tone: 'success' },
  IZIN: { label: 'Izin', icon: FileText, tone: 'info' },
  PERTEMUAN: { label: 'Pertemuan', icon: CalendarDays, tone: 'warning' },
  ANGGOTA: { label: 'Anggota', icon: Users, tone: 'neutral' },
  PERAN: { label: 'Peran', icon: ShieldCheck, tone: 'danger' },
  LAB: { label: 'Lab', icon: Building, tone: 'neutral' },
  KELAS: { label: 'Kelas', icon: BookOpen, tone: 'brand' },
  KUIS: { label: 'Kuis', icon: ListChecks, tone: 'info' },
};

export const ROLE_LABEL: Record<Role, string> = { PRAKTIKAN: 'Praktikan', ASPRAK: 'Asprak', ASLAB: 'Aslab' };

/** Integrity of the whole chain (any edit or removal anywhere breaks it). */
export function LogIntegrity() {
  const { state } = useStore();
  const broken = useMemo(() => verifyLog(state.log), [state.log]);
  const ok = broken === -1;
  return (
    <View className={cn('flex-row items-center gap-2.5 rounded-2xl p-3', ok ? 'bg-success-soft' : 'bg-danger-soft')}>
      <Icon as={ok ? Lock : ShieldAlert} className={cn('size-4', ok ? 'text-success-ink' : 'text-danger-ink')} strokeWidth={2.4} />
      <Text className={cn('min-w-0 flex-1 text-xs font-medium leading-5', ok ? 'text-success-ink' : 'text-danger-ink')}>
        {ok
          ? `Log terkunci: ${state.log.length} catatan, berantai dan tidak bisa diubah atau dihapus.`
          : `Rantai log rusak mulai catatan #${broken + 1}. Ada catatan yang diubah atau dihapus.`}
      </Text>
    </View>
  );
}

/** Newest first, grouped by day. */
export function AuditList({ entries, showClass, empty }: { entries: AuditEntry[]; showClass?: boolean; empty?: string }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => b.at - a.at), [entries]);
  const [limit, setLimit] = useState(40);
  const shown = sorted.slice(0, limit);
  if (!sorted.length) return <Text className="text-muted-foreground py-6 text-center text-sm">{empty ?? 'Belum ada perubahan.'}</Text>;
  return (
    <View className="gap-4">
      {shown.map((e, i) => {
        const newDay = i === 0 || !isSameDay(e.at, shown[i - 1].at);
        return (
          <View key={e.id} className="gap-2">
            {newDay && (
              <Text className="text-muted-foreground font-mono text-[11px] font-bold uppercase">
                {formatDate(startOfDay(e.at), { weekday: true, year: true })}
              </Text>
            )}
            <AuditRow entry={e} showClass={showClass} />
          </View>
        );
      })}
      {sorted.length > limit && (
        <Pressable accessibilityRole="button" onPress={() => setLimit((l) => l + 40)} className="bg-muted active:bg-accent items-center rounded-2xl py-3">
          <Text className="text-sm font-semibold">Tampilkan {Math.min(40, sorted.length - limit)} lagi</Text>
        </Pressable>
      )}
    </View>
  );
}

function AuditRow({ entry, showClass }: { entry: AuditEntry; showClass?: boolean }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const meta = LOG_KIND[entry.kind];
  const actor = userByNim(state, entry.actor);
  const cls = entry.classId ? state.classes.find((c) => c.id === entry.classId) : undefined;
  const course = cls ? state.courses.find((c) => c.id === cls.courseId) : undefined;
  const changes = entry.changes ?? [];
  const visible = open ? changes : changes.slice(0, 2);
  return (
    <Surface className="gap-2.5 p-3.5">
      <View className="flex-row items-start gap-3">
        <IconTile icon={meta.icon} tone={meta.tone} size="sm" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold leading-5">{entry.summary}</Text>
          <Text className="text-muted-foreground text-[13px]" numberOfLines={2}>
            {entry.target}
            {showClass && course ? ` · ${course.name} ${cls!.label}` : ''}
          </Text>
        </View>
        <Text className="text-muted-foreground font-mono text-[11px]">{formatTime(entry.at)}</Text>
      </View>
      {visible.length > 0 && (
        <View className="bg-muted gap-1.5 rounded-xl p-2.5">
          {visible.map((c, i) => (
            <View key={i} className="flex-row flex-wrap items-center gap-x-1.5">
              <Text className="text-muted-foreground text-xs">{c.label}:</Text>
              {c.from !== undefined && (
                <>
                  <Text className="text-muted-foreground text-xs line-through">{c.from}</Text>
                  <Icon as={ArrowRight} className="text-muted-foreground size-3" />
                </>
              )}
              <Text className="text-xs font-bold">{c.to}</Text>
            </View>
          ))}
          {changes.length > 2 && (
            <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} hitSlop={8}>
              <Text className="text-primary text-xs font-semibold">{open ? 'Ringkas' : `+${changes.length - 2} perubahan lain`}</Text>
            </Pressable>
          )}
        </View>
      )}
      {!!entry.reason && <Text className="text-[13px] italic leading-5">“{entry.reason}”</Text>}
      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-xs" numberOfLines={1}>
          <Text className="text-xs font-semibold">{actor?.name ?? entry.actor}</Text>
          <Text className="text-muted-foreground text-xs"> · {ROLE_LABEL[entry.actorRole]}</Text>
        </Text>
        <Text className="text-muted-foreground font-mono text-[10px]">#{entry.hash.slice(0, 8)}</Text>
      </View>
    </Surface>
  );
}
