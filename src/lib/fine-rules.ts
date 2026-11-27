import type { Lab, Session } from '@/data/types';

export const DEFAULT_FINE_AMOUNT = 10_000;

export const fineIdFor = (sessionId: string, nim: string) => `${sessionId}__${nim}`;

export function resolveFineAmount(session: Pick<Session, 'fineAmount'>, lab?: Pick<Lab, 'defaultFineAmount'>): number {
  return session.fineAmount ?? lab?.defaultFineAmount ?? DEFAULT_FINE_AMOUNT;
}
