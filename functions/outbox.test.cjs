
const assert = require('node:assert/strict');
const test = require('node:test');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc } = require('firebase/firestore');
const { canReceive, leaveEvent, sessionEvent } = require('./events.cjs');
const { enqueue, processOutbox } = require('./outbox.cjs');
const { register, revoke } = require('./registrations.cjs');

test('Firestore outbox targets the correct class or requester and handles duplicate events, token errors and account switches',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
    const db = getFirestore(initializeApp({ projectId: 'demo-labsync' }, 'notification-test'));
    const suffix = Date.now().toString(16);
    const a = 'a' + suffix;
    const b = 'b' + suffix;
    const classA = 'class-a-' + suffix;
    const classB = 'class-b-' + suffix;
    const session = 'session-' + suffix;
    const pending = { decision: 'pending', sessionId: session, studentUid: b };
    const reviewed = { ...pending, decision: 'rejected' };
    const leaveId = session + '__' + b;
    const accepted = { ...pending, sessionId: session + '-accepted', decision: 'approved' };
    const acceptedId = accepted.sessionId + '__' + b;
    const before = { status: 'TERJADWAL', classId: classA, scheduleRevision: 1, labId: 'lab-ap' };
    const edited = { ...before, labId: 'lab-b', scheduleRevision: 2 };
    const opened = { ...edited, status: 'DIBUKA' };
    const first = { installationId: suffix.padEnd(20, 'a'), secret: 'a'.repeat(40), token: 'valid-fcm-token:' + 'a'.repeat(48) };
    const second = { installationId: suffix.padEnd(20, 'b'), secret: 'b'.repeat(40), token: 'valid-fcm-token:' + 'b'.repeat(48) };
    const invoke = (uid, data) => ({ auth: { uid }, data });
    await Promise.all([
      db.doc('sessions/' + session).set(opened),
      db.doc('leaveRequests/' + leaveId).set(reviewed),
      db.doc('leaveRequests/' + acceptedId).set(accepted),
      db.doc('enrollments/' + a + '/classes/' + classA).set({ enrolledAt: new Date() }),
      db.doc('enrollments/' + b + '/classes/' + classB).set({ enrolledAt: new Date() }),
      register(db, invoke(a, first)),
      register(db, invoke(b, second)),
    ]);
    const schedule = sessionEvent(session, before, edited, 'schedule');
    const open = sessionEvent(session, edited, opened, 'opened');
    const leave = leaveEvent(leaveId, pending, reviewed);
    const approved = leaveEvent(acceptedId, { ...accepted, decision: 'pending' }, accepted);
    const createdAt = Date.now();
    await Promise.all([enqueue(db, schedule, createdAt), enqueue(db, open, createdAt),
      enqueue(db, open, createdAt), enqueue(db, approved, createdAt)]);
    assert.equal(await canReceive(db, open, a), true);
    assert.equal(await canReceive(db, open, b), false);
    assert.equal(await canReceive(db, leave, a), false);
    assert.equal(await canReceive(db, leave, b), true);
    const attempted = [];
    const worker = { send: async (message) => {
      attempted.push([message.data.type, message.token]);
      assert.equal(message.data.leaveRequestId, undefined);
      if (message.data.type === 'schedule.changed') throw Object.assign(new Error(), { code: 'messaging/server-unavailable' });
      if (message.data.type === 'leave.rejected') throw Object.assign(new Error(), { code: 'messaging/registration-token-not-registered' });
    } };
    await processOutbox(db, worker);
    await enqueue(db, leave, createdAt);
    await processOutbox(db, worker);
    assert.deepEqual(attempted.sort(), [
      ['leave.approved', second.token], ['leave.rejected', second.token],
      ['schedule.changed', first.token], ['session.opened', first.token],
    ]);
    const registration = db.doc('deviceRegistrations/' + second.installationId);
    assert.equal((await registration.get()).get('enabled'), false);
    const client = await initializeTestEnvironment({ projectId: 'demo-labsync' });
    try {
      await assertFails(getDoc(doc(client.authenticatedContext(a).firestore(), registration.path)));
      await assertFails(getDoc(doc(client.authenticatedContext(b).firestore(), 'notificationEvents/' + leave.id)));
    } finally {
      await client.cleanup();
    }
    const retryPath = 'notificationEvents/' + schedule.id;
    const delivery = db.doc(retryPath + '/deliveries/' + first.installationId);
    assert.equal((await delivery.get()).get('status'), 'retry');
    const nextAttempt = (await delivery.get()).get('nextAttemptAt');
    assert.ok(nextAttempt > Date.now());

    await db.doc('enrollments/' + a + '/classes/' + classA).delete();
    assert.equal(await canReceive(db, schedule, a), false);
    await register(db, invoke(b, first));
    await revoke(db, invoke(a, first));
    assert.equal((await db.doc('deviceRegistrations/' + first.installationId).get()).get('ownerUid'), b);
    await delivery.update({ nextAttemptAt: Date.now() });
    await db.doc(retryPath).update({ nextAttemptAt: Date.now() });
    await processOutbox(db, worker);
    assert.equal((await delivery.get()).get('status'), 'skipped');
    assert.equal(attempted.length, 4);
    await revoke(db, invoke(b, first));
    assert.equal((await db.doc('deviceRegistrations/' + first.installationId).get()).get('enabled'), false);
  });
