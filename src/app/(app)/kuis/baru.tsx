import { router, useLocalSearchParams } from 'expo-router';
import { ListChecks } from 'lucide-react-native';
import { useState } from 'react';

import { EmptyState } from '@/components/app/primitives';
import { PageHeader, Screen } from '@/components/app/screen';
import { cleanQuestions, newQuestion, QuizBuilder, validateQuiz, type QuizDraft } from '@/components/app/quiz-builder';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { viewSession } from '@/data/selectors';
import { useMe, useStore } from '@/data/store';

export default function NewQuiz() {
  const { sesi } = useLocalSearchParams<{ sesi?: string }>();
  const { state, saveQuiz, toast } = useStore();
  const me = useMe();
  const raw = state.sessions.find((s) => s.id === sesi);
  const [draft, setDraft] = useState<QuizDraft>(() => ({
    title: raw ? `Kuis ${raw.topic}` : '',
    durationMin: 15,
    maxWarnings: 3,
    shuffle: true,
    requireAttendance: true,
    gradeWeight: 10,
    questions: [newQuestion('PILGAN')],
  }));
  const [error, setError] = useState('');

  const s = raw ? viewSession(state, raw) : null;
  if (!s || (me.role !== 'SUPERADMIN' && !s.cls.assistantNims.includes(me.nim))) {
    return (
      <Screen header={<PageHeader title="Buat kuis" />}>
        <EmptyState icon={ListChecks} title="Pertemuan tidak ditemukan" body="Buat kuis dari halaman pertemuan kelasmu." />
      </Screen>
    );
  }

  const save = () => {
    const problem = validateQuiz(draft);
    if (problem) return setError(problem);
    setError('');
    const id = saveQuiz({ ...draft, title: draft.title.trim(), questions: cleanQuestions(draft.questions), sessionId: s.id });
    toast({ title: 'Draft kuis disimpan', body: 'Buka kuis saat praktikan siap mengerjakan.', tone: 'success' });
    router.replace(`/kuis/${id}`);
  };

  return (
    <Screen width="medium" header={<PageHeader title="Buat kuis" subtitle={`${s.course.name} ${s.cls.label} · P${s.meetingNo}`} />}>
      <QuizBuilder value={draft} onChange={setDraft} />
      {!!error && <Text className="text-destructive text-sm">{error}</Text>}
      <Button size="lg" className="h-14 rounded-2xl" onPress={save}>
        <Text className="text-base font-bold">Simpan draft</Text>
      </Button>
    </Screen>
  );
}
