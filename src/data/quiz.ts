import type { DemoState } from './demo-seed';
import type { Quiz, QuizAttempt, QuizQuestion } from './types';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** ISIAN with a key: correct when the answer matches any "|"-separated alternative (case and spacing ignored). */
export function matchesKey(answer: string, key: string) {
  const a = norm(answer);
  return !!a && key.split('|').map(norm).filter(Boolean).includes(a);
}

/** Points for one question: a number, or null while an ISIAN answer still waits for the assistant. */
export function questionPoints(q: QuizQuestion, attempt: QuizAttempt): number | null {
  const ans = attempt.answers[q.id];
  if (q.type === 'PILGAN') return ans === q.correct ? q.points : 0;
  if (attempt.manual[q.id] !== undefined) return attempt.manual[q.id];
  if (typeof ans !== 'string' || !ans.trim()) return 0;
  if (q.answerKey?.trim()) return matchesKey(ans, q.answerKey) ? q.points : null;
  return null;
}

export function quizScore(quiz: Quiz, attempt: QuizAttempt) {
  const total = quiz.questions.reduce((s, q) => s + q.points, 0);
  let earned = 0;
  let pending = 0;
  for (const q of quiz.questions) {
    const p = questionPoints(q, attempt);
    if (p === null) pending++;
    else earned += p;
  }
  const answered = quiz.questions.filter((q) => {
    const a = attempt.answers[q.id];
    return typeof a === 'number' || (typeof a === 'string' && a.trim() !== '');
  }).length;
  return { total, earned, pending, answered, pct: total ? Math.round((earned / total) * 100) : 0 };
}

/** Warnings left before the next violation submits the quiz. */
export function warningsLeft(quiz: Quiz, attempt: QuizAttempt) {
  return quiz.maxWarnings + attempt.allowance - attempt.violations.length;
}

export function quizzesForSession(state: DemoState, sessionId: string) {
  return state.quizzes.filter((q) => q.sessionId === sessionId);
}

export function attemptFor(state: DemoState, quizId: string, nim: string) {
  return state.quizAttempts.find((a) => a.id === `${quizId}__${nim}`);
}

export const VIOLATION_LABEL: Record<QuizAttempt['violations'][number]['kind'], string> = {
  KELUAR_APLIKASI: 'Keluar dari aplikasi',
  SCREENSHOT: 'Tangkapan layar',
  PINDAH_TAB: 'Pindah tab / jendela',
  KELUAR_FULLSCREEN: 'Keluar layar penuh',
};
