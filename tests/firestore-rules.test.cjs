const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { after, before, beforeEach, test } = require('node:test');
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } = require('firebase/firestore');

let environment;

// Exercise the app's transaction implementation against real emulator rules.
const leaveModulePath = path.resolve('src/firebase/leave-requests.ts');
const compiledLeave = require('typescript').transpileModule(readFileSync(leaveModulePath, 'utf8'), {
  compilerOptions: { module: require('typescript').ModuleKind.CommonJS },
}).outputText;
const leaveModule = {};
new Function('require', 'exports', compiledLeave)(createRequire(leaveModulePath), leaveModule);

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-labsync-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(Object.entries({
      'users/assistant': { role: 'ASISTEN' },
      'users/student': { role: 'PRAKTISAN' },
      'users/outsider': { role: 'PRAKTISAN' },
      'users/another-assistant': { role: 'ASISTEN' },
      'classes/mobile': { assistantUid: 'assistant' },
      'classes/other': { assistantUid: 'another-assistant' },
      'enrollments/student/classes/mobile': {},
      'sessions/mobile-1': { classId: 'mobile', status: 'TERJADWAL' },
      'sessions/other-1': { classId: 'other', status: 'TERJADWAL' },
      'attendance/mobile-1__student': { studentUid: 'student', classId: 'mobile', sessionId: 'mobile-1' },
      'attendance/other-1__outsider': { studentUid: 'outsider', classId: 'other', sessionId: 'other-1' },
      'leaveRequests/mobile-1__student': leaveFixture(),
      'leaveRequests/other-1__outsider': leaveFixture({ classId: 'other', sessionId: 'other-1', studentUid: 'outsider' }),
    }).map(([path, data]) => setDoc(doc(db, path), data)));
  });
});

function leaveFixture(overrides = {}) {
  return {
    studentUid: 'student', classId: 'mobile', sessionId: 'mobile-1', decision: 'pending',
    reason: 'Sedang sakit dan perlu istirahat.', submittedAt: Timestamp.fromMillis(Date.now() - 60000),
    classification: { status: 'classified', category: 'Sakit' },
    studentName: 'Praktikan Demo', studentId: 'NIM-DEMO', ...overrides,
  };
}

function decisionPatch(decision = 'approved') {
  return { decision, reviewedBy: 'assistant', reviewedAt: serverTimestamp() };
}

after(async () => { await environment?.cleanup(); });

function account(uid) {
  return environment.authenticatedContext(uid).firestore();
}

test('profiles and membership are private and only scoped session queries are allowed', async () => {
  const student = account('student');
  const assistant = account('assistant');
  const publicDb = environment.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(publicDb, 'sessions/mobile-1')));
  await assertSucceeds(getDoc(doc(student, 'users/student')));
  await assertFails(getDoc(doc(student, 'users/assistant')));
  await assertFails(updateDoc(doc(student, 'users/student'), { role: 'ASISTEN' }));
  await assertFails(setDoc(doc(student, 'enrollments/student/classes/other'), {}));
  await assertSucceeds(getDocs(collection(student, 'enrollments/student/classes')));
  await assertSucceeds(getDocs(query(collection(assistant, 'classes'), where('assistantUid', '==', 'assistant'))));

  for (const db of [student, assistant]) {
    await assertSucceeds(getDocs(query(collection(db, 'sessions'), where('classId', '==', 'mobile'))));
    await assertFails(getDocs(query(collection(db, 'sessions'), where('classId', '==', 'other'))));
    await assertFails(getDocs(collection(db, 'sessions')));
  }
});

test('attendance queries cover own history and the assistant recap for the assigned class', async () => {
  const student = account('student');
  const assistant = account('assistant');
  const history = query(collection(student, 'attendance'), where('studentUid', '==', 'student'));
  const recap = query(collection(assistant, 'attendance'), where('classId', '==', 'mobile'), where('sessionId', '==', 'mobile-1'));

  assert.equal((await assertSucceeds(getDocs(history))).size, 1);
  assert.equal((await assertSucceeds(getDocs(recap))).size, 1);
  await assertFails(getDoc(doc(student, 'attendance/other-1__outsider')));
  await assertFails(getDoc(doc(assistant, 'attendance/other-1__outsider')));
  await assertFails(setDoc(doc(student, 'attendance/new'), { studentUid: 'student', classId: 'mobile' }));
  await assertFails(updateDoc(doc(assistant, 'leaveRequests/mobile-1__student'), { decision: 'approved' }));
});

test('only the class assistant can advance status and the student listener sees the update', { timeout: 12000 }, async () => {
  const student = account('student');
  const assistant = account('assistant');
  const ref = doc(assistant, 'sessions/mobile-1');

  await assertFails(updateDoc(doc(student, 'sessions/mobile-1'), { status: 'DIBUKA' }));
  await assertFails(updateDoc(ref, { status: 'SELESAI' }));
  await assertFails(updateDoc(ref, { status: 'DIBUKA', classId: 'other' }));

  let stop;
  try {
    const opened = new Promise((resolve, reject) => {
      stop = onSnapshot(doc(student, 'sessions/mobile-1'), (snapshot) => {
        if (snapshot.data()?.status === 'DIBUKA') resolve();
      }, reject);
    });
    await assertSucceeds(updateDoc(ref, { status: 'DIBUKA' }));
    await opened;
    await assertSucceeds(updateDoc(ref, { status: 'SELESAI' }));
    await assertFails(updateDoc(ref, { status: 'DIBUKA' }));
  } finally {
    stop?.();
  }
});

test('leave queries allow own history and assigned session only', async () => {
  const student = account('student');
  const assistant = account('assistant');
  for (const name of ['attendance', 'leaveRequests']) {
    await assertFails(getDocs(collection(environment.unauthenticatedContext().firestore(), name)));
    await assertFails(getDocs(collection(student, name)));
    await assertFails(getDocs(collection(assistant, name)));
  }
  const history = query(collection(student, 'leaveRequests'), where('studentUid', '==', 'student'));
  const queue = query(collection(assistant, 'leaveRequests'), where('classId', '==', 'mobile'), where('sessionId', '==', 'mobile-1'));
  assert.equal((await assertSucceeds(getDocs(history))).size, 1);
  assert.equal((await assertSucceeds(getDocs(queue))).size, 1);
  await assertFails(getDocs(query(collection(student, 'leaveRequests'), where('studentUid', '==', 'outsider'))));
  await assertFails(getDocs(query(collection(assistant, 'leaveRequests'), where('classId', '==', 'other'))));
});

test('assigned assistant records server-stamped approval, visible to the student and final', async () => {
  const ref = doc(account('assistant'), 'leaveRequests/mobile-1__student');
  await assertSucceeds(updateDoc(ref, decisionPatch()));
  const saved = (await assertSucceeds(getDoc(doc(account('student'), ref.path)))).data();
  assert.equal(saved.decision, 'approved');
  assert.equal(saved.reviewedBy, 'assistant');
  assert.ok(saved.reviewedAt instanceof Timestamp);
  await assertFails(updateDoc(ref, decisionPatch('rejected')));
  await assertFails(updateDoc(ref, decisionPatch('pending')));
  await assertFails(deleteDoc(ref));
});

test('assistant may reject even when AI is unavailable or pending; AI never decides', async () => {
  for (const status of ['pending', 'unavailable']) {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'leaveRequests/mobile-1__student'), leaveFixture({ classification: { status } }));
    });
    await assertSucceeds(updateDoc(doc(account('assistant'), 'leaveRequests/mobile-1__student'), decisionPatch('rejected')));
  }
});

test('students, unrelated assistants and unauthenticated clients cannot review or create leave', async () => {
  for (const db of [account('student'), account('outsider'), account('another-assistant'), environment.unauthenticatedContext().firestore()]) {
    await assertFails(updateDoc(doc(db, 'leaveRequests/mobile-1__student'), decisionPatch()));
    await assertFails(setDoc(doc(db, 'leaveRequests/new__student'), leaveFixture()));
  }
  await assertFails(setDoc(doc(account('assistant'), 'leaveRequests/new__student'), leaveFixture()));
  await assertFails(getDoc(doc(account('outsider'), 'users/student')));
  await assertFails(setDoc(doc(account('outsider'), 'users/outsider'), { role: 'ASISTEN' }));
});

test('review cannot tamper with identity, reason, classification, scope, schema or timestamps', async (t) => {
  const ref = doc(account('assistant'), 'leaveRequests/mobile-1__student');
  const invalid = {
    'forged reviewer': { reviewedBy: 'another-assistant' },
    'client time': { reviewedAt: Timestamp.fromMillis(1) },
    'missing reviewer': { reviewedBy: deleteField() },
    'missing timestamp': { reviewedAt: deleteField() },
    'invalid decision': { decision: 'maybe' },
    'missing decision': { decision: deleteField() },
    'student hijack': { studentUid: 'outsider' },
    'class hijack': { classId: 'other' },
    'session hijack': { sessionId: 'other-1' },
    'reason edit': { reason: 'Alasan yang diubah asisten' },
    'reason overflow': { reason: 'x'.repeat(4001) },
    'reason wrong type': { reason: 23 },
    'reason omission': { reason: deleteField() },
    'AI forged': { classification: { status: 'classified', category: 'Palsu' } },
    'submitted time forged': { submittedAt: serverTimestamp() },
    'student name forged': { studentName: 'Orang Lain' },
    'student NIM forged': { studentId: 'OTHER' },
    'schema pollution': { extraData: 'not in contract' },
  };
  for (const [name, patch] of Object.entries(invalid)) {
    await t.test(name, async () => { await assertFails(updateDoc(ref, { ...decisionPatch(), ...patch })); });
  }
});

test('review denies malformed trusted documents and mismatched session/class relationships', async (t) => {
  const invalid = {
    'oversized saved reason': { reason: 'x'.repeat(4001) },
    'oversized saved category': { classification: { status: 'classified', category: 'x'.repeat(121) } },
    'invalid saved classification': { classification: { status: 'pending', category: 'injected' } },
    'oversized saved identity': { studentName: 'x'.repeat(201) },
    'wrong saved timestamp type': { submittedAt: '2026-11-15' },
    'unknown saved field': { extraData: true },
    'orphaned session': { sessionId: 'missing' },
    'wrong session class': { sessionId: 'other-1' },
    'invalid saved id': { studentUid: 'other/uid' },
  };
  for (const [name, fields] of Object.entries(invalid)) {
    await t.test(name, async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'leaveRequests/mobile-1__student'), leaveFixture(fields));
      });
      await assertFails(updateDoc(doc(account('assistant'), 'leaveRequests/mobile-1__student'), decisionPatch()));
    });
  }
});

test('production transaction prevents concurrent reviews from overwriting the first decision', { timeout: 20000 }, async () => {
  const attempts = await Promise.allSettled([
    leaveModule.reviewLeaveRequest(account('assistant'), 'mobile-1__student', 'assistant', 'approved'),
    leaveModule.reviewLeaveRequest(account('assistant'), 'mobile-1__student', 'assistant', 'rejected'),
  ]);
  assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter((result) => result.status === 'rejected').length, 1);
  const ref = doc(account('student'), 'leaveRequests/mobile-1__student');
  const original = (await getDoc(ref)).data();
  await assert.rejects(leaveModule.reviewLeaveRequest(account('assistant'), 'mobile-1__student', 'assistant', 'approved'), /already-reviewed/);
  const after = (await getDoc(ref)).data();
  assert.equal(after.decision, original.decision);
  assert.ok(after.reviewedAt.isEqual(original.reviewedAt));
});
