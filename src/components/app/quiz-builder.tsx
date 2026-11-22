import { ArrowDown, ArrowUp, CircleCheck, Circle, Copy, ListChecks, PencilLine, Plus, Trash, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { Chip, Surface } from '@/components/app/primitives';
import { LockdownRules } from '@/components/app/quiz-blocks';
import { Section } from '@/components/app/screen';
import { Stepper } from '@/components/app/session-form';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import type { QuizInput } from '@/data/store';
import type { QuizQuestion } from '@/data/types';
import { cn } from '@/lib/utils';

let qCounter = 0;
const qid = () => `q-${Date.now().toString(36)}-${(qCounter++).toString(36)}`;

export function newQuestion(type: QuizQuestion['type']): QuizQuestion {
  return type === 'PILGAN'
    ? { id: qid(), type, prompt: '', points: 10, options: ['', '', '', ''], correct: undefined }
    : { id: qid(), type, prompt: '', points: 10, options: [], answerKey: '' };
}

export type QuizDraft = Omit<QuizInput, 'sessionId' | 'id'>;

export function validateQuiz(d: QuizDraft): string | null {
  if (d.title.trim().length < 3) return 'Isi judul kuis.';
  if (!d.questions.length) return 'Tambahkan minimal satu soal.';
  for (const [i, q] of d.questions.entries()) {
    const n = i + 1;
    if (!q.prompt.trim()) return `Soal ${n} belum ada pertanyaannya.`;
    if (q.type === 'PILGAN') {
      const filled = q.options.filter((o) => o.trim());
      if (filled.length < 2) return `Soal ${n}: isi minimal 2 pilihan.`;
      if (q.correct === undefined || !q.options[q.correct]?.trim()) return `Soal ${n}: tandai jawaban yang benar.`;
    }
  }
  return null;
}

/** Drops empty multiple-choice options and keeps the correct index pointing at the same text. */
export function cleanQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map((q) => {
    if (q.type !== 'PILGAN') return { ...q, prompt: q.prompt.trim(), answerKey: q.answerKey?.trim() || undefined };
    const keep = q.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
    return { ...q, prompt: q.prompt.trim(), options: keep.map((x) => x.o), correct: keep.findIndex((x) => x.i === q.correct) };
  });
}

export function QuizBuilder({ value, onChange }: { value: QuizDraft; onChange: (v: QuizDraft) => void }) {
  const { confirm, dialog } = useConfirm();
  const set = <K extends keyof QuizDraft>(k: K, v: QuizDraft[K]) => onChange({ ...value, [k]: v });
  const setQ = (i: number, patch: Partial<QuizQuestion>) => set('questions', value.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value.questions];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set('questions', next);
  };
  const total = value.questions.reduce((s, q) => s + q.points, 0);

  return (
    <View className="gap-6">
      <Section title="Pengaturan">
        <View className="gap-2">
          <Label nativeID="qt">Judul kuis</Label>
          <Input aria-labelledby="qt" value={value.title} onChangeText={(v) => set('title', v)} placeholder="Contoh: Kuis Lokasi & Geofence" />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium">Durasi</Text>
          <View className="flex-row flex-wrap gap-2">
            {[5, 10, 15, 20, 30, 45, 60].map((m) => (
              <Chip key={m} label={`${m} mnt`} active={value.durationMin === m} onPress={() => set('durationMin', m)} />
            ))}
          </View>
        </View>
        <Surface className="gap-3 p-4">
          <View className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-medium">Batas peringatan: {value.maxWarnings}x</Text>
              <Text className="text-muted-foreground text-xs">Keluar ke-{value.maxWarnings + 1} = kuis otomatis dikumpulkan</Text>
            </View>
            <Stepper value={value.maxWarnings} onChange={(v) => set('maxWarnings', v)} min={0} max={5} />
          </View>
          <ToggleLine label="Acak urutan soal" hint="Tiap praktikan dapat urutan berbeda" checked={value.shuffle} onChange={(v) => set('shuffle', v)} />
          <ToggleLine label="Wajib presensi dulu" hint="Hanya yang hadir/terlambat yang bisa mulai" checked={value.requireAttendance} onChange={(v) => set('requireAttendance', v)} />
          <ToggleLine
            label="Masuk ke penilaian"
            hint="Nilai akhir kuis jadi satu kolom di tab Nilai"
            checked={value.gradeWeight !== null}
            onChange={(v) => set('gradeWeight', v ? 10 : null)}
          />
          {value.gradeWeight !== null && (
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-muted-foreground text-xs">Bobot</Text>
              {[5, 10, 15, 20, 25].map((w) => (
                <Chip key={w} label={`${w}%`} active={value.gradeWeight === w} onPress={() => set('gradeWeight', w)} />
              ))}
            </View>
          )}
        </Surface>
        <LockdownRules maxWarnings={value.maxWarnings} />
      </Section>

      <Section title={`Soal (${value.questions.length}) · ${total} poin`}>
        {value.questions.map((q, i) => (
          <Surface key={q.id} className="gap-3 p-4">
            <View className="flex-row items-center gap-2">
              <View className={cn('size-8 items-center justify-center rounded-full', q.type === 'PILGAN' ? 'bg-violet' : 'bg-aqua')}>
                <Text className={cn('text-sm font-bold', q.type === 'PILGAN' ? 'text-white' : 'text-on-bright')}>{i + 1}</Text>
              </View>
              <Text className="min-w-0 flex-1 text-sm font-semibold">{q.type === 'PILGAN' ? 'Pilihan ganda' : 'Isian singkat'}</Text>
              <IconButton icon={ArrowUp} label="Naikkan" disabled={i === 0} onPress={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label="Turunkan" disabled={i === value.questions.length - 1} onPress={() => move(i, 1)} />
              <IconButton
                icon={Copy}
                label="Gandakan"
                onPress={() => set('questions', [...value.questions.slice(0, i + 1), { ...q, id: qid(), options: [...q.options] }, ...value.questions.slice(i + 1)])}
              />
              <IconButton
                icon={Trash}
                label="Hapus soal"
                danger
                onPress={() =>
                  confirm({
                    title: `Hapus soal ${i + 1}?`,
                    body: q.prompt.trim() ? `"${q.prompt.trim().slice(0, 80)}"` : 'Soal kosong.',
                    confirmLabel: 'Hapus',
                    destructive: true,
                    onConfirm: () => set('questions', value.questions.filter((_, k) => k !== i)),
                  })
                }
              />
            </View>
            <Textarea value={q.prompt} onChangeText={(v) => setQ(i, { prompt: v })} placeholder="Tulis pertanyaan…" className="min-h-20" />
            {q.type === 'PILGAN' ? (
              <View className="gap-2">
                {q.options.map((o, k) => {
                  const right = q.correct === k;
                  return (
                    <View key={k} className="flex-row items-center gap-2">
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Tandai pilihan ${String.fromCharCode(65 + k)} benar`}
                        accessibilityState={{ checked: right }}
                        onPress={() => setQ(i, { correct: k })}
                        className={cn('size-10 items-center justify-center rounded-full', right ? 'bg-success-soft' : 'bg-muted')}
                      >
                        <Icon as={right ? CircleCheck : Circle} className={cn('size-5', right ? 'text-success-ink' : 'text-muted-foreground')} />
                      </Pressable>
                      <Input
                        className="flex-1"
                        value={o}
                        onChangeText={(v) => setQ(i, { options: q.options.map((x, j) => (j === k ? v : x)) })}
                        placeholder={`Pilihan ${String.fromCharCode(65 + k)}`}
                      />
                      <IconButton
                        icon={X}
                        label="Hapus pilihan"
                        disabled={q.options.length <= 2}
                        onPress={() =>
                          setQ(i, {
                            options: q.options.filter((_, j) => j !== k),
                            correct: q.correct === undefined ? undefined : q.correct === k ? undefined : q.correct > k ? q.correct - 1 : q.correct,
                          })
                        }
                      />
                    </View>
                  );
                })}
                <View className="flex-row items-center justify-between">
                  <Pressable accessibilityRole="button" disabled={q.options.length >= 6} onPress={() => setQ(i, { options: [...q.options, ''] })} className="py-1 disabled:opacity-40">
                    <Text className="text-primary text-sm font-semibold">+ Tambah pilihan</Text>
                  </Pressable>
                  <Text className={cn('text-xs', q.correct === undefined ? 'text-warning-ink' : 'text-muted-foreground')}>
                    {q.correct === undefined ? 'Ketuk lingkaran untuk tandai jawaban benar' : `Benar: ${String.fromCharCode(65 + q.correct)}`}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="gap-1.5">
                <Input value={q.answerKey ?? ''} onChangeText={(v) => setQ(i, { answerKey: v })} placeholder="Kunci jawaban (opsional)" autoCapitalize="none" />
                <Text className="text-muted-foreground text-xs">
                  Pisahkan jawaban alternatif dengan |. Kosongkan kalau mau dinilai manual. Jawaban yang tidak cocok kunci tetap bisa kamu nilai.
                </Text>
              </View>
            )}
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-muted-foreground text-xs">Poin</Text>
              {[5, 10, 15, 20, 25].map((p) => (
                <Chip key={p} label={String(p)} active={q.points === p} onPress={() => setQ(i, { points: p })} />
              ))}
            </View>
          </Surface>
        ))}
        <View className="flex-row gap-2">
          <Button variant="outline" className="h-12 flex-1 rounded-2xl" onPress={() => set('questions', [...value.questions, newQuestion('PILGAN')])}>
            <Icon as={ListChecks} className="size-4" />
            <Text>Pilihan ganda</Text>
          </Button>
          <Button variant="outline" className="h-12 flex-1 rounded-2xl" onPress={() => set('questions', [...value.questions, newQuestion('ISIAN')])}>
            <Icon as={PencilLine} className="size-4" />
            <Text>Isian</Text>
          </Button>
        </View>
        {total > 0 && <Text className="text-muted-foreground text-xs">Nilai akhir = poin didapat ÷ {total} × 100.</Text>}
      </Section>
      {dialog}
    </View>
  );
}

function ToggleLine({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked }} onPress={() => onChange(!checked)} className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-medium">{label}</Text>
        <Text className="text-muted-foreground text-xs">{hint}</Text>
      </View>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Pressable>
  );
}

function IconButton({ icon, label, onPress, disabled, danger }: { icon: typeof Plus; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={cn('size-9 items-center justify-center rounded-full disabled:opacity-30', danger ? 'bg-danger-soft' : 'bg-muted')}
    >
      <Icon as={icon} className={cn('size-4', danger && 'text-danger-ink')} />
    </Pressable>
  );
}
