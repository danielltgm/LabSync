import { router } from 'expo-router';
import { ChevronRight, CircleAlert, Clock, MapPin, Plus, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { gradeTone } from '@/components/app/grade-book';
import { Avatar, Chip, EmptyState, Grid, Meter } from '@/components/app/primitives';
import { Screen, TabTitle } from '@/components/app/screen';
import { Pill } from '@/components/app/status';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { classMatrix, gradeBook, letterGrade, studentStats, userByNim } from '@/data/selectors';
import { useMe, useMyClasses, useStore } from '@/data/store';
import type { ClassGroup } from '@/data/types';
import { weekdayName } from '@/lib/format';

export default function ClassList() {
  const { state } = useStore();
  const me = useMe();
  const classes = useMyClasses();
  const isAdmin = me.role === 'SUPERADMIN';
  const isStudent = me.role === 'PRAKTIKAN';
  const [course, setCourse] = useState<string>('all');
  const shown = classes.filter((c) => course === 'all' || c.courseId === course);
  const courses = useMemo(() => state.courses.filter((c) => classes.some((k) => k.courseId === c.id)), [state.courses, classes]);
  const unstaffed = classes.filter((c) => c.assistantNims.length === 0).length;

  return (
    <Screen tabs>
      <TabTitle
        eyebrow={isAdmin ? `${classes.length} kelas · ${courses.length} mata praktikum` : `${classes.length} kelas praktikum`}
        title="Kelas"
        right={
          isAdmin ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/kelas/baru')}
              className="bg-primary h-10 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-90"
            >
              <Icon as={Plus} className="text-primary-foreground size-4" strokeWidth={2.6} />
              <Text className="text-primary-foreground text-sm font-semibold">Kelas baru</Text>
            </Pressable>
          ) : undefined
        }
      />
      {isAdmin && unstaffed > 0 && (
        <View className="bg-warning-soft flex-row items-center gap-2 rounded-2xl p-3">
          <Icon as={CircleAlert} className="text-warning-ink size-4" />
          <Text className="text-warning-ink min-w-0 flex-1 text-sm font-medium">{unstaffed} kelas belum punya asisten.</Text>
        </View>
      )}
      {isAdmin && courses.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 grow-0" contentContainerClassName="gap-2 px-4">
          <Chip label="Semua" active={course === 'all'} onPress={() => setCourse('all')} />
          {courses.map((c) => (
            <Chip key={c.id} label={c.name} active={course === c.id} onPress={() => setCourse(c.id)} />
          ))}
        </ScrollView>
      )}
      {classes.length === 0 && (
        <EmptyState
          icon={Users}
          title="Belum ada kelas"
          body={isAdmin ? 'Buat kelas pertama dengan tombol Kelas baru.' : 'Koordinator lab akan menambahkanmu ke kelas.'}
        />
      )}
      <Grid gap="gap-4">
        {shown.map((cls) => (isStudent ? <StudentCard key={cls.id} cls={cls} /> : <StaffCard key={cls.id} cls={cls} showStaff={isAdmin} />))}
      </Grid>
    </Screen>
  );
}

function CardShell({ cls, right, children }: { cls: ClassGroup; right?: React.ReactNode; children: React.ReactNode }) {
  const { state } = useStore();
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === cls.labId);
  const live = state.sessions.some((s) => s.classId === cls.id && s.status === 'DIBUKA');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/kelas/${cls.id}`)}
      className="bg-card border-border active:bg-accent flex-1 gap-4 rounded-3xl border p-4"
    >
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-muted-foreground text-xs font-medium">
            {course.code} · {course.semester}
          </Text>
          <Text className="text-[17px] font-bold leading-6">{course.name}</Text>
          <Text className="text-sm font-medium">{cls.label}</Text>
        </View>
        {live ? <Pill tone="success" label="Sesi dibuka" dot /> : (right ?? <Icon as={ChevronRight} className="text-muted-foreground size-5" />)}
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        <Meta icon={Clock} label={`${weekdayName(cls.weekday)} ${cls.startTime}–${cls.endTime}`} />
        <Meta icon={MapPin} label={lab?.name ?? '-'} />
        <Meta icon={Users} label={`${cls.studentNims.length} praktikan`} />
      </View>
      {children}
    </Pressable>
  );
}

function StaffCard({ cls, showStaff }: { cls: ClassGroup; showStaff: boolean }) {
  const { state } = useStore();
  const { rows, sessions } = classMatrix(state, cls.id);
  const done = sessions.filter((s) => s.status === 'SELESAI').length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.tally.rate, 0) / rows.length) : 0;
  const risk = rows.filter((r) => r.tally.rate < 75).length;
  const assistants = cls.assistantNims.map((n) => userByNim(state, n)).filter(Boolean);
  return (
    <CardShell cls={cls}>
      <View className="flex-row gap-3">
        <Progress label="Pertemuan" value={`${done}/${sessions.length}`} pct={(done / Math.max(1, sessions.length)) * 100} />
        <Progress label="Rata-rata hadir" value={`${avg}%`} pct={avg} tone={avg < 80 ? 'warning' : 'success'} />
      </View>
      {showStaff &&
        (assistants.length ? (
          <View className="flex-row items-center gap-2">
            <View className="flex-row">
              {assistants.map((a, i) => (
                <Avatar key={a!.nim} name={a!.name} size="sm" className={i > 0 ? '-ml-2 border-card border-2' : 'border-card border-2'} />
              ))}
            </View>
            <Text className="text-muted-foreground min-w-0 flex-1 text-[13px]" numberOfLines={1}>
              {assistants.map((a) => a!.name.split(' ')[0]).join(', ')}
            </Text>
          </View>
        ) : (
          <Text className="text-warning-ink text-xs font-semibold">Belum ada asisten · ketuk untuk menugaskan</Text>
        ))}
      {risk > 0 && <Text className="text-warning-ink text-xs font-medium">{risk} praktikan di bawah 75%</Text>}
    </CardShell>
  );
}

function StudentCard({ cls }: { cls: ClassGroup }) {
  const { state } = useStore();
  const me = useMe();
  const stat = studentStats(state, me.nim).perClass.find((p) => p.cls.id === cls.id);
  const final = gradeBook(state, cls.id).rows.find((r) => r.user.nim === me.nim)?.final;
  const total = state.sessions.filter((s) => s.classId === cls.id).length;
  const rate = stat?.tally.rate ?? 100;
  return (
    <CardShell
      cls={cls}
      right={
        final !== undefined ? (
          <View className="items-end">
            <Text className={`font-display text-2xl font-extrabold leading-7 ${gradeTone(final)}`}>{letterGrade(final)}</Text>
            <Text className="text-muted-foreground font-mono text-[10px]">nilai {final}</Text>
          </View>
        ) : undefined
      }
    >
      <View className="flex-row gap-3">
        <Progress label="Pertemuan" value={`${stat?.finished ?? 0}/${total}`} pct={((stat?.finished ?? 0) / Math.max(1, total)) * 100} />
        <Progress label="Kehadiranku" value={`${rate}%`} pct={rate} tone={rate < 75 ? 'danger' : rate < 80 ? 'warning' : 'success'} />
      </View>
      {rate < 80 && <Text className="text-warning-ink text-xs font-medium">Kehadiran di bawah 80%, jangan sampai alpha lagi.</Text>}
    </CardShell>
  );
}

function Progress({ label, value, pct, tone }: { label: string; value: string; pct: number; tone?: 'warning' | 'success' | 'danger' }) {
  return (
    <View className="flex-1 gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <Text className="text-xs font-semibold">{value}</Text>
      </View>
      <Meter value={pct} tone={tone} />
    </View>
  );
}

function Meta({ icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon as={icon} className="text-muted-foreground size-3.5" />
      <Text className="text-muted-foreground text-[13px]">{label}</Text>
    </View>
  );
}
