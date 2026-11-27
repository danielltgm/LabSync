import type { LeaveSentiment } from '@/data/types';

// ponytail: Commit 0 graceful fallback stub wired into submitLeave; Zufar implements SRS-4.7 local TF-IDF here.
export function analyzeLeaveSentiment(_reason: string): LeaveSentiment {
  return { status: 'unavailable', model: 'local-tfidf', analyzedAt: Date.now() };
}
