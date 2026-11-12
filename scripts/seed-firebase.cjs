const { randomBytes } = require('node:crypto');
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

async function demoUser(auth, email, displayName, emulator) {
  const password = emulator ? 'labsync-local' : randomBytes(24).toString('base64url');
  try {
    return { user: await auth.getUserByEmail(email) };
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    return { user: await auth.createUser({ email, displayName, password }), password };
  }
}

async function seedDemo(projectId) {
  const authEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const emulator = projectId === 'demo-labsync';
  if ((!emulator && projectId !== 'labsync-sprint2-dev') ||
      authEmulator !== emulator || firestoreEmulator !== emulator) {
    throw new Error('Choose demo-labsync with both emulators or the shared labsync-sprint2-dev project.');
  }
  const app = initializeApp({ projectId, ...(emulator ? {} : { credential: applicationDefault() }) });
  try {
    const auth = getAuth(app);
    const db = getFirestore(app);
    const assistant = await demoUser(auth, 'assistant@labsync.example', 'Asisten Demo', emulator);
    const student = await demoUser(auth, 'student@labsync.example', 'Praktikan Demo', emulator);
    const assistantUid = assistant.user.uid;
    const studentUid = student.user.uid;

    const session = db.doc('sessions/demo-mobile');
    await db.runTransaction(async (transaction) => {
      const existingSession = await transaction.get(session);
      transaction.set(db.doc(`users/${assistantUid}`), {
        name: 'Asisten Demo', identifier: 'AST-DEMO', role: 'ASISTEN',
      });
      transaction.set(db.doc(`users/${studentUid}`), {
        name: 'Praktikan Demo', identifier: 'NIM-DEMO', role: 'PRAKTISAN',
      });
      transaction.set(db.doc('classes/demo-if3a'), { name: 'IF-3A Demo', assistantUid });
      transaction.set(db.doc(`enrollments/${studentUid}/classes/demo-if3a`), { enrolledAt: Timestamp.now() });
      if (!existingSession.exists) {
        transaction.create(session, {
          classId: 'demo-if3a', courseName: 'Pemrograman Mobile', className: 'IF-3A Demo',
          labRoom: 'Lab RPL', date: '2026-11-20', startTime: '08:00', endTime: '10:00',
          status: 'TERJADWAL', assistantName: 'Asisten Demo',
        });
      }
    });
    return [assistant, student].map(({ user, password }) => ({ email: user.email, password }));
  } finally {
    await deleteApp(app);
  }
}

if (require.main === module) {
  const projectId = process.argv[2] ?? 'demo-labsync';
  if (projectId === 'demo-labsync') {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  }
  seedDemo(projectId).then((accounts) => {
    console.log('Demo fixture ready.');
    if (accounts.some((account) => account.password)) {
      for (const { email, password } of accounts) {
        if (password) console.log(email + ' ' + password);
      }
    }
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { seedDemo };
