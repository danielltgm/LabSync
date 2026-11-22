import type { AuditEntry } from './types';

/** cyrb53: small, fast 53-bit string hash. Enough to make tampering visible in the demo chain. */
function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export const GENESIS = '0'.repeat(14);

/** Zero-padded so Firestore document ids sort in chain order. */
export const logId = (index: number) => `log-${String(index).padStart(7, '0')}`;

export type AuditDraft = Omit<AuditEntry, 'id' | 'prevHash' | 'hash' | 'at'> & { at?: number };

function digest(e: Omit<AuditEntry, 'hash'>) {
  return cyrb53(JSON.stringify([e.id, e.at, e.actor, e.actorRole, e.kind, e.classId ?? '', e.target, e.summary, e.changes ?? [], e.reason ?? '', e.prevHash]));
}

/** Returns a new log with the entry appended (oldest first). Never mutates or reorders existing entries. */
export function appendLog(log: AuditEntry[], draft: AuditDraft): AuditEntry[] {
  const last = log[log.length - 1];
  const prevHash = last ? last.hash : GENESIS;
  const at = draft.at ?? Date.now();
  // The server only loads the newest entry, so the sequence number comes from its id, not the array length.
  const index = last ? Number(last.id.replace(/^log-0*/, '')) + 1 : 1;
  const base = { ...draft, at, id: logId(index), prevHash };
  return [...log, { ...base, hash: digest(base) }];
}

/** Recomputes the chain. Returns the index of the first broken entry, or -1 when intact. */
export function verifyLog(log: AuditEntry[]) {
  let prev = GENESIS;
  for (let i = 0; i < log.length; i++) {
    const { hash, ...rest } = log[i];
    if (rest.prevHash !== prev || digest(rest) !== hash) return i;
    prev = hash;
  }
  return -1;
}
