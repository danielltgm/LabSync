import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Lock, ShieldAlert, ShieldX } from 'lucide-react-native';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { AppState, BackHandler, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/app/confirm';
import { Column, Screen } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { attemptFor, quizScore, VIOLATION_LABEL, warningsLeft } from '@/data/quiz';
import { useMe, useStore } from '@/data/store';
import type { ViolationKind } from '@/data/types';
import { useNow } from '@/hooks/use-now';
import { countdown } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Locked quiz screen.
 * - Native: screenshots and screen recording blocked (FLAG_SECURE on Android, capture prevention on iOS);
 *   leaving the app (background) is a violation; screenshot attempts are a violation where detectable.
 * - Web: switching tab/window or leaving full screen is a violation; copy, cut and the context menu are off.
 * - The hardware back button and back gesture don't leave; they ask to submit instead.
 * After `maxWarnings` warnings, the next violation submits the quiz automatically.
 */
function useQuizLockdown(enabled: boolean, onViolation: (kind: ViolationKind) => void) {
  const report = useEffectEvent(onViolation);

  // Native: block capture while the quiz runs.
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let cancelled = false;
    let sub: { remove: () => void } | undefined;
    (async () => {
      const SC = await import('expo-screen-capture');
      if (cancelled) return;
      await SC.preventScreenCaptureAsync('quiz').catch(() => undefined);
      if (Platform.OS === 'ios') await SC.enableAppSwitcherProtectionAsync(0.9).catch(() => undefined);
      sub = SC.addScreenshotListener(() => report('SCREENSHOT'));
    })();
    return () => {
      cancelled = true;
      sub?.remove();
      void import('expo-screen-capture').then((SC) => {
        void SC.allowScreenCaptureAsync('quiz').catch(() => undefined);
        if (Platform.OS === 'ios') void SC.disableAppSwitcherProtectionAsync().catch(() => undefined);
      });
    };
  }, [enabled]);

  // Native: going to the background (home, recents, another app) counts when the student comes back.
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let away = false;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') away = true;
      else if (s === 'active' && away) {
        away = false;
        report('KELUAR_APLIKASI');
      }
    });
    return () => sub.remove();
  }, [enabled]);

  // Native: Android back button asks to submit instead of leaving.
  // (Handled by the screen through onBack; registered there.)

  // Web: tab/window switches, full screen exit, copy/paste.
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;
    let awaySince = 0;
    let tabHidden = false;
    let lastReport = 0;
    const once = (kind: ViolationKind) => {
      const t = Date.now();
      if (t - lastReport < 1500) return; // blur + visibilitychange + fullscreen exit often fire together
      lastReport = t;
      report(kind);
    };
    const leave = (hidden: boolean) => {
      if (!awaySince) awaySince = Date.now();
      if (hidden) tabHidden = true;
    };
    const back = () => {
      if (!awaySince) return;
      const away = Date.now() - awaySince;
      const wasHidden = tabHidden;
      awaySince = 0;
      tabHidden = false;
      // A hidden tab always counts. A window blur only counts when it lasts: OS notifications and
      // focus flickers blur the window for a split second without the student leaving.
      if (wasHidden || away >= 1000) once('PINDAH_TAB');
    };
    const onVisibility = () => (document.hidden ? leave(true) : back());
    const onBlur = () => leave(false);
    const onFullscreen = () => {
      if (!document.fullscreenElement) once('KELUAR_FULLSCREEN');
    };
    const block = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // Typing in an answer box still needs selection and paste-free editing; copy is always blocked.
      if (e.type === 'selectstart' && target && /INPUT|TEXTAREA/.test(target.tagName)) return;
      e.preventDefault();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', back);
    document.addEventListener('fullscreenchange', onFullscreen);
    for (const t of ['copy', 'cut', 'paste', 'contextmenu', 'selectstart']) document.addEventListener(t, block);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', back);
      document.removeEventListener('fullscreenchange', onFullscreen);
      for (const t of ['copy', 'cut', 'paste', 'contextmenu', 'selectstart']) document.removeEventListener(t, block);
    };
  }, [enabled]);
}

export default function TakeQuiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, answerQuiz, reportViolation, submitQuiz } = useStore();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const quiz = state.quizzes.find((q) => q.id === id);
  const attempt = quiz ? attemptFor(state, quiz.id, me.nim) : undefined;
  const active = !!quiz && attempt?.status === 'MENGERJAKAN';
  const [index, setIndex] = useState(0);
  const [warning, setWarning] = useState<{ left: number; kind: ViolationKind } | null>(null);
  const [asking, setAsking] = useState(false);
  // Short answers are typed into a local draft and saved shortly after typing stops.
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(attempt?.answers ?? {}).filter(([, v]) => typeof v === 'string')) as Record<string, string>,
  );

  const questions = useMemo(
    () => (quiz && attempt ? attempt.order.map((qid) => quiz.questions.find((q) => q.id === qid)).filter((q) => !!q) : []),
    [quiz, attempt],
  );

  const flush = () => {
    if (!quiz || !attempt) return;
    for (const [qid, v] of Object.entries(texts)) if (attempt.answers[qid] !== v) answerQuiz(quiz.id, qid, v);
  };
  const flushLater = useEffectEvent(flush);
  useEffect(() => {
    const t = setTimeout(() => flushLater(), 600);
    return () => clearTimeout(t);
  }, [texts]);

  useQuizLockdown(active, (kind) => {
    if (!quiz) return;
    flush();
    void reportViolation(quiz.id, kind).then((r) => {
      if (!r.kicked) setWarning({ left: r.left, kind });
    }, () => undefined);
  });

  // Android back: never leave silently.
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setAsking(true);
      return true;
    });
    return () => sub.remove();
  }, [active]);

  // Time's up.
  const expire = useEffectEvent(() => {
    if (!quiz) return;
    flush();
    submitQuiz(quiz.id, 'waktu');
  });
  const timeUp = !!attempt && active && now >= attempt.deadline;
  useEffect(() => {
    if (timeUp) expire();
  }, [timeUp]);

  // Leave full screen once done (web).
  useEffect(() => {
    if (active || Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, [active]);

  if (!quiz || !attempt) {
    return (
      <Screen>
        <Text>Kuis tidak ditemukan.</Text>
        <Button onPress={() => router.replace('/')}>
          <Text>Kembali</Text>
        </Button>
      </Screen>
    );
  }

  if (!active) {
    const sc = quizScore(quiz, attempt);
    const kicked = attempt.status === 'DIKELUARKAN';
    return (
      <Screen>
        <View className="items-center gap-4 pt-16">
          <View className={cn('size-24 items-center justify-center rounded-full', kicked ? 'bg-coral' : 'bg-sage')}>
            <Icon as={kicked ? ShieldX : Lock} className="text-on-bright size-11" strokeWidth={2.4} />
          </View>
          <Text className="font-display text-center text-[32px] font-extrabold uppercase leading-9">{kicked ? 'Kuis dikumpulkan otomatis' : 'Kuis terkumpul'}</Text>
          <Text className="text-muted-foreground max-w-sm text-center text-[15px] leading-6">
            {kicked
              ? `Kamu keluar ${attempt.violations.length} kali (batas ${quiz.maxWarnings + attempt.allowance} peringatan). Jawaban sampai saat itu sudah dikirim ke asisten.`
              : `${sc.answered} dari ${quiz.questions.length} soal terjawab.${sc.pending ? ' Jawaban isian dinilai asisten.' : ''}`}
          </Text>
          {!sc.pending && <Text className="font-display text-6xl font-extrabold">{sc.pct}</Text>}
          <Button size="lg" className="h-14 w-full max-w-sm rounded-2xl" onPress={() => router.replace(`/kuis/${quiz.id}`)}>
            <Text className="text-base font-bold">Lihat hasil</Text>
          </Button>
        </View>
      </Screen>
    );
  }

  const q = questions[index];
  const left = warningsLeft(quiz, attempt);
  const remaining = attempt.deadline - now;
  const answered = (qid: string) => {
    const a = qid in texts ? texts[qid] : attempt.answers[qid];
    return typeof a === 'number' || (typeof a === 'string' && a.trim() !== '');
  };
  const unanswered = questions.filter((x) => !answered(x.id)).length;

  const header = (
    <View className="bg-ink" style={{ paddingTop: insets.top + 8 }}>
      <Column className="flex-row items-center gap-3 pb-3">
        <View className="min-w-0 flex-1">
          <Text className="text-ink-muted font-mono text-[11px] font-bold uppercase">Mode terkunci</Text>
          <Text className="text-ink-foreground text-base font-bold" numberOfLines={1}>
            {quiz.title}
          </Text>
        </View>
        <View className={cn('flex-row items-center gap-1.5 rounded-full px-3 py-1.5', left <= 0 ? 'bg-coral' : 'bg-white/10')}>
          <Icon as={ShieldAlert} className={cn('size-4', left <= 0 ? 'text-on-bright' : 'text-ink-foreground')} />
          <Text className={cn('font-mono text-xs font-bold', left <= 0 ? 'text-on-bright' : 'text-ink-foreground')}>{left}</Text>
        </View>
        <View className={cn('flex-row items-center gap-1.5 rounded-full px-3 py-1.5', remaining < 60_000 ? 'bg-coral' : 'bg-mustard')}>
          <Icon as={Clock} className="text-on-bright size-4" />
          <Text className="text-on-bright font-mono text-sm font-bold">{countdown(attempt.deadline, now)}</Text>
        </View>
      </Column>
    </View>
  );

  return (
    // select-none: no text selection for copying on web (answer inputs still work).
    <Screen header={header} className="select-none">
      <View className="flex-row flex-wrap gap-2">
        {questions.map((x, i) => (
          <Pressable
            key={x.id}
            accessibilityRole="button"
            accessibilityLabel={`Soal ${i + 1}${answered(x.id) ? ', terjawab' : ''}`}
            onPress={() => setIndex(i)}
            className={cn(
              'size-10 items-center justify-center rounded-full border-2',
              i === index ? 'border-foreground' : 'border-transparent',
              answered(x.id) ? 'bg-primary' : 'bg-muted',
            )}
          >
            <Text className={cn('text-sm font-bold', answered(x.id) && 'text-primary-foreground')}>{i + 1}</Text>
          </Pressable>
        ))}
      </View>

      {q && (
        <View className="gap-4">
          <Text className="text-muted-foreground font-mono text-xs font-bold uppercase">
            Soal {index + 1} dari {questions.length} · {q.points} poin · {q.type === 'PILGAN' ? 'pilih satu' : 'isian singkat'}
          </Text>
          <Text selectable={false} className="text-[19px] font-semibold leading-7">
            {q.prompt}
          </Text>
          {q.type === 'PILGAN' ? (
            <View className="gap-2.5">
              {q.options.map((o, k) => {
                const picked = attempt.answers[q.id] === k;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: picked }}
                    onPress={() => answerQuiz(quiz.id, q.id, k)}
                    className={cn('flex-row items-center gap-3 rounded-2xl border-2 p-4', picked ? 'border-primary bg-brand-soft' : 'border-border bg-card active:bg-accent')}
                  >
                    <View className={cn('size-8 items-center justify-center rounded-full', picked ? 'bg-primary' : 'bg-muted')}>
                      <Text className={cn('text-sm font-bold', picked && 'text-primary-foreground')}>{String.fromCharCode(65 + k)}</Text>
                    </View>
                    <Text selectable={false} className="min-w-0 flex-1 text-[15px] leading-6">
                      {o}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Input
              value={texts[q.id] ?? ''}
              onChangeText={(v) => setTexts((t) => ({ ...t, [q.id]: v }))}
              placeholder="Tulis jawabanmu"
              contextMenuHidden
              autoCorrect={false}
              className="h-auto min-h-14 py-3"
              multiline
            />
          )}
        </View>
      )}

      <View className="flex-row gap-2">
        <Button variant="outline" className="h-12 flex-1 rounded-2xl" disabled={index === 0} onPress={() => setIndex((i) => i - 1)}>
          <Icon as={ChevronLeft} className="size-4" />
          <Text>Sebelumnya</Text>
        </Button>
        {index < questions.length - 1 ? (
          <Button className="h-12 flex-1 rounded-2xl" onPress={() => setIndex((i) => i + 1)}>
            <Text>Berikutnya</Text>
            <Icon as={ChevronRight} className="text-primary-foreground size-4" />
          </Button>
        ) : (
          <Button className="bg-ink h-12 flex-1 rounded-2xl" onPress={() => setAsking(true)}>
            <Text className="text-ink-foreground">Kumpulkan</Text>
          </Button>
        )}
      </View>
      <Pressable accessibilityRole="button" onPress={() => setAsking(true)} className="items-center py-2">
        <Text className="text-muted-foreground text-sm">Selesai lebih awal? Kumpulkan sekarang</Text>
      </Pressable>

      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="Kumpulkan kuis?"
        body={unanswered ? `${unanswered} soal belum dijawab. Setelah dikumpulkan, jawaban tidak bisa diubah.` : 'Semua soal sudah dijawab. Jawaban tidak bisa diubah setelah dikumpulkan.'}
        confirmLabel="Kumpulkan"
        onConfirm={() => {
          flush();
          submitQuiz(quiz.id, 'manual');
        }}
      />
      <ConfirmDialog
        open={!!warning}
        onOpenChange={(o) => !o && setWarning(null)}
        title={warning && warning.left === 0 ? 'Peringatan terakhir!' : `Peringatan · sisa ${warning?.left ?? 0}`}
        body={
          warning
            ? `${VIOLATION_LABEL[warning.kind]} terdeteksi dan dilaporkan ke asisten. ${
                warning.left === 0 ? 'Sekali lagi, kuis langsung dikumpulkan otomatis.' : `${warning.left} kesempatan lagi sebelum kuis dikumpulkan otomatis.`
              }`
            : ''
        }
        confirmLabel="Lanjut mengerjakan"
        destructive={warning?.left === 0}
        onConfirm={() => setWarning(null)}
      />
    </Screen>
  );
}
