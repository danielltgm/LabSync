import { BookOpen, CalendarDays, Clock, MapPin, Share2, UserCog } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { ShareSheet, type ShareCardData } from '@/components/app/share-sheet';
import { plainText } from '@/components/app/rich-text';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { viewSession } from '@/data/selectors';
import { useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { formatDate, formatTimeRange, weekdayName } from '@/lib/format';
import { appLink, classShareText, sessionShareText } from '@/lib/share';
import { cn } from '@/lib/utils';

/** Round "Bagikan" pill for page headers. */
export function ShareButton({ onPress, label = 'Bagikan', className }: { onPress: () => void; label?: string; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn('bg-card border-border active:bg-accent h-10 flex-row items-center gap-1.5 rounded-full border px-3.5', className)}
    >
      <Icon as={Share2} className="size-4" strokeWidth={2.4} />
      <Text className="text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}

export function SessionShareSheet({ sessionId, open, onOpenChange, title }: { sessionId: string; open: boolean; onOpenChange: (o: boolean) => void; title?: string }) {
  const { state } = useStore();
  const raw = state.sessions.find((s) => s.id === sessionId);
  if (!raw) return null;
  const s = viewSession(state, raw);
  const cancelled = s.status === 'DIBATALKAN';
  const note = plainText(s.description);
  const card: ShareCardData = {
    eyebrow: `${s.course.code} · ${s.cls.label}`,
    kicker: `${s.course.name} · Pertemuan ${s.meetingNo}${cancelled ? ' · DIBATALKAN' : ''}`,
    title: s.topic,
    rows: [
      { icon: CalendarDays, text: formatDate(s.startsAt, { weekday: true, year: true }) },
      { icon: Clock, text: formatTimeRange(s.startsAt, s.endsAt) },
      { icon: MapPin, text: `${s.lab.name} · ${s.lab.building}, ${s.lab.floor}` },
    ],
    chips: s.materials.length ? s.materials.slice(0, 3).map((m) => m.label) : undefined,
    note: s.changeNote && s.status !== 'SELESAI' ? s.changeNote : note && note !== 'Belum ada keterangan.' ? note : undefined,
    mood: cancelled ? 'oops' : s.status === 'DIBUKA' ? 'scan' : 'hello',
    accent: cancelled || s.changeNote ? 'coral' : 'violet',
  };
  return (
    // Remount per opening so an edited message from last time doesn't linger.
    <ShareSheet
      key={open ? 'open' : 'closed'}
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? 'Bagikan pertemuan'}
      card={card}
      text={sessionShareText(state, raw, 'wa')}
      short={sessionShareText(state, raw, 'short')}
      link={appLink(`/sesi/${raw.id}`)}
      fileName={`${s.course.name} ${s.cls.label} P${s.meetingNo}`}
    />
  );
}

export function ClassShareSheet({ classId, open, onOpenChange }: { classId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state } = useStore();
  const now = useNow(60_000);
  const cls = state.classes.find((c) => c.id === classId);
  if (!cls) return null;
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === cls.labId);
  const next = state.sessions
    .filter((s) => s.classId === cls.id && s.endsAt >= now && s.status !== 'DIBATALKAN')
    .sort((a, b) => a.startsAt - b.startsAt)[0];
  const assistants = cls.assistantNims.map((n) => state.users.find((u) => u.nim === n)?.name.split(' ')[0]).filter(Boolean);
  const card: ShareCardData = {
    eyebrow: course.semester,
    kicker: `${course.code} · ${cls.label}`,
    title: course.name,
    rows: [
      { icon: CalendarDays, text: `Tiap ${weekdayName(cls.weekday)}, ${cls.startTime}–${cls.endTime}` },
      { icon: MapPin, text: lab ? `${lab.name} · ${lab.building}, ${lab.floor}` : '-' },
      ...(assistants.length ? [{ icon: UserCog, text: `Asisten: ${assistants.join(', ')}` }] : []),
      ...(next ? [{ icon: BookOpen, text: `Berikutnya P${next.meetingNo}: ${next.topic} (${formatDate(next.startsAt, { weekday: true, short: true })})` }] : []),
    ],
    mood: 'reading',
  };
  return (
    // Remount per opening so an edited message from last time doesn't linger.
    <ShareSheet
      key={open ? 'open' : 'closed'}
      open={open}
      onOpenChange={onOpenChange}
      title="Bagikan kelas"
      card={card}
      text={classShareText(state, cls, 'wa', now)}
      short={classShareText(state, cls, 'short', now)}
      link={appLink(`/kelas/${cls.id}`)}
      fileName={`${course.name} ${cls.label}`}
    />
  );
}
