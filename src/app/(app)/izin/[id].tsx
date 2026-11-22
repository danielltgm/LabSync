import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Check, CircleCheck, CircleX, Clock, FileText, Paperclip, RotateCcw, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { Avatar, EmptyState, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section, goBack } from '@/components/app/screen';
import { AiCategoryPill, LEAVE_STATUS, Pill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { studentStats, userByNim, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import { useNow } from '@/hooks/use-now';
import { formatDateTime, formatTimeRange, relativeDay } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function LeaveDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reviewLeave, toast } = useStore();
  const me = useMe();
  const [note, setNote] = useState('');
  const [revising, setRevising] = useState(false);
  const { confirm, dialog } = useConfirm();
  const now = useNow(60_000);
  const leave = state.leaves.find((l) => l.id === id);

  if (!leave) {
    return (
      <Screen header={<PageHeader title="Izin" />}>
        <EmptyState icon={FileText} title="Izin tidak ditemukan" />
      </Screen>
    );
  }
  const session = viewSession(state, state.sessions.find((s) => s.id === leave.sessionId)!);
  const student = userByNim(state, leave.nim);
  const reviewer = leave.reviewedBy ? userByNim(state, leave.reviewedBy) : undefined;
  const isStaff = me.role !== 'PRAKTIKAN';
  const canReview = isStaff && (leave.decision === 'pending' || revising);
  const studentRate = studentStats(state, leave.nim).perClass.find((p) => p.cls.id === session.classId)?.tally;
  const pastLeaves = state.leaves.filter((l) => l.nim === leave.nim && l.id !== leave.id && state.sessions.find((s) => s.id === l.sessionId)?.classId === session.classId);

  const label = (d: 'pending' | 'approved' | 'rejected') => (d === 'approved' ? 'Disetujui' : d === 'rejected' ? 'Ditolak' : 'Menunggu');
  const decide = (decision: 'approved' | 'rejected') => {
    const changed = leave.decision !== 'pending';
    const attendanceNote =
      session.status === 'SELESAI' ? ` Presensi P${session.meetingNo} ikut jadi ${decision === 'approved' ? 'Izin' : 'Alpha'}.` : '';
    confirm({
      title: decision === 'approved' ? 'Setujui izin ini?' : 'Tolak izin ini?',
      body: `${student?.name} langsung dapat notifikasi.${attendanceNote}`,
      confirmLabel: decision === 'approved' ? 'Setujui' : 'Tolak',
      destructive: decision === 'rejected',
      changes: [
        { label: 'Keputusan', from: label(leave.decision), to: label(decision) },
        ...(note.trim() ? [{ label: 'Catatan', to: note.trim() }] : []),
      ],
      onConfirm: () => {
        reviewLeave(leave.id, decision, note.trim() || undefined);
        toast({
          title: changed ? 'Keputusan diubah' : decision === 'approved' ? 'Izin disetujui' : 'Izin ditolak',
          body: `Notifikasi terkirim ke ${student?.name}.`,
          tone: 'success',
        });
        goBack();
      },
    });
  };

  const steps: { label: string; at?: number; done: boolean; bad?: boolean }[] = [
    { label: 'Diajukan', at: leave.submittedAt, done: true },
    // The AI only labels the reason for the assistant; the decision below is always a person's.
    { label: leave.category ? `Dikategorikan AI · ${leave.category}` : 'Dikategorikan AI', at: leave.category ? leave.submittedAt + 4000 : undefined, done: !!leave.category },
    ...(leave.decision === 'pending' ? [{ label: 'Ditinjau asisten', at: undefined, done: false, bad: false }] : []),
    ...(leave.decision !== 'pending'
      ? [{ label: leave.decision === 'rejected' ? 'Ditolak asisten' : 'Disetujui asisten', at: leave.reviewedAt, done: true, bad: leave.decision === 'rejected' }]
      : []),
  ];

  return (
    <Screen header={<PageHeader title="Detail izin" subtitle={`${session.course.name} · P${session.meetingNo}`} />}>
      <Surface className="gap-4 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar name={student?.name ?? '?'} />
          <View className="min-w-0 flex-1">
            <Text className="font-semibold">{student?.name}</Text>
            <Text className="text-muted-foreground text-xs">{leave.nim}</Text>
          </View>
          <Pill tone={LEAVE_STATUS[leave.decision].tone} label={LEAVE_STATUS[leave.decision].label} />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <AiCategoryPill category={leave.category} />
        </View>
        <Text className="text-[15px] leading-6">{leave.reason}</Text>
        {leave.attachmentName && (
          <Pressable className="bg-muted flex-row items-center gap-2 rounded-xl p-3">
            <Icon as={Paperclip} className="text-muted-foreground size-4" />
            <Text className="min-w-0 flex-1 text-sm font-medium">{leave.attachmentName}</Text>
            <Text className="text-primary text-sm font-semibold">Buka</Text>
          </Pressable>
        )}
      </Surface>

      <Pressable onPress={() => router.push(`/sesi/${session.id}`)} className="bg-card border-border flex-row items-center gap-3 rounded-2xl border p-3.5 active:opacity-90">
        <Icon as={CalendarDays} className="text-muted-foreground size-5" />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold">P{session.meetingNo} · {session.topic}</Text>
          <Text className="text-muted-foreground text-xs">{relativeDay(session.startsAt, now)}, {formatTimeRange(session.startsAt, session.endsAt)} · {session.lab.name}</Text>
        </View>
      </Pressable>

      <Section title="Status">
        <Surface className="gap-0 p-4">
          {steps.map((st, i) => (
            <View key={st.label} className="flex-row gap-3">
              <View className="items-center">
                <View className={cn('size-6 items-center justify-center rounded-full', st.done ? (st.bad ? 'bg-destructive' : 'bg-success') : 'bg-muted')}>
                  <Icon as={st.done ? (st.bad ? X : Check) : Clock} className={cn('size-3.5', st.done ? 'text-white' : 'text-muted-foreground')} />
                </View>
                {i < steps.length - 1 && <View className={cn('my-1 w-0.5 flex-1', st.done ? 'bg-success' : 'bg-border')} style={{ minHeight: 18 }} />}
              </View>
              <View className="min-w-0 flex-1 pb-4">
                <Text className={cn('text-sm font-semibold', !st.done && 'text-muted-foreground')}>{st.label}</Text>
                <Text className="text-muted-foreground text-xs">{st.at ? formatDateTime(st.at) : 'Menunggu'}</Text>
              </View>
            </View>
          ))}
          {leave.decision !== 'pending' && (
            <View className="bg-muted gap-1 rounded-xl p-3">
              <Text className="text-xs font-semibold">{reviewer?.name ?? 'Asisten'}</Text>
              <Text className="text-muted-foreground text-[13px]">{leave.reviewNote ?? 'Tanpa catatan.'}</Text>
            </View>
          )}
          {isStaff && leave.decision !== 'pending' && !revising && (
            <Button variant="outline" className="mt-3 h-11 rounded-2xl" onPress={() => setRevising(true)}>
              <Icon as={RotateCcw} className="size-4" />
              <Text>Ubah keputusan</Text>
            </Button>
          )}
        </Surface>
      </Section>

      {canReview && (
        <Section title="Keputusan">
          <Surface className="gap-3 p-4">
            {studentRate && (
              <View className="flex-row gap-2">
                <MiniStat label="Kehadiran kelas" value={`${studentRate.rate}%`} />
                <MiniStat label="Izin sebelumnya" value={String(pastLeaves.length)} />
                <MiniStat label="Alpha" value={String(studentRate.ALPHA)} />
              </View>
            )}
            <Textarea placeholder="Catatan untuk praktikan (opsional)" value={note} onChangeText={setNote} className="min-h-20 rounded-2xl" />
            <View className="flex-row gap-2">
              <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={leave.decision === 'rejected'} onPress={() => decide('rejected')}>
                <Icon as={CircleX} className="text-destructive size-4" />
                <Text className="text-destructive">Tolak</Text>
              </Button>
              <Button className="bg-success h-12 flex-1 rounded-2xl" disabled={leave.decision === 'approved'} onPress={() => decide('approved')}>
                <Icon as={CircleCheck} className="size-4 text-white" />
                <Text className="text-white">Setujui</Text>
              </Button>
            </View>
          </Surface>
        </Section>
      )}
      {dialog}
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-muted flex-1 items-center rounded-xl py-2">
      <Text className="text-base font-bold">{value}</Text>
      <Text className="text-muted-foreground text-[11px]">{label}</Text>
    </View>
  );
}
