import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Resolve tsconfig `@/*` and extensionless TS imports so `node scripts/check-foundation.ts` runs with zero deps.
registerHooks({
  resolve(specifier, ctx, next) {
    const pick = (base: string) => [base + '.ts', base + '.tsx', base + '/index.ts'].find(existsSync);
    if (specifier.startsWith('@/')) {
      const hit = pick(resolve('src', specifier.slice(2)));
      if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && ctx.parentURL?.startsWith('file:')) {
      const hit = pick(resolve(dirname(fileURLToPath(ctx.parentURL)), specifier));
      if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
    }
    return next(specifier, ctx);
  },
});

const { createDemoState, DEMO_ACCOUNTS } = await import('../src/data/demo-seed');
const { DEFAULT_FINE_AMOUNT, fineIdFor, resolveFineAmount } = await import('../src/lib/fine-rules');
const { authorize } = await import('../src/server/act');
const { analyzeLeaveSentiment } = await import('../src/server/sentiment-tfidf');

const state = createDemoState();
const aslab = state.users.find((u) => u.nim === DEMO_ACCOUNTS.aslab)!;
const asprak = state.users.find((u) => u.nim === DEMO_ACCOUNTS.asprak)!;
const praktikan = state.users.find((u) => u.nim === DEMO_ACCOUNTS.praktikan)!;
const ownCls = state.classes.find((c) => c.assistantNims.includes(asprak.nim))!;
const otherCls = state.classes.find((c) => !c.assistantNims.includes(asprak.nim))!;

// Role migration & seed contracts
assert.ok(state.users.every((u) => u.role === 'ASLAB' || u.role === 'ASPRAK' || u.role === 'PRAKTIKAN'));
assert.ok(state.fines.length >= 3 && state.payments.length >= 3);
assert.equal(fineIdFor('s1', '123'), 's1__123');
assert.equal(resolveFineAmount({}, undefined), DEFAULT_FINE_AMOUNT);
assert.equal(resolveFineAmount({ fineAmount: 15_000 }, { defaultFineAmount: 10_000 }), 15_000);
const sentiment = analyzeLeaveSentiment('Sakit demam');
assert.equal(sentiment.label, null);
assert.equal(sentiment.status, 'unavailable');
assert.equal(sentiment.model, 'edom-tfidf');

// ASLAB: full management access
for (const act of ['saveLab', 'deleteLab', 'transferStudent', 'bulkInsertLabs', 'bulkInsertStudents', 'bulkInsertAssistants', 'setRole'] as const) {
  assert.doesNotThrow(() => authorize(act, aslab, ownCls));
}

// ASPRAK: ONLY operational session/attendance/leave actions on assigned class
for (const act of ['openSession', 'closeSession', 'overrideAttendance', 'reviewLeave'] as const) {
  assert.doesNotThrow(() => authorize(act, asprak, ownCls));
  assert.throws(() => authorize(act, asprak, otherCls), /not_class_staff/);
}
for (const act of ['saveLab', 'deleteLab', 'enroll', 'unenroll', 'transferStudent', 'bulkInsertLabs', 'createSessions', 'setRole'] as const) {
  assert.throws(() => authorize(act, asprak, ownCls), /forbidden/);
}

// PRAKTIKAN: self actions on enrolled class only
assert.doesNotThrow(() => authorize('checkIn', praktikan, ownCls));
assert.throws(() => authorize('openSession', praktikan, ownCls), /forbidden/);
assert.throws(() => authorize('checkIn', praktikan, { ...ownCls, studentNims: [] }), /not_member/);

console.log('Commit 0 foundation checks passed.');
