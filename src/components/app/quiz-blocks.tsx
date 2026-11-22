import { router } from 'expo-router';
import { ChevronRight, ListChecks, Plus, ShieldAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Surface } from '@/components/app/primitives';
import { Pill, type Tone } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { attemptFor, quizScore, quizzesForSession } from '@/data/quiz';
import { useMe, useStore } from '@/data/store';
import type { Quiz, QuizAttempt } from '@/data/types';

export const QUIZ_STATUS: Record<Quiz['status'], { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  DIBUKA: { label: 'Dibuka', tone: 'success' },
  DITUTUP: { label: 'Ditutup', tone: 'info' },
};

export const ATTEMPT_STATUS: Record<QuizAttempt['status'], { label: string; tone: Tone }> = {
  MENGERJAKAN: { label: 'Mengerjakan', tone: 'warning' },
  DIKUMPULKAN: { label: 'Dikumpulkan', tone: 'success' },
  DIKELUARKAN: { label: 'Dikeluarkan', tone: 'danger' },
};

/** Quizzes of one meeting, for the session page. Staff can add; students see open/finished ones. */
export function SessionQuizzes({ sessionId, isStaff }: { sessionId: string; isStaff: boolean }) {
  const { state } = useStore();
  const me = useMe();
  const quizzes = quizzesForSession(state, sessionId).filter((q) => isStaff || q.status !== 'DRAFT');
  if (!isStaff && !quizzes.length) return null;
  return (
    <View className="gap-2">
      {quizzes.map((q) => {
        const attempts = state.quizAttempts.filter((a) => a.quizId === q.id);
        const mine = attemptFor(state, q.id, me.nim);
        const score = mine && mine.status !== 'MENGERJAKAN' ? quizScore(q, mine) : null;
        const s = QUIZ_STATUS[q.status];
        return (
          <Pressable key={q.id} accessibilityRole="button" onPress={() => router.push(`/kuis/${q.id}`)} className="active:opacity-90">
            <Surface className="flex-row items-center gap-3 p-3.5">
              <View className="bg-aqua size-11 items-center justify-center rounded-2xl">
                <Icon as={ListChecks} className="text-on-bright size-5" strokeWidth={2.4} />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold" numberOfLines={1}>
                  {q.title}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {q.questions.length} soal · {q.durationMin} menit
                  {isStaff ? ` · ${attempts.filter((a) => a.status !== 'MENGERJAKAN').length} selesai` : ''}
                </Text>
              </View>
              {isStaff ? (
                <Pill tone={s.tone} label={s.label} dot={q.status === 'DIBUKA'} />
              ) : mine ? (
                score ? (
                  <Text className="font-display text-xl font-extrabold">{score.pending ? '…' : score.pct}</Text>
                ) : (
                  <Pill tone="warning" label="Lanjutkan" dot />
                )
              ) : q.status === 'DIBUKA' ? (
                <Pill tone="success" label="Kerjakan" dot />
              ) : (
                <Pill tone="neutral" label="Ditutup" />
              )}
              <Icon as={ChevronRight} className="text-muted-foreground size-4" />
            </Surface>
          </Pressable>
        );
      })}
      {isStaff && (
        <Button variant="outline" className="h-12 rounded-2xl border-dashed" onPress={() => router.push({ pathname: '/kuis/baru', params: { sesi: sessionId } })}>
          <Icon as={Plus} className="size-4" />
          <Text>Buat kuis</Text>
        </Button>
      )}
    </View>
  );
}

/** The lockdown rules, shown before starting and in the builder. */
export function LockdownRules({ maxWarnings }: { maxWarnings: number }) {
  const rules = [
    'Jangan keluar dari aplikasi atau pindah ke aplikasi lain selama kuis.',
    'Tangkapan layar dan rekam layar diblokir.',
    `Setiap keluar dihitung peringatan. Peringatan ke-${maxWarnings + 1} langsung mengumpulkan kuis.`,
    'Jawaban tersimpan otomatis. Waktu habis, kuis terkumpul sendiri.',
  ];
  return (
    <View className="bg-danger-soft gap-2 rounded-2xl p-4">
      <View className="flex-row items-center gap-2">
        <Icon as={ShieldAlert} className="text-danger-ink size-[18px]" strokeWidth={2.4} />
        <Text className="text-danger-ink text-sm font-bold">Mode terkunci</Text>
      </View>
      {rules.map((r) => (
        <View key={r} className="flex-row gap-2">
          <Text className="text-danger-ink text-[13px] leading-5">•</Text>
          <Text className="text-danger-ink min-w-0 flex-1 text-[13px] leading-5">{r}</Text>
        </View>
      ))}
    </View>
  );
}
