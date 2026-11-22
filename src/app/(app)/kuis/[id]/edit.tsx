import { useLocalSearchParams } from 'expo-router';
import { ListChecks } from 'lucide-react-native';
import { useState } from 'react';

import { useConfirm } from '@/components/app/confirm';
import { EmptyState } from '@/components/app/primitives';
import { goBack, PageHeader, Screen } from '@/components/app/screen';
import { cleanQuestions, QuizBuilder, validateQuiz, type QuizDraft } from '@/components/app/quiz-builder';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useStore } from '@/data/store';

/** Only drafts are editable: once a quiz is open, its questions are fixed for fairness. */
export default function EditQuiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, saveQuiz, toast } = useStore();
  const quiz = state.quizzes.find((q) => q.id === id);
  const linked = quiz?.assignmentId ? state.assignments.find((a) => a.id === quiz.assignmentId) : undefined;
  const [draft, setDraft] = useState<QuizDraft | null>(() =>
    quiz
      ? {
          title: quiz.title,
          durationMin: quiz.durationMin,
          maxWarnings: quiz.maxWarnings,
          shuffle: quiz.shuffle,
          requireAttendance: quiz.requireAttendance,
          gradeWeight: linked ? linked.weight : null,
          questions: quiz.questions.map((q) => ({ ...q, options: [...q.options] })),
        }
      : null,
  );
  const [error, setError] = useState('');
  const { confirm, dialog } = useConfirm();

  if (!quiz || !draft || quiz.status !== 'DRAFT') {
    return (
      <Screen header={<PageHeader title="Ubah kuis" />}>
        <EmptyState icon={ListChecks} title={quiz ? 'Kuis sudah dibuka' : 'Kuis tidak ditemukan'} body={quiz ? 'Soal tidak bisa diubah setelah kuis dibuka.' : undefined} />
      </Screen>
    );
  }

  const save = () => {
    const problem = validateQuiz(draft);
    if (problem) return setError(problem);
    setError('');
    confirm({
      title: 'Simpan perubahan kuis?',
      body: 'Perubahan tercatat di log kelas.',
      confirmLabel: 'Simpan',
      changes: [
        { label: 'Soal', from: `${quiz.questions.length} soal`, to: `${draft.questions.length} soal` },
        { label: 'Durasi', from: `${quiz.durationMin} mnt`, to: `${draft.durationMin} mnt` },
      ],
      onConfirm: () => {
        saveQuiz({ ...draft, id: quiz.id, sessionId: quiz.sessionId, title: draft.title.trim(), questions: cleanQuestions(draft.questions) });
        toast({ title: 'Kuis diperbarui', tone: 'success' });
        goBack();
      },
    });
  };

  return (
    <Screen width="medium" header={<PageHeader title="Ubah kuis" subtitle={quiz.title} />}>
      <QuizBuilder value={draft} onChange={setDraft} />
      {!!error && <Text className="text-destructive text-sm">{error}</Text>}
      <Button size="lg" className="h-14 rounded-2xl" onPress={save}>
        <Text className="text-base font-bold">Simpan</Text>
      </Button>
      {dialog}
    </Screen>
  );
}
