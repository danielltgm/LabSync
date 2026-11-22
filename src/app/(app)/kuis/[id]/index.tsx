import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, CircleStop, Clock, ListChecks, LogIn, Pencil, Play, ShieldAlert, Trash, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { Avatar, Chip, EmptyState, Segmented, StatTile, Surface } from '@/components/app/primitives';
import { ATTEMPT_STATUS, LockdownRules, QUIZ_STATUS } from '@/components/app/quiz-blocks';
import { PageHeader, Screen, Section } from '@/components/app/screen';
import { Pill } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attemptFor, matchesKey, questionPoints, quizScore, VIOLATION_LABEL, warningsLeft } from '@/data/quiz';
import { attendanceFor, userByNim, viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';
import type { Quiz, QuizAttempt, User } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { countdown, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function QuizPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const me = useMe();
  const quiz = state.quizzes.find((q) => q.id === id);
  if (!quiz) {
    return (
      <Screen header={<PageHeader title="Kuis" />}>
        <EmptyState icon={ListChecks} title="Kuis tidak ditemukan" />
      </Screen>
    );
  }
  const cls = state.classes.find((c) => c.id === quiz.classId)!;
  const isStaff = me.role === 'SUPERADMIN' || cls.assistantNims.includes(me.nim);
  return isStaff ? <StaffQuiz quiz={quiz} /> : <StudentQuiz quiz={quiz} />;
}

/* ------------------------------------------------------------------ Student */

function StudentQuiz({ quiz }: { quiz: Quiz }) {
  const { state, startQuiz, toast } = useStore();
  const me = useMe();
  const now = useNow(1000);
  const { confirm, dialog } = useConfirm();
  const s = viewSession(state, state.sessions.find((x) => x.id === quiz.sessionId)!);
  const attempt = attemptFor(state, quiz.id, me.nim);
  const att = attendanceFor(state, quiz.sessionId, me.nim);
  const present = att && (att.status === 'HADIR' || att.status === 'TERLAMBAT');
  const total = quiz.questions.reduce((a, q) => a + q.points, 0);

  const begin = () =>
    confirm({
      title: 'Mulai kuis sekarang?',
      body: `Waktu ${quiz.durationMin} menit langsung berjalan. Jangan keluar dari aplikasi sampai selesai.`,
      confirmLabel: 'Mulai',
      onConfirm: async () => {
        const r = await startQuiz(quiz.id).catch(() => null);
        if (!r) return;
        if (!r.ok) {
          toast({ title: r.reason === 'BELUM_PRESENSI' ? 'Presensi dulu sebelum kuis' : r.reason === 'TUTUP' ? 'Kuis sudah ditutup' : 'Kuis sudah selesai', tone: 'danger' });
          return;
        }
        // Web: full screen must be requested from the tap itself; leaving it counts as a violation.
        if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.requestFullscreen?.().catch(() => undefined);
        router.push(`/kuis/${quiz.id}/kerjakan`);
      },
    });

  return (
    <Screen width="medium" header={<PageHeader title={quiz.title} subtitle={`${s.course.name} · Pertemuan ${s.meetingNo}`} />}>
      <View className="flex-row gap-3">
        <StatTile label="Soal" value={quiz.questions.length} hint={`${total} poin`} />
        <StatTile label="Durasi" value={`${quiz.durationMin}′`} />
        <StatTile label="Peringatan" value={`${quiz.maxWarnings}x`} tone="warning" />
      </View>

      {!attempt && (
        <>
          <LockdownRules maxWarnings={quiz.maxWarnings} />
          {quiz.status !== 'DIBUKA' ? (
            <Surface className="p-4">
              <Text className="text-muted-foreground text-sm">{quiz.status === 'DRAFT' ? 'Kuis belum dibuka asisten.' : 'Kuis sudah ditutup. Kamu tidak mengerjakannya.'}</Text>
            </Surface>
          ) : quiz.requireAttendance && !present ? (
            <Surface className="gap-3 p-4">
              <Text className="text-sm">Kuis ini hanya untuk praktikan yang sudah presensi hadir di pertemuan ini.</Text>
              {s.status === 'DIBUKA' && (
                <Button className="h-12 rounded-2xl" onPress={() => router.push(`/presensi/${s.id}`)}>
                  <Text>Presensi dulu</Text>
                </Button>
              )}
            </Surface>
          ) : (
            <Button size="lg" className="h-14 rounded-2xl" onPress={begin}>
              <Icon as={Play} className="text-primary-foreground size-5" />
              <Text className="text-base font-bold">Mulai kuis</Text>
            </Button>
          )}
        </>
      )}

      {attempt?.status === 'MENGERJAKAN' && (
        <Surface className="gap-3 p-4">
          <View className="flex-row items-center gap-2">
            <Icon as={Clock} className="size-4" />
            <Text className="font-semibold">Sisa waktu {countdown(attempt.deadline, now)}</Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            {warningsLeft(quiz, attempt)} peringatan tersisa. Jawabanmu tersimpan; lanjutkan sebelum waktu habis.
          </Text>
          <Button size="lg" className="h-14 rounded-2xl" onPress={() => router.push(`/kuis/${quiz.id}/kerjakan`)}>
            <Text className="text-base font-bold">Lanjutkan kuis</Text>
          </Button>
        </Surface>
      )}

      {attempt && attempt.status !== 'MENGERJAKAN' && <StudentResult quiz={quiz} attempt={attempt} />}
      {dialog}
    </Screen>
  );
}

function StudentResult({ quiz, attempt }: { quiz: Quiz; attempt: QuizAttempt }) {
  const sc = quizScore(quiz, attempt);
  const kicked = attempt.status === 'DIKELUARKAN';
  const reveal = quiz.status === 'DITUTUP';
  return (
    <>
      <Surface className={cn('items-center gap-1 p-6', kicked ? 'bg-danger-soft' : 'bg-success-soft')}>
        <Text className={cn('font-mono text-xs font-bold uppercase', kicked ? 'text-danger-ink' : 'text-success-ink')}>
          {kicked ? 'Dikumpulkan otomatis' : 'Sudah dikumpulkan'}
        </Text>
        <Text className="font-display text-6xl font-extrabold leading-[64px]">{sc.pending ? '…' : sc.pct}</Text>
        <Text className="text-muted-foreground text-center text-sm">
          {sc.pending ? `${sc.pending} jawaban isian menunggu dinilai asisten` : `${sc.earned} dari ${sc.total} poin`}
          {attempt.submittedAt ? ` · ${formatTime(attempt.submittedAt)}` : ''}
        </Text>
      </Surface>
      {attempt.violations.length > 0 && <ViolationList attempt={attempt} />}
      <Section title="Jawabanmu">
        {!reveal && <Text className="text-muted-foreground text-xs">Kunci jawaban muncul setelah asisten menutup kuis.</Text>}
        {quiz.questions.map((q, i) => (
          <AnswerCard key={q.id} index={i} quiz={quiz} attempt={attempt} questionId={q.id} reveal={reveal} />
        ))}
      </Section>
    </>
  );
}

function AnswerCard({ index, quiz, attempt, questionId, reveal }: { index: number; quiz: Quiz; attempt: QuizAttempt; questionId: string; reveal: boolean }) {
  const q = quiz.questions.find((x) => x.id === questionId)!;
  const a = attempt.answers[q.id];
  const pts = questionPoints(q, attempt);
  return (
    <Surface className="gap-2 p-4">
      <View className="flex-row items-start gap-2">
        <Text className="text-muted-foreground font-mono text-xs font-bold">{index + 1}.</Text>
        <Text className="min-w-0 flex-1 text-sm font-medium leading-5">{q.prompt}</Text>
        <Text className="font-mono text-xs font-bold">{pts === null ? `?/${q.points}` : `${pts}/${q.points}`}</Text>
      </View>
      {q.type === 'PILGAN' ? (
        <View className="gap-1">
          {q.options.map((o, k) => (
            <Text
              key={k}
              className={cn(
                'rounded-lg px-2 py-1 text-[13px]',
                a === k && 'bg-muted font-semibold',
                reveal && k === q.correct && 'bg-success-soft text-success-ink font-semibold',
              )}
            >
              {String.fromCharCode(65 + k)}. {o}
            </Text>
          ))}
        </View>
      ) : (
        <Text className={cn('bg-muted rounded-lg px-2 py-1.5 text-[13px]', typeof a !== 'string' || !a ? 'text-muted-foreground italic' : '')}>
          {typeof a === 'string' && a ? a : 'Tidak dijawab'}
        </Text>
      )}
    </Surface>
  );
}

function ViolationList({ attempt }: { attempt: QuizAttempt }) {
  return (
    <View className="bg-warning-soft gap-1.5 rounded-2xl p-3">
      <View className="flex-row items-center gap-2">
        <Icon as={TriangleAlert} className="text-warning-ink size-4" />
        <Text className="text-warning-ink text-sm font-bold">{attempt.violations.length} pelanggaran</Text>
      </View>
      {attempt.violations.map((v, i) => (
        <Text key={i} className="text-warning-ink text-xs">
          {formatTime(v.at)} · {VIOLATION_LABEL[v.kind]}
        </Text>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------- Staff */

type StaffTab = 'peserta' | 'nilai' | 'soal';

function StaffQuiz({ quiz }: { quiz: Quiz }) {
  const { state, setQuizStatus, deleteQuiz, allowReentry, toast } = useStore();
  const { confirm, dialog } = useConfirm();
  const now = useNow(5000);
  const [tab, setTab] = useState<StaffTab>('peserta');
  const s = viewSession(state, state.sessions.find((x) => x.id === quiz.sessionId)!);
  const attempts = state.quizAttempts.filter((a) => a.quizId === quiz.id);
  const students = s.cls.studentNims.map((n) => userByNim(state, n)).filter((u): u is User => !!u).sort((a, b) => a.name.localeCompare(b.name));
  const finished = attempts.filter((a) => a.status !== 'MENGERJAKAN');
  const scored = finished.map((a) => quizScore(quiz, a)).filter((x) => !x.pending);
  const avg = scored.length ? Math.round(scored.reduce((t, x) => t + x.pct, 0) / scored.length) : null;
  const pendingAnswers = finished.reduce((t, a) => t + quizScore(quiz, a).pending, 0);
  const st = QUIZ_STATUS[quiz.status];
  const linked = quiz.assignmentId ? state.assignments.find((a) => a.id === quiz.assignmentId) : undefined;

  return (
    <Screen
      width="wide"
      header={<PageHeader title={quiz.title} subtitle={`${s.course.name} ${s.cls.label} · Pertemuan ${s.meetingNo}`} right={<Pill tone={st.tone} label={st.label} dot={quiz.status === 'DIBUKA'} />} />}
    >
      <View className="flex-row flex-wrap gap-3">
        {/* 2×2 on phones, one row on wide screens. */}
        <StatTile className="min-w-[44%]" label="Mulai" value={`${attempts.length}/${students.length}`} />
        <StatTile className="min-w-[44%]" label="Selesai" value={finished.length} tone="success" />
        <StatTile className="min-w-[44%]" label="Keluar" value={attempts.filter((a) => a.status === 'DIKELUARKAN').length} hint="dikeluarkan" tone="danger" />
        <StatTile className="min-w-[44%]" label="Rata-rata" value={avg ?? '–'} hint={pendingAnswers ? `${pendingAnswers} isian belum dinilai` : undefined} tone="brand" />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {quiz.status === 'DRAFT' && (
          <>
            <Button
              className="h-12 min-w-[45%] flex-1 rounded-2xl"
              onPress={() =>
                confirm({
                  title: 'Buka kuis sekarang?',
                  body: `${s.cls.studentNims.length} praktikan dapat notifikasi. Soal tidak bisa diubah setelah dibuka.`,
                  confirmLabel: 'Buka kuis',
                  changes: [{ label: 'Status', from: 'Draft', to: 'Dibuka' }],
                  onConfirm: () => {
                    setQuizStatus(quiz.id, 'DIBUKA');
                    toast({ title: 'Kuis dibuka', tone: 'success' });
                  },
                })
              }
            >
              <Icon as={Play} className="text-primary-foreground size-4" />
              <Text>Buka kuis</Text>
            </Button>
            <Button variant="outline" className="h-12 min-w-[45%] flex-1 rounded-2xl" onPress={() => router.push(`/kuis/${quiz.id}/edit`)}>
              <Icon as={Pencil} className="size-4" />
              <Text>Ubah soal</Text>
            </Button>
            <Button
              variant="ghost"
              className="h-12 rounded-2xl"
              onPress={() =>
                confirm({
                  title: 'Hapus draft kuis?',
                  body: linked ? `Kolom nilai "${linked.title}" juga dihapus.` : 'Draft hilang permanen.',
                  confirmLabel: 'Hapus',
                  destructive: true,
                  onConfirm: () => {
                    deleteQuiz(quiz.id);
                    router.back();
                  },
                })
              }
            >
              <Icon as={Trash} className="text-destructive size-4" />
              <Text className="text-destructive">Hapus</Text>
            </Button>
          </>
        )}
        {quiz.status === 'DIBUKA' && (
          <Button
            variant="destructive"
            className="h-12 flex-1 rounded-2xl"
            onPress={() =>
              confirm({
                title: 'Tutup kuis?',
                body: `${attempts.filter((a) => a.status === 'MENGERJAKAN').length} praktikan yang masih mengerjakan langsung dikumpulkan.`,
                confirmLabel: 'Tutup kuis',
                destructive: true,
                changes: [{ label: 'Status', from: 'Dibuka', to: 'Ditutup' }],
                onConfirm: () => setQuizStatus(quiz.id, 'DITUTUP'),
              })
            }
          >
            <Icon as={CircleStop} className="size-4 text-white" />
            <Text>Tutup kuis</Text>
          </Button>
        )}
        {quiz.status === 'DITUTUP' && (
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-2xl"
            onPress={() =>
              confirm({
                title: 'Buka kuis lagi?',
                body: 'Yang belum mengerjakan bisa mulai. Yang sudah mengumpulkan tidak bisa mengulang.',
                confirmLabel: 'Buka lagi',
                changes: [{ label: 'Status', from: 'Ditutup', to: 'Dibuka' }],
                onConfirm: () => setQuizStatus(quiz.id, 'DIBUKA'),
              })
            }
          >
            <Icon as={Play} className="size-4" />
            <Text>Buka lagi</Text>
          </Button>
        )}
      </View>
      {linked && (
        <Text className="text-muted-foreground text-xs">
          Nilai akhir masuk ke kolom “{linked.title}” ({linked.weight}%) di tab Nilai setelah semua isian dinilai.
        </Text>
      )}

      <Segmented<StaffTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'peserta', label: 'Peserta' },
          { value: 'nilai', label: 'Nilai isian', count: pendingAnswers },
          { value: 'soal', label: 'Soal' },
        ]}
      />

      {tab === 'peserta' && (
        <View className="gap-2">
          {students.map((u) => {
            const a = attempts.find((x) => x.nim === u.nim);
            return (
              <ParticipantRow
                key={u.nim}
                user={u}
                quiz={quiz}
                attempt={a}
                now={now}
                onReentry={() =>
                  confirm({
                    title: `Izinkan ${u.name.split(' ')[0]} masuk lagi?`,
                    body: 'Dapat 1 kesempatan peringatan tambahan dan minimal 5 menit untuk melanjutkan.',
                    confirmLabel: 'Izinkan',
                    reason: { required: true, label: 'Alasan', placeholder: 'Contoh: HP mati, sudah dicek asisten' },
                    onConfirm: (reason) => {
                      allowReentry(a!.id, reason);
                      toast({ title: 'Diizinkan masuk lagi', tone: 'success' });
                    },
                  })
                }
              />
            );
          })}
        </View>
      )}

      {tab === 'nilai' && <ShortAnswerGrading quiz={quiz} attempts={finished} />}

      {tab === 'soal' && (
        <View className="gap-2">
          {quiz.questions.map((q, i) => (
            <Surface key={q.id} className="gap-2 p-4">
              <View className="flex-row items-start gap-2">
                <Text className="text-muted-foreground font-mono text-xs font-bold">{i + 1}.</Text>
                <Text className="min-w-0 flex-1 text-sm font-medium leading-5">{q.prompt}</Text>
                <Text className="font-mono text-xs font-bold">{q.points} poin</Text>
              </View>
              {q.type === 'PILGAN' ? (
                q.options.map((o, k) => (
                  <Text key={k} className={cn('rounded-lg px-2 py-1 text-[13px]', k === q.correct && 'bg-success-soft text-success-ink font-semibold')}>
                    {String.fromCharCode(65 + k)}. {o}
                  </Text>
                ))
              ) : (
                <Text className="text-muted-foreground text-xs">Kunci: {q.answerKey?.trim() || 'tidak ada (dinilai manual)'}</Text>
              )}
            </Surface>
          ))}
        </View>
      )}
      {dialog}
    </Screen>
  );
}

function ParticipantRow({ user, quiz, attempt, now, onReentry }: { user: User; quiz: Quiz; attempt?: QuizAttempt; now: number; onReentry: () => void }) {
  const [open, setOpen] = useState(false);
  const sc = attempt ? quizScore(quiz, attempt) : null;
  const st = attempt ? ATTEMPT_STATUS[attempt.status] : null;
  return (
    <Surface className="gap-2 p-3">
      <Pressable accessibilityRole="button" disabled={!attempt} onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3">
        <Avatar name={user.name} size="sm" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-semibold" numberOfLines={1}>
            {user.name}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {st ? <Pill tone={st.tone} label={st.label} /> : <Text className="text-muted-foreground text-xs">Belum mulai</Text>}
            {attempt && (
              <Text className="text-muted-foreground text-xs">
                {sc!.answered}/{quiz.questions.length} terjawab
                {attempt.status === 'MENGERJAKAN' ? ` · sisa ${countdown(attempt.deadline, now)}` : attempt.submittedAt ? ` · ${formatTime(attempt.submittedAt)}` : ''}
              </Text>
            )}
          </View>
        </View>
        {attempt && attempt.violations.length > 0 && (
          <View className="bg-warning-soft flex-row items-center gap-1 rounded-full px-2 py-1">
            <Icon as={ShieldAlert} className="text-warning-ink size-3.5" />
            <Text className="text-warning-ink font-mono text-[11px] font-bold">{attempt.violations.length}</Text>
          </View>
        )}
        {sc && attempt!.status !== 'MENGERJAKAN' && (
          <Text className="font-display min-w-9 text-right text-xl font-extrabold">{sc.pending ? '…' : sc.pct}</Text>
        )}
      </Pressable>
      {open && attempt && (
        <View className="gap-2">
          {attempt.violations.length > 0 ? <ViolationList attempt={attempt} /> : <Text className="text-muted-foreground text-xs">Tidak ada pelanggaran.</Text>}
          {attempt.allowance > 0 && <Text className="text-muted-foreground text-xs">Diizinkan masuk lagi {attempt.allowance}x.</Text>}
          {attempt.status === 'DIKELUARKAN' && quiz.status === 'DIBUKA' && (
            <Button variant="outline" className="h-11 rounded-xl" onPress={onReentry}>
              <Icon as={LogIn} className="size-4" />
              <Text>Izinkan masuk lagi</Text>
            </Button>
          )}
        </View>
      )}
    </Surface>
  );
}

/** Every ISIAN answer, grouped per question. Quick buttons: 0, half, full; key matches are marked. */
function ShortAnswerGrading({ quiz, attempts }: { quiz: Quiz; attempts: QuizAttempt[] }) {
  const { state, gradeAnswer } = useStore();
  const [onlyPending, setOnlyPending] = useState(true);
  const short = quiz.questions.filter((q) => q.type === 'ISIAN');
  const rows = useMemo(
    () =>
      short.map((q) => ({
        q,
        answers: attempts
          .map((a) => ({ a, pts: questionPoints(q, a), text: typeof a.answers[q.id] === 'string' ? (a.answers[q.id] as string) : '' }))
          .filter((r) => !onlyPending || r.pts === null),
      })),
    [short, attempts, onlyPending],
  );
  if (!short.length) return <EmptyState icon={CircleCheck} title="Tidak ada soal isian" body="Semua soal pilihan ganda dinilai otomatis." />;
  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <Chip label="Belum dinilai" active={onlyPending} onPress={() => setOnlyPending(true)} />
        <Chip label="Semua jawaban" active={!onlyPending} onPress={() => setOnlyPending(false)} />
      </View>
      {rows.map(({ q, answers }) => (
        <View key={q.id} className="gap-2">
          <Text className="text-sm font-bold">
            Soal {quiz.questions.indexOf(q) + 1} · {q.points} poin
          </Text>
          <Text className="text-muted-foreground text-[13px]">{q.prompt}</Text>
          {q.answerKey?.trim() && <Text className="text-muted-foreground text-xs">Kunci: {q.answerKey}</Text>}
          {answers.length === 0 && <Text className="text-muted-foreground py-2 text-xs">Semua sudah dinilai.</Text>}
          {answers.map(({ a, pts, text }) => (
            <Surface key={a.id} className="gap-2 p-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="min-w-0 flex-1 text-[13px] font-semibold" numberOfLines={1}>
                  {userByNim(state, a.nim)?.name ?? a.nim}
                </Text>
                {q.answerKey?.trim() && matchesKey(text, q.answerKey) && <Pill tone="success" label="Cocok kunci" />}
                <Text className="font-mono text-xs font-bold">{pts === null ? `?/${q.points}` : `${pts}/${q.points}`}</Text>
              </View>
              <Text className={cn('bg-muted rounded-lg px-2 py-1.5 text-[13px]', !text && 'text-muted-foreground italic')}>{text || 'Tidak dijawab'}</Text>
              <View className="flex-row gap-2">
                {[0, Math.round(q.points / 2), q.points].map((p, k) => (
                  <Chip key={k} label={k === 0 ? 'Salah · 0' : k === 1 ? `Setengah · ${p}` : `Benar · ${p}`} active={a.manual[q.id] === p} onPress={() => gradeAnswer(a.id, q.id, p)} />
                ))}
              </View>
            </Surface>
          ))}
        </View>
      ))}
    </View>
  );
}
