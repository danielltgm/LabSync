import { router, useLocalSearchParams } from 'expo-router';
import { CalendarPlus, FileSpreadsheet, Phone, Share2, Trash, UserPlus, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AuditList, LogIntegrity } from '@/components/app/audit-list';
import { ClassLinksCard, ClassScheduleCard } from '@/components/app/class-info';
import { useConfirm } from '@/components/app/confirm';
import { ClassShareSheet, ShareButton } from '@/components/app/share-buttons';
import { GradeBook, gradeTone } from '@/components/app/grade-book';
import { PeoplePicker } from '@/components/app/pickers';
import { Avatar, Columns, EmptyState, Meter, RowDivider, RowGroup, SearchField, Segmented, StatTile, Surface } from '@/components/app/primitives';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { ATTENDANCE_STATUS, AttendancePill, Pill, SessionStatusPill, TONE_CLASSES } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attendanceFor, classMatrix, gradeBook, gradeKey, letterGrade, sessionRoster, studentStats, userByNim } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import type { ClassGroup, User } from '@/data/types';
import { exportClassRecap, exportErrorMessage } from '@/lib/export';
import { formatDate, formatTime, weekdayName } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tab = 'pertemuan' | 'anggota' | 'matriks' | 'nilai' | 'riwayat';

export default function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const me = useMe();
  const cls = state.classes.find((c) => c.id === id);

  if (!cls) {
    return (
      <Screen width="wide" header={<PageHeader title="Kelas" />}>
        <EmptyState icon={Users} title="Kelas tidak ditemukan" />
      </Screen>
    );
  }
  return me.role === 'PRAKTIKAN' ? <StudentClass cls={cls} /> : <StaffClass cls={cls} />;
}

function classSubtitle(cls: ClassGroup, labName?: string) {
  return `${cls.label} · ${weekdayName(cls.weekday)} ${cls.startTime} · ${labName ?? ''}`;
}

/* ------------------------------------------------------------------ Staff */

function StaffClass({ cls }: { cls: ClassGroup }) {
  const { state, enroll, unenroll, setClassAssistant, toast } = useStore();
  const me = useMe();
  const isAdmin = me.role === 'SUPERADMIN';
  const [tab, setTab] = useState<Tab>('pertemuan');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<'praktikan' | 'asisten' | null>(null);
  const [sharing, setSharing] = useState(false);
  const { confirm, dialog } = useConfirm();
  const matrix = useMemo(() => classMatrix(state, cls.id), [state, cls.id]);
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === cls.labId);
  const { sessions, rows } = matrix;
  const done = sessions.filter((s) => s.status === 'SELESAI').length;
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.tally.rate, 0) / rows.length) : 0;
  const filtered = rows.filter((r) => !query || r.user.name.toLowerCase().includes(query.toLowerCase()) || r.user.nim.includes(query));
  const assistants = cls.assistantNims.map((n) => userByNim(state, n)).filter((u): u is User => !!u);

  const exportNow = () =>
    exportClassRecap(state, cls.id)
      .then(() => toast({ title: 'Rekap Excel siap', body: '3 sheet: Rekap, Detail presensi, Izin.', tone: 'success' }))
      .catch((e) => toast({ title: exportErrorMessage(e), tone: 'danger' }));

  const removeStudent = (u: User) =>
    confirm({
      title: 'Keluarkan dari kelas?',
      body: `${u.name} tidak bisa presensi di kelas ini lagi. Riwayat presensi dan nilainya tetap tersimpan.`,
      confirmLabel: 'Keluarkan',
      destructive: true,
      changes: [{ label: `${course.name} · ${cls.label}`, from: u.name, to: 'Dikeluarkan' }],
      onConfirm: () => unenroll(cls.id, u.nim),
    });

  const removeAssistant = (u: User) =>
    confirm({
      title: 'Lepas asisten?',
      body: `${u.name} tidak lagi bisa membuka sesi atau mengubah presensi kelas ini.`,
      confirmLabel: 'Lepas',
      destructive: true,
      changes: [{ label: `${course.name} · ${cls.label}`, from: u.name, to: 'Dilepas' }],
      onConfirm: () => setClassAssistant(cls.id, u.nim, false),
    });

  return (
    <Screen
      width="wide"
      header={
        <PageHeader
          title={course.name}
          subtitle={classSubtitle(cls, lab?.name)}
          right={
            <View className="flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Bagikan kelas"
                onPress={() => setSharing(true)}
                className="active:bg-accent size-10 items-center justify-center rounded-full"
              >
                <Icon as={Share2} className="size-5" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export Excel"
                onPress={exportNow}
                className="active:bg-accent size-10 items-center justify-center rounded-full"
              >
                <Icon as={FileSpreadsheet} className="size-5" />
              </Pressable>
            </View>
          }
        />
      }
    >
      <View className="flex-row gap-3">
        <StatTile label="Praktikan" value={cls.studentNims.length} hint={`${assistants.length} asisten`} />
        <StatTile label="Pertemuan" value={`${done}/${sessions.length}`} />
        <StatTile label="Rata-rata" value={rows.length ? `${avg}%` : '–'} tone={rows.length && avg < 80 ? 'warning' : 'success'} />
      </View>

      {/* Schedule and class links side by side on wide screens, stacked on phones. */}
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[300px] flex-1">
          <ClassScheduleCard cls={cls} />
        </View>
        <View className="min-w-[300px] flex-1">
          <ClassLinksCard cls={cls} canEdit={true} />
        </View>
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pertemuan', label: 'Pertemuan' },
          { value: 'anggota', label: 'Anggota' },
          { value: 'matriks', label: 'Matriks' },
          { value: 'nilai', label: 'Nilai' },
          { value: 'riwayat', label: 'Riwayat' },
        ]}
      />

      {tab === 'pertemuan' && (
        <View className="gap-3">
          <Button variant="outline" className="h-12 rounded-2xl" onPress={() => router.push({ pathname: '/sesi/baru', params: { kelas: cls.id } })}>
            <Icon as={CalendarPlus} className="size-4" />
            <Text>Tambah pertemuan</Text>
          </Button>
          <RowGroup>
            {sessions.map((s, i) => {
              const roster = s.status === 'TERJADWAL' ? [] : sessionRoster(state, s);
              const present = roster.filter((r) => r.status === 'HADIR' || r.status === 'TERLAMBAT').length;
              return (
                <View key={s.id}>
                  {i > 0 && <RowDivider />}
                  <Pressable onPress={() => router.push(`/sesi/${s.id}`)} className="active:bg-accent flex-row items-center gap-3 px-4 py-3">
                    <View className={cn('size-10 items-center justify-center rounded-xl', s.status === 'DIBUKA' ? 'bg-success' : 'bg-muted')}>
                      <Text className={cn('font-bold', s.status === 'DIBUKA' && 'text-white')}>{s.meetingNo}</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[15px] font-medium" numberOfLines={1}>
                        {s.topic}
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        {formatDate(s.startsAt, { weekday: true, short: true })} · {formatTime(s.startsAt)}
                        {roster.length ? ` · ${present}/${roster.length} hadir` : ''}
                      </Text>
                    </View>
                    <SessionStatusPill status={s.status} />
                  </Pressable>
                </View>
              );
            })}
          </RowGroup>
        </View>
      )}

      {tab === 'anggota' && (
        <Columns
          main={
            <Section
              title={`Praktikan · ${rows.length}`}
              action={
                <Button className="h-10 rounded-full px-4" onPress={() => setAdding('praktikan')}>
                  <Icon as={UserPlus} className="text-primary-foreground size-4" />
                  <Text>Tambah</Text>
                </Button>
              }
            >
              <SearchField placeholder="Cari nama atau NIM" value={query} onChangeText={setQuery} />
              <RowGroup>
                {filtered.length === 0 && <EmptyState icon={Users} title={rows.length ? 'Tidak ada yang cocok' : 'Belum ada praktikan'} />}
                {filtered.map((r, i) => (
                  <View key={r.user.nim}>
                    {i > 0 && <RowDivider />}
                    <View className="flex-row items-center gap-3 px-4 py-3">
                      <Avatar name={r.user.name} size="sm" />
                      <View className="min-w-0 flex-1 gap-1">
                        <View className="flex-row items-center justify-between gap-2">
                          <Text className="min-w-0 flex-1 text-[15px] font-medium" numberOfLines={1}>
                            {r.user.name}
                          </Text>
                          <Text
                            className={cn(
                              'text-sm font-bold',
                              r.tally.rate < 75 ? 'text-danger-ink' : r.tally.rate < 80 ? 'text-warning-ink' : 'text-success-ink',
                            )}
                          >
                            {r.tally.rate}%
                          </Text>
                        </View>
                        <Meter value={r.tally.rate} tone={r.tally.rate < 75 ? 'danger' : r.tally.rate < 80 ? 'warning' : 'success'} className="h-1.5" />
                        <Text className="text-muted-foreground text-xs">
                          {r.user.nim} · {r.tally.ALPHA} alpha · {r.tally.IZIN} izin
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Keluarkan ${r.user.name}`}
                        onPress={() => removeStudent(r.user)}
                        className="active:bg-accent size-9 items-center justify-center rounded-full"
                      >
                        <Icon as={Trash} className="text-muted-foreground size-4" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </RowGroup>
            </Section>
          }
          side={
            <Section
              title={`Asisten · ${assistants.length}`}
              action={
                isAdmin ? (
                  <Button variant="outline" className="h-10 rounded-full px-4" onPress={() => setAdding('asisten')}>
                    <Icon as={UserPlus} className="size-4" />
                    <Text>Tugaskan</Text>
                  </Button>
                ) : undefined
              }
            >
              <RowGroup>
                {assistants.length === 0 && <EmptyState icon={Users} title="Belum ada asisten" body="Koordinator menugaskan asisten ke kelas ini." />}
                {assistants.map((a, i) => (
                  <View key={a.nim}>
                    {i > 0 && <RowDivider />}
                    <View className="flex-row items-center gap-3 px-4 py-3">
                      <Avatar name={a.name} size="sm" />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-medium" numberOfLines={1}>
                          {a.name}
                          {a.nim === me.nim ? ' (kamu)' : ''}
                        </Text>
                        <Text className="text-muted-foreground font-mono text-xs">{a.nim}</Text>
                      </View>
                      {isAdmin && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Lepas ${a.name}`}
                          onPress={() => removeAssistant(a)}
                          className="active:bg-accent size-9 items-center justify-center rounded-full"
                        >
                          <Icon as={Trash} className="text-muted-foreground size-4" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </RowGroup>
            </Section>
          }
        />
      )}

      {tab === 'matriks' && (
        <View className="gap-3">
          <Surface className="overflow-hidden">
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View className="border-border flex-row border-b">
                  <View className="w-40 px-3 py-2">
                    <Text className="text-muted-foreground text-xs font-semibold">Praktikan</Text>
                  </View>
                  {sessions.map((s) => (
                    <View key={s.id} className="w-9 items-center py-2">
                      <Text className="text-muted-foreground text-xs font-semibold">P{s.meetingNo}</Text>
                    </View>
                  ))}
                  <View className="w-14 items-center py-2">
                    <Text className="text-muted-foreground text-xs font-semibold">%</Text>
                  </View>
                </View>
                {rows.map((r) => (
                  <View key={r.user.nim} className="border-border flex-row items-center border-b">
                    <View className="w-40 px-3 py-2">
                      <Text className="text-[13px]" numberOfLines={1}>
                        {r.user.name}
                      </Text>
                    </View>
                    {r.cells.map((c, i) => (
                      <View key={i} className="w-9 items-center py-1.5">
                        <View className={cn('size-7 items-center justify-center rounded-md', c ? TONE_CLASSES[ATTENDANCE_STATUS[c].tone].soft : 'bg-transparent')}>
                          <Text className={cn('text-xs font-bold', c ? TONE_CLASSES[ATTENDANCE_STATUS[c].tone].ink : 'text-muted-foreground')}>
                            {c ? ATTENDANCE_STATUS[c].short : '·'}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <View className="w-14 items-center">
                      <Text className={cn('text-[13px] font-bold', r.tally.rate < 75 && 'text-danger-ink')}>{r.tally.rate}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Surface>
          <Button className="h-12 rounded-2xl" onPress={exportNow}>
            <Icon as={FileSpreadsheet} className="text-primary-foreground size-4" />
            <Text>Export rekap kelas (.xlsx)</Text>
          </Button>
        </View>
      )}

      {tab === 'nilai' && <GradeBook classId={cls.id} />}
      <ClassShareSheet classId={cls.id} open={sharing} onOpenChange={setSharing} />

      {tab === 'riwayat' && (
        <View className="gap-3">
          <LogIntegrity />
          <AuditList entries={state.log.filter((e) => e.classId === cls.id)} empty="Belum ada perubahan di kelas ini." />
        </View>
      )}

      <AddMembersDialog
        kind={adding}
        cls={cls}
        onClose={() => setAdding(null)}
        onAdd={(nims) => {
          const kind = adding;
          setAdding(null);
          const names = nims.map((n) => userByNim(state, n)?.name ?? `NIM ${n}`);
          confirm({
            title: kind === 'asisten' ? `Tugaskan ${nims.length} asisten?` : `Tambah ${nims.length} praktikan?`,
            body:
              kind === 'asisten'
                ? 'Asisten bisa membuka sesi, mengubah presensi, dan mengisi nilai kelas ini.'
                : 'Mereka langsung bisa presensi di pertemuan berikutnya.',
            confirmLabel: kind === 'asisten' ? 'Tugaskan' : 'Tambahkan',
            changes: names.map((name) => ({ label: `${course.name} · ${cls.label}`, to: `+ ${name}` })),
            onConfirm: () => {
              if (kind === 'asisten') nims.forEach((n) => setClassAssistant(cls.id, n, true));
              else enroll(cls.id, nims);
              toast({ title: kind === 'asisten' ? 'Asisten ditugaskan' : `${nims.length} praktikan ditambahkan`, tone: 'success' });
            },
          });
        }}
      />
      {dialog}
    </Screen>
  );
}

function AddMembersDialog({
  kind,
  cls,
  onClose,
  onAdd,
}: {
  kind: 'praktikan' | 'asisten' | null;
  cls: ClassGroup;
  onClose: () => void;
  onAdd: (nims: string[]) => void;
}) {
  const { state } = useStore();
  const [picked, setPicked] = useState<string[]>([]);
  const [prev, setPrev] = useState(kind);
  if (kind !== prev) {
    setPrev(kind);
    setPicked([]);
  }
  const isStaff = kind === 'asisten';
  const candidates = useMemo(() => state.users.filter((u) => u.role === (isStaff ? 'ASISTEN' : 'PRAKTIKAN')), [state.users, isStaff]);
  const taken = useMemo(() => new Set(isStaff ? cls.assistantNims : cls.studentNims), [cls, isStaff]);
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[94vw] max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{isStaff ? 'Tugaskan asisten' : 'Tambah praktikan'}</DialogTitle>
          <DialogDescription>
            {isStaff ? 'Cari asisten berdasarkan nama atau NIM.' : 'Ketik nama atau NIM lalu Enter. Bisa juga tempel daftar NIM dari Excel atau SIAP.'}
          </DialogDescription>
        </DialogHeader>
        <PeoplePicker candidates={candidates} taken={taken} takenLabel="Sudah di kelas" value={picked} onChange={setPicked} allowNewNim={!isStaff} />
        <DialogFooter>
          <Button className="h-12 rounded-2xl" disabled={!picked.length} onPress={() => onAdd(picked)}>
            <Icon as={UserPlus} className="text-primary-foreground size-4" />
            <Text>{picked.length ? `Lanjut · ${picked.length} orang` : 'Pilih minimal satu'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Student */

/** Praktikan: their own attendance, scores, and the class's assistants. No one else's data. */
function StudentClass({ cls }: { cls: ClassGroup }) {
  const { state } = useStore();
  const me = useMe();
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === cls.labId);
  const sessions = state.sessions.filter((s) => s.classId === cls.id).sort((a, b) => a.meetingNo - b.meetingNo);
  const stat = studentStats(state, me.nim).perClass.find((p) => p.cls.id === cls.id);
  const book = gradeBook(state, cls.id);
  const mine = book.rows.find((r) => r.user.nim === me.nim);
  const assistants = cls.assistantNims.map((n) => userByNim(state, n)).filter((u): u is User => !!u);
  const done = sessions.filter((s) => s.status === 'SELESAI').length;
  const [sharing, setSharing] = useState(false);

  return (
    <Screen
      width="wide"
      header={<PageHeader title={course.name} subtitle={classSubtitle(cls, lab?.name)} right={<ShareButton onPress={() => setSharing(true)} />} />}
    >
      <ClassShareSheet classId={cls.id} open={sharing} onOpenChange={setSharing} />
      <View className="flex-row gap-3">
        <StatTile
          label="Kehadiran"
          value={`${stat?.tally.rate ?? 100}%`}
          hint={`${stat?.tally.ALPHA ?? 0} alpha`}
          tone={(stat?.tally.rate ?? 100) < 80 ? 'warning' : 'success'}
          bright
        />
        <StatTile label="Pertemuan" value={`${done}/${sessions.length}`} hint="selesai" />
        <StatTile label="Nilai" value={mine?.final ?? '–'} hint={mine?.final !== undefined ? `huruf ${letterGrade(mine.final)}` : 'belum ada'} />
      </View>

      {/* Schedule and class links side by side on wide screens, stacked on phones. */}
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[300px] flex-1">
          <ClassScheduleCard cls={cls} />
        </View>
        <View className="min-w-[300px] flex-1">
          <ClassLinksCard cls={cls} canEdit={false} />
        </View>
      </View>

      <Columns
        main={
          <Section title="Pertemuan">
            <RowGroup>
              {sessions.map((s, i) => {
                const record = attendanceFor(state, s.id, me.nim);
                return (
                  <View key={s.id}>
                    {i > 0 && <RowDivider />}
                    <Pressable onPress={() => router.push(`/sesi/${s.id}`)} className="active:bg-accent flex-row items-center gap-3 px-4 py-3">
                      <View className={cn('size-10 items-center justify-center rounded-xl', s.status === 'DIBUKA' ? 'bg-success' : 'bg-muted')}>
                        <Text className={cn('font-bold', s.status === 'DIBUKA' && 'text-white')}>{s.meetingNo}</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-medium" numberOfLines={1}>
                          {s.topic}
                        </Text>
                        <Text className="text-muted-foreground text-xs">
                          {formatDate(s.startsAt, { weekday: true, short: true })} · {formatTime(s.startsAt)}
                        </Text>
                      </View>
                      {record ? <AttendancePill status={record.status} /> : <SessionStatusPill status={s.status} />}
                    </Pressable>
                  </View>
                );
              })}
            </RowGroup>
          </Section>
        }
        side={
          <>
            <Section title="Nilai">
              {book.assignments.length === 0 ? (
                <Surface>
                  <EmptyState icon={FileSpreadsheet} title="Belum ada penilaian" />
                </Surface>
              ) : (
                <RowGroup>
                  {book.assignments.map((a, i) => {
                    const score = state.grades[gradeKey(a.id, me.nim)];
                    return (
                      <View key={a.id}>
                        {i > 0 && <RowDivider />}
                        <View className="flex-row items-center gap-3 px-4 py-3">
                          <View className="min-w-0 flex-1">
                            <Text className="text-[15px] font-medium" numberOfLines={1}>
                              {a.title}
                            </Text>
                            <Text className="text-muted-foreground font-mono text-xs">bobot {a.weight}%</Text>
                          </View>
                          {score === undefined ? (
                            <Pill label={book.graded[i] ? 'Kosong' : 'Belum dinilai'} />
                          ) : (
                            <Text className={cn('font-display text-2xl font-extrabold', gradeTone(score))}>{score}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {mine?.final !== undefined && (
                    <>
                      <RowDivider />
                      <View className="bg-muted flex-row items-center gap-3 px-4 py-3">
                        <Text className="min-w-0 flex-1 text-[15px] font-bold">Nilai akhir sementara</Text>
                        <Text className={cn('font-display text-2xl font-extrabold', gradeTone(mine.final))}>
                          {mine.final} · {letterGrade(mine.final)}
                        </Text>
                      </View>
                    </>
                  )}
                </RowGroup>
              )}
            </Section>
            <Section title="Asisten">
              <RowGroup>
                {assistants.length === 0 && <EmptyState icon={Users} title="Belum ada asisten" />}
                {assistants.map((a, i) => (
                  <View key={a.nim}>
                    {i > 0 && <RowDivider />}
                    <View className="flex-row items-center gap-3 px-4 py-3">
                      <Avatar name={a.name} size="sm" />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-medium" numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                          {a.email}
                        </Text>
                      </View>
                      {!!a.phone && (
                        <View className="flex-row items-center gap-1">
                          <Icon as={Phone} className="text-muted-foreground size-3.5" />
                          <Text className="text-muted-foreground font-mono text-xs">{a.phone}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </RowGroup>
            </Section>
          </>
        }
      />
    </Screen>
  );
}
