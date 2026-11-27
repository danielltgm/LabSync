/*
 * LabSync Firestore tool (Sprint 3 schema, see docs/firebase.md).
 *
 *   npx tsx scripts/seed-firebase.ts inspect          read-only: collections, doc counts, Auth users
 *   npx tsx scripts/seed-firebase.ts wipe --confirm   delete ALL Firestore data and Auth users (dev only)
 *   npx tsx scripts/seed-firebase.ts seed             rooms B/C/D + sample classes + 3 test logins
 *   npx tsx scripts/seed-firebase.ts verify           check the audit log hash chain
 *
 * Credentials: .secrets/firebase-admin.json (service account of labsync-sprint2-dev).
 * Test logins' passwords are written to scripts/.seed-accounts.local.json (git-ignored).
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { verifyLog } from '../src/data/audit';
import { createDemoState, DEMO_ACCOUNTS } from '../src/data/demo-seed';
import type { AuditEntry } from '../src/data/types';

const ROOT = join(__dirname, '..');
const KEY = join(ROOT, '.secrets', 'firebase-admin.json');
const PROJECT = 'labsync-sprint2-dev';
const COLLECTIONS = [
  'users', 'labs', 'labPhotos', 'courses', 'classes', 'sessions', 'attendance', 'leaves', 'checkinAttempts', 'notifications',
  'fines', 'payments', 'assignments', 'grades', 'log', 'quizzes', 'quizKeys', 'quizAttempts', 'sessionSecrets', 'meta',
  // Sprint 2 leftovers
  'enrollments', 'leaveRequests',
];

if (!existsSync(KEY)) {
  console.error(`Missing ${KEY}. Generate a service account key in Firebase console → Project settings → Service accounts.`);
  process.exit(1);
}
const credentials = JSON.parse(readFileSync(KEY, 'utf8'));
if (credentials.project_id !== PROJECT) {
  console.error(`Key is for ${credentials.project_id}, expected ${PROJECT}. Refusing to continue.`);
  process.exit(1);
}
const app = initializeApp({ credential: cert(credentials), projectId: PROJECT });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth(app);

async function inspect() {
  const roots = await db.listCollections();
  console.log(`Firestore (${PROJECT}):`);
  for (const c of roots) {
    const count = (await c.count().get()).data().count;
    const sample = (await c.limit(1).get()).docs[0];
    console.log(`  ${c.id.padEnd(18)} ${String(count).padStart(5)} docs   fields: ${sample ? Object.keys(sample.data()).sort().join(', ') : '-'}`);
  }
  let users = 0;
  let page: string | undefined;
  do {
    const res = await auth.listUsers(1000, page);
    users += res.users.length;
    page = res.pageToken;
  } while (page);
  console.log(`Auth: ${users} users`);
}

async function wipe() {
  if (!process.argv.includes('--confirm')) {
    console.error('wipe deletes everything. Re-run with --confirm.');
    process.exit(1);
  }
  for (const c of await db.listCollections()) {
    await db.recursiveDelete(c);
    console.log(`deleted ${c.id}`);
  }
  let page: string | undefined;
  do {
    const res = await auth.listUsers(1000, page);
    if (res.users.length) await auth.deleteUsers(res.users.map((u) => u.uid));
    page = res.pageToken;
  } while (page);
  console.log('deleted all Auth users');
}

async function seed() {
  const s = createDemoState();
  const classOf = new Map(s.classes.map((c) => [c.id, c]));
  const sessionClass = new Map(s.sessions.map((x) => [x.id, x.classId]));
  const staff = (classId?: string) => (classId ? (classOf.get(classId)?.assistantNims ?? []) : []);
  const writer = db.bulkWriter();
  const put = (path: string, data: object) => writer.set(db.doc(path), JSON.parse(JSON.stringify(data)));

  for (const u of s.users) put(`users/${u.nim}`, { ...u, createdAt: Date.now() });
  for (const l of s.labs) put(`labs/${l.id}`, l);
  for (const c of s.courses) put(`courses/${c.id}`, c);
  for (const c of s.classes) put(`classes/${c.id}`, c);
  for (const x of s.sessions) put(`sessions/${x.id}`, x);
  for (const a of s.assignments) put(`assignments/${a.id}`, a);
  for (const a of s.attendance) put(`attendance/${a.id}`, { ...a, classId: sessionClass.get(a.sessionId), staffNims: staff(sessionClass.get(a.sessionId)) });
  for (const l of s.leaves) put(`leaves/${l.id}`, { ...l, classId: sessionClass.get(l.sessionId), staffNims: staff(sessionClass.get(l.sessionId)) });
  for (const a of s.attempts) put(`checkinAttempts/${a.id}`, { ...a, classId: sessionClass.get(a.sessionId), staffNims: staff(sessionClass.get(a.sessionId)) });
  for (const n of s.notifications) put(`notifications/${n.id}`, n);
  for (const f of s.fines) put(`fines/${f.id}`, f);
  for (const p of s.payments) put(`payments/${p.id}`, p);
  for (const [key, score] of Object.entries(s.grades)) {
    const [assignmentId, nim] = key.split('__');
    const classId = s.assignments.find((a) => a.id === assignmentId)?.classId;
    put(`grades/${key}`, { assignmentId, nim, classId, score, staffNims: staff(classId) });
  }
  for (const e of s.log) put(`log/${e.id}`, { ...e, staffNims: staff(e.classId) });
  const lastLog = s.log[s.log.length - 1];
  if (lastLog) put('meta/auditHead', { lastId: lastLog.id, hash: lastLog.hash });
  for (const q of s.quizzes) {
    const keys: Record<string, object> = {};
    const questions = q.questions.map(({ correct, answerKey, ...rest }) => {
      keys[rest.id] = { ...(correct !== undefined ? { correct } : {}), ...(answerKey ? { answerKey } : {}) };
      return rest;
    });
    put(`quizzes/${q.id}`, { ...q, questions, staffNims: staff(q.classId) });
    put(`quizKeys/${q.id}`, { classId: q.classId, staffNims: staff(q.classId), keys });
  }
  for (const a of s.quizAttempts) {
    const classId = s.quizzes.find((q) => q.id === a.quizId)?.classId;
    put(`quizAttempts/${a.id}`, { ...a, classId, staffNims: staff(classId) });
  }
  // Open sessions need a QR secret.
  for (const x of s.sessions.filter((x) => x.status === 'DIBUKA')) {
    put(`sessionSecrets/${x.id}`, { secret: randomBytes(16).toString('hex'), classId: x.classId, staffNims: staff(x.classId) });
  }
  await writer.close();
  console.log(`Firestore: ${s.users.length} users, ${s.classes.length} classes, ${s.sessions.length} sessions, ${s.attendance.length} attendance, ${s.log.length} log entries`);

  // Three test logins (uid = NIM). Everyone else in the sample is a profile without a login.
  const accounts: { role: string; nim: string; email: string; password: string }[] = [];
  for (const [role, nim] of Object.entries(DEMO_ACCOUNTS)) {
    const user = s.users.find((u) => u.nim === nim)!;
    const email = `uji.${role}@labsync-dev.test`;
    const password = randomBytes(9).toString('base64url');
    try {
      await auth.createUser({ uid: nim, email, password, displayName: user.name });
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/uid-already-exists') throw e;
      await auth.updateUser(nim, { email, password, displayName: user.name });
    }
    await db.doc(`users/${nim}`).set({ email }, { merge: true });
    accounts.push({ role, nim, email, password });
  }
  const out = join(ROOT, 'scripts', '.seed-accounts.local.json');
  writeFileSync(out, JSON.stringify({ project: PROJECT, createdAt: new Date().toISOString(), accounts }, null, 2));
  console.log(`Test logins written to ${out} (git-ignored).`);
}

async function verify() {
  const snap = await db.collection('log').get();
  const log = snap.docs
    .map((d) => {
      const { staffNims: _s, ...e } = d.data();
      return { ...e, id: d.id } as AuditEntry;
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const broken = verifyLog(log);
  const head = (await db.doc('meta/auditHead').get()).get('lastId');
  console.log(`log: ${log.length} entries, head ${head}, chain ${broken === -1 ? 'intact' : `BROKEN at #${broken + 1} (${log[broken].id})`}`);
  for (const e of log.slice(-3)) console.log(`  ${e.id}  ${e.summary} · ${e.target}`);
}

const cmd = process.argv[2];
const run = cmd === 'inspect' ? inspect : cmd === 'wipe' ? wipe : cmd === 'seed' ? seed : cmd === 'verify' ? verify : null;
if (!run) {
  console.error('usage: npx tsx scripts/seed-firebase.ts inspect | wipe --confirm | seed');
  process.exit(1);
}
run().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
