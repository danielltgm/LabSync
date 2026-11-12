const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { after, before, test } = require('node:test');
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } = require('firebase/firestore');

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-labsync-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(Object.entries({
      'users/assistant': { role: 'ASISTEN' },
      'users/student': { role: 'PRAKTISAN' },
      'users/outsider': { role: 'PRAKTISAN' },
      'classes/mobile': { assistantUid: 'assistant' },
      'classes/other': { assistantUid: 'another-assistant' },
      'enrollments/student/classes/mobile': {},
      'sessions/mobile-1': { classId: 'mobile', status: 'TERJADWAL' },
      'sessions/other-1': { classId: 'other', status: 'TERJADWAL' },
      'attendance/mobile-1__student': { studentUid: 'student', classId: 'mobile', sessionId: 'mobile-1' },
      'attendance/other-1__outsider': { studentUid: 'outsider', classId: 'other', sessionId: 'other-1' },
      'leaveRequests/mobile-1__student': { studentUid: 'student', classId: 'mobile', sessionId: 'mobile-1', decision: 'pending' },
    }).map(([path, data]) => setDoc(doc(db, path), data)));
  });
});

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
