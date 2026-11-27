import type { LeaveSentiment } from '@/data/types';

// ponytail: Commit 0 graceful fallback stub wired into submitLeave; Zufar drops in Doctor3131/ppk-rn-expo-58/ai here (SRS-4.7).
export function analyzeLeaveSentiment(_reason: string): LeaveSentiment {
  return { label: null, status: 'unavailable', model: 'edom-tfidf', analyzedAt: Date.now() };
}
