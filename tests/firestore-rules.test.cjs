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
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  const port = parseInt(portStr || '8080', 10);
  environment = await initializeTestEnvironment({
    projectId: 'demo-labsync-rules',
    firestore: { host, port, rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(Object.entries({
      'users/assistant': { role: 'ASISTEN' },
      'users/student': { role: 'PRAKTISAN', name: 'Praktikan Demo', identifier: 'NIM-DEMO' },
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

test('SRS-02: class CRUD rules enforce assistant ownership and roles', async () => {
  const assistant = account('assistant');
  const student = account('student');
  const otherAssistant = account('other-assistant');

  // Assistant creates their own class -> succeeds
  await assertSucceeds(setDoc(doc(assistant, 'classes/new-class'), {
    name: 'Jaringan Komputer',
    assistantUid: 'assistant',
  }));

  // Assistant cannot create class claiming another assistant's UID
  await assertFails(setDoc(doc(assistant, 'classes/fake-class'), {
    name: 'Sistem Operasi',
    assistantUid: 'other-assistant',
  }));

  // Student cannot create class
  await assertFails(setDoc(doc(student, 'classes/student-class'), {
    name: 'Kelas Mahasiswa',
    assistantUid: 'student',
  }));

  // Assistant can update own class name
  await assertSucceeds(updateDoc(doc(assistant, 'classes/new-class'), {
    name: 'Jaringan Komputer Praktikum',
  }));

  // Assistant cannot update another assistant's class
  await assertFails(updateDoc(doc(assistant, 'classes/other'), {
    name: 'Hacked Class',
  }));

  // Assistant can delete own class
  await assertSucceeds(deleteDoc(doc(assistant, 'classes/new-class')));

  // Assistant cannot delete another assistant's class
  await assertFails(deleteDoc(doc(assistant, 'classes/other')));
});

test('SRS-02: enrollment rules allow managing assistant to enroll/unenroll students', async () => {
  const assistant = account('assistant');
  const student = account('student');
  const otherStudent = account('outsider');

  // Assistant can enroll a student in the class they manage (mobile)
  await assertSucceeds(setDoc(doc(assistant, 'enrollments/outsider/classes/mobile'), {
    enrolledAt: Timestamp.now(),
  }));

  // Assistant cannot enroll student in a class managed by another assistant (other)
  await assertFails(setDoc(doc(assistant, 'enrollments/outsider/classes/other'), {
    enrolledAt: Timestamp.now(),
  }));

  // Student cannot enroll themselves
  await assertFails(setDoc(doc(otherStudent, 'enrollments/outsider/classes/mobile'), {
    enrolledAt: Timestamp.now(),
  }));

  // Assistant can unenroll student from class they manage
  await assertSucceeds(deleteDoc(doc(assistant, 'enrollments/outsider/classes/mobile')));

  // Assistant cannot unenroll student from another class
  await assertFails(deleteDoc(doc(assistant, 'enrollments/outsider/classes/other')));
});

test('SRS-02: session CRUD rules require status TERJADWAL and managing assistant ownership', async () => {
  const assistant = account('assistant');
  const student = account('student');

  const validSessionData = {
    classId: 'mobile',
    courseName: 'Pemrograman Mobile',
    className: 'IF-3A',
    labRoom: 'Lab RPL',
    date: '2026-11-25',
    startTime: '10:00',
    endTime: '12:00',
    assistantName: 'Asisten Demo',
    status: 'TERJADWAL',
  };

  // Assistant creates session in class they manage with status TERJADWAL -> succeeds
  await assertSucceeds(setDoc(doc(assistant, 'sessions/session-crud-test'), validSessionData));

  // Assistant cannot create session with status DIBUKA directly
  await assertFails(setDoc(doc(assistant, 'sessions/session-invalid-status'), {
    ...validSessionData,
    status: 'DIBUKA',
  }));

  // Assistant cannot create session in class they do not manage
  await assertFails(setDoc(doc(assistant, 'sessions/session-wrong-class'), {
    ...validSessionData,
    classId: 'other',
  }));

  // Student cannot create session
  await assertFails(setDoc(doc(student, 'sessions/student-session'), validSessionData));

  // Assistant can delete session while status is TERJADWAL
  await assertSucceeds(deleteDoc(doc(assistant, 'sessions/session-crud-test')));
});

test('SRS-01: user self-registration creates profile with valid role and matching uid', async () => {
  const newStudent = account('new-student');
  const newAssistant = account('new-assistant');
  const unauthed = environment.unauthenticatedContext().firestore();

  // Valid creation by owner with valid fields and role
  await assertSucceeds(setDoc(doc(newStudent, 'users/new-student'), {
    name: 'New Student',
    identifier: '12345678',
    role: 'PRAKTISAN',
  }));

  await assertFails(setDoc(doc(newAssistant, 'users/new-assistant'), {
    name: 'New Assistant',
    identifier: 'AST-NEW',
    role: 'ASISTEN',
  }));

  // Fails if attempting to create another user's profile
  await assertFails(setDoc(doc(newStudent, 'users/another-user'), {
    name: 'Attacker',
    identifier: '99999999',
    role: 'ASISTEN',
  }));

  // Fails if role is invalid
  const invalidRoleUser = account('invalid-role');
  await assertFails(setDoc(doc(invalidRoleUser, 'users/invalid-role'), {
    name: 'Invalid Role',
    identifier: '00000000',
    role: 'ADMIN',
  }));

  // Fails if extra unauthorized fields are included
  const extraFieldUser = account('extra-field');
  await assertFails(setDoc(doc(extraFieldUser, 'users/extra-field'), {
    name: 'Extra Field',
    identifier: '11111111',
    role: 'PRAKTISAN',
    isAdmin: true,
  }));

  // Fails for unauthenticated user
  await assertFails(setDoc(doc(unauthed, 'users/unauthed-user'), {
    name: 'Unauthed',
    identifier: '22222222',
    role: 'PRAKTISAN',
  }));
});

test('enrolled student can create attendance only once while the session is open', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'sessions/mobile-2'), { classId: 'mobile', className: 'IF-3A', status: 'TERJADWAL' });
  });

  const student = account('student');
  const outsider = account('outsider');
  const assistant = account('assistant');
  const sessionRef = doc(assistant, 'sessions/mobile-2');
  const attendanceRef = doc(student, 'attendance/mobile-2__student');
  const record = { studentUid: 'student', classId: 'mobile', sessionId: 'mobile-2', studentName: 'Praktikan Demo', studentId: 'NIM-DEMO', className: 'IF-3A', checkedInAt: serverTimestamp(), notes: 'PC-01' };
  assert.equal((await assertSucceeds(getDoc(attendanceRef))).exists(), false);

  await assertFails(setDoc(attendanceRef, record));
  await assertSucceeds(updateDoc(sessionRef, { status: 'DIBUKA' }));

  await assertFails(setDoc(doc(outsider, 'attendance/mobile-2__outsider'), {
    studentUid: 'outsider', classId: 'mobile', sessionId: 'mobile-2',
  }));
  await assertFails(setDoc(doc(student, 'attendance/mobile-2__other'), record));
  await assertFails(setDoc(attendanceRef, { ...record, classId: 'other' }));

  await assertFails(setDoc(attendanceRef, { ...record, studentName: 'Nama lain' }));
  await assertSucceeds(setDoc(attendanceRef, record));
  await assertFails(setDoc(attendanceRef, { ...record, notes: 'PC-99' }));
  assert.equal((await assertSucceeds(getDoc(attendanceRef))).data()?.notes, 'PC-01');

  await assertSucceeds(updateDoc(sessionRef, { status: 'SELESAI' }));
});

test('enrolled student can create a pending leave request and cannot change the AI classification', async () => {
  const student = account('student');
  const outsider = account('outsider');
  const leaveRef = doc(student, 'leaveRequests/mobile-1__student');
  await environment.withSecurityRulesDisabled((context) => deleteDoc(doc(context.firestore(), 'leaveRequests/mobile-1__student')));
  assert.equal((await assertSucceeds(getDoc(leaveRef))).exists(), false);
  const validLeave = {
    sessionId: 'mobile-1',
    classId: 'mobile',
    studentUid: 'student',
    submittedAt: serverTimestamp(),
    reason: 'Sakit demam dan harus istirahat',
    classification: { status: 'pending' },
    decision: 'pending',
  };

  await assertFails(setDoc(doc(outsider, 'leaveRequests/mobile-2__outsider'), { ...validLeave, studentUid: 'outsider' }));
  await assertFails(setDoc(doc(student, 'leaveRequests/custom-id'), validLeave));
  await assertFails(setDoc(leaveRef, { ...validLeave, reason: '' }));
  await assertFails(setDoc(leaveRef, { ...validLeave, decision: 'approved' }));
  await assertFails(setDoc(leaveRef, { ...validLeave, classId: 'other' }));

  await assertSucceeds(setDoc(leaveRef, validLeave));
  await assertFails(setDoc(leaveRef, { ...validLeave, reason: 'Alasan diubah' }));
  await assertFails(updateDoc(leaveRef, { decision: 'approved' }));
  await assertFails(updateDoc(leaveRef, { classification: { status: 'classified', category: 'Sakit' } }));
  await assertFails(updateDoc(leaveRef, { classification: { status: 'classified', category: 'Demo: Sakit' } }));
  await assertFails(updateDoc(leaveRef, { classification: { status: 'unavailable' } }));
  assert.equal((await getDoc(leaveRef)).data()?.reason, 'Sakit demam dan harus istirahat');
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

test('S3-D-01: authenticated users can read labs but client writes are forbidden', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'labs/lab-ap'), {
      id: 'lab-ap', name: 'LAB AP', coordinates: null, enabled: false, configVersion: 1,
    });
  });

  const student = account('student');
  const assistant = account('assistant');
  const unauthed = environment.unauthenticatedContext().firestore();

  // Authenticated read succeeds
  await assertSucceeds(getDoc(doc(student, 'labs/lab-ap')));
  await assertSucceeds(getDoc(doc(assistant, 'labs/lab-ap')));

  // Unauthenticated read fails
  await assertFails(getDoc(doc(unauthed, 'labs/lab-ap')));

  // Client write fails for all clients
  await assertFails(setDoc(doc(assistant, 'labs/lab-b'), {
    id: 'lab-b', name: 'LAB B', coordinates: null, enabled: false, configVersion: 1,
  }));
  await assertFails(updateDoc(doc(assistant, 'labs/lab-ap'), { enabled: true }));
  await assertFails(deleteDoc(doc(assistant, 'labs/lab-ap')));
});

test('S3-D-02: session rules enforce valid labId and positive radius on TERJADWAL and open with config', async () => {
  const assistant = account('assistant');

  const baseSession = {
    classId: 'mobile', courseName: 'Pemrograman Mobile', className: 'IF-3A',
    labRoom: 'Lab RPL', date: '2026-11-25', startTime: '10:00', endTime: '12:00',
    assistantName: 'Asisten Demo', status: 'TERJADWAL',
  };

  // Valid session creation with Sprint 3 fields
  await assertSucceeds(setDoc(doc(assistant, 'sessions/s3-session-valid'), {
    ...baseSession,
    labId: 'lab-ap',
    radiusMeters: 50,
    scheduleRevision: 1,
    startsAt: Timestamp.fromMillis(Date.now()),
    endsAt: Timestamp.fromMillis(Date.now() + 7200000),
  }));

  // Rejects invalid labId
  await assertFails(setDoc(doc(assistant, 'sessions/s3-session-bad-lab'), {
    ...baseSession,
    labId: 'lab-unknown',
    radiusMeters: 50,
  }));

  // Rejects non-positive radius
  await assertFails(setDoc(doc(assistant, 'sessions/s3-session-zero-radius'), {
    ...baseSession,
    labId: 'lab-ap',
    radiusMeters: 0,
  }));

  // Assistant can transition TERJADWAL -> DIBUKA with attendanceConfig snapshot
  await assertSucceeds(updateDoc(doc(assistant, 'sessions/s3-session-valid'), {
    status: 'DIBUKA',
    attendanceConfig: {
      labId: 'lab-ap',
      coordinates: { latitude: -6.2, longitude: 106.8 },
      labConfigVersion: 1,
      radiusMeters: 50,
      policyVersion: 's3-v1',
    },
  }));
});

test('S3-D-03: attendanceChallenges collection is strictly server-only (client read and write rejected)', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'attendanceChallenges/challenge-123'), {
      challengeId: 'challenge-123',
      sessionId: 'mobile-1',
      tokenHash: 'samplehash',
      status: 'active',
      createdAt: '2026-11-20T12:00:00.000Z',
      expiresAt: '2026-11-20T12:01:00.000Z',
    });
  });

  const student = account('student');
  const assistant = account('assistant');
  const unauthed = environment.unauthenticatedContext().firestore();

  // All client reads fail
  await assertFails(getDoc(doc(student, 'attendanceChallenges/challenge-123')));
  await assertFails(getDoc(doc(assistant, 'attendanceChallenges/challenge-123')));
  await assertFails(getDoc(doc(unauthed, 'attendanceChallenges/challenge-123')));

  // All client writes fail
  await assertFails(setDoc(doc(assistant, 'attendanceChallenges/fake-challenge'), {
    challengeId: 'fake-challenge',
    sessionId: 'mobile-1',
    tokenHash: 'fakehash',
  }));
  await assertFails(updateDoc(doc(assistant, 'attendanceChallenges/challenge-123'), { status: 'revoked' }));
  await assertFails(deleteDoc(doc(assistant, 'attendanceChallenges/challenge-123')));
});


