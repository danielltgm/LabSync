
const { FieldPath, FieldValue } = require('firebase-admin/firestore');
const { canReceive, enrollmentPath, invalidTokenCodes, retryableCodes, retryDelay } = require('./events.cjs');

const { sendFcm } = require('./fcm.cjs');

const batchSize = 30;
const leaseMs = 130_000;
const ttl = 24 * 3_600_000;

async function enqueue(db, event, createdAt) {
  if (!event) return;
  try {
    await db.doc('notificationEvents/' + event.id).create({ ...event, createdAt, nextAttemptAt: Date.now() });
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
  }
}

async function seed(db, ref, event) {
  let registrations = db.collection('deviceRegistrations').where('enabled', '==', true);
  if (event.recipientUid) registrations = registrations.where('ownerUid', '==', event.recipientUid);
  registrations = registrations.orderBy(FieldPath.documentId()).limit(batchSize);
  if (event.cursor) registrations = registrations.startAfter(event.cursor);
  const page = await registrations.get();
  const devices = page.docs.filter((doc) => doc.get('boundAt') <= event.createdAt);
  const snapshots = event.recipientUid || !devices.length ? [] : await db.getAll(...devices.map((doc) =>
    db.doc(enrollmentPath(doc.get('ownerUid'), event.classId))));
  const batch = db.batch();
  for (let i = 0; i < devices.length; i++) {
    if (!event.recipientUid && !snapshots[i].exists) continue;
    const device = devices[i];
    batch.set(ref.collection('deliveries').doc(device.id), {
      recipientUid: device.get('ownerUid'), boundAt: device.get('boundAt'),
      status: 'pending', attempt: 0, nextAttemptAt: Date.now(),
    });
  }
  // Advance using the unfiltered batch so ineligible registrations cannot stop pagination.
  const last = page.docs.at(-1);
  batch.update(ref, { cursor: last?.id ?? null, seeded: page.size < batchSize });
  await batch.commit();
}

async function disableInvalid(db, device, token) {
  await db.runTransaction(async (tx) => {
    const current = await tx.get(device.ref);
    if (current.get('token') === token && current.get('ownerUid') === device.get('ownerUid') &&
      current.get('boundAt') === device.get('boundAt')) tx.update(device.ref, { enabled: false });
  });
}

async function deliver(db, messaging, event, delivery) {
  const recipient = delivery.get('recipientUid');
  const attempt = delivery.get('attempt') + 1;
  const ref = delivery.ref;
  const finish = (status, lastError = null) => ref.update({
    attempt, status, lastError, nextAttemptAt: FieldValue.delete(),
  });
  if (attempt > 5) return finish('failed', 'attempt-limit');

  // Count the attempt before calling FCM so a dying worker still has a retry bound.
  await ref.update({ attempt });
  let device;
  let token;
  try {
    if (!await canReceive(db, event, recipient)) return finish('skipped');
    device = await db.doc('deviceRegistrations/' + delivery.id).get();
    token = device.get('token');
    if (!device.get('enabled') || device.get('ownerUid') !== recipient ||
        device.get('boundAt') !== delivery.get('boundAt') || device.get('transport') !== 'fcm' ||
        device.get('platform') !== 'android' || !token) return finish('skipped');

    await sendFcm(messaging, token, event, ttl);
  } catch (error) {
    const code = typeof error.code === 'string' ? error.code : 'internal';
    if (device && invalidTokenCodes.has(code)) {
      await disableInvalid(db, device, token);
      return finish('invalid-token', code);
    }
    const delay = retryDelay(attempt);
    if (delay !== null && (retryableCodes.has(code) || !device)) {
      return ref.update({ attempt, status: 'retry', lastError: code, nextAttemptAt: Date.now() + delay });
    }
    return finish('failed', code);
  }
  return finish('sent');
}

async function processOutbox(db, messaging) {
  const start = Date.now();
  const ready = await db.collection('notificationEvents').where('nextAttemptAt', '<=', start).orderBy('nextAttemptAt').limit(8).get();
  for (const { ref } of ready.docs) {
    if (Date.now() - start > 45_000) return;
    const event = await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      if (!data || data.nextAttemptAt === undefined || data.nextAttemptAt > Date.now()) return null;
      tx.update(ref, { nextAttemptAt: Date.now() + leaseMs });
      return data;
    });
    if (!event) continue;
    if (event.createdAt + ttl <= Date.now()) {
      await ref.update({ status: 'expired', nextAttemptAt: FieldValue.delete() });
      continue;
    }
    if (!event.seeded) await seed(db, ref, event);
    const due = await ref.collection('deliveries').where('nextAttemptAt', '<=', Date.now())
      .orderBy('nextAttemptAt').limit(batchSize).get();
    for (let i = 0; i < due.docs.length; i += 5) {
      if (Date.now() - start > 45_000) break;
      await Promise.all(due.docs.slice(i, i + 5).map((job) => deliver(db, messaging, event, job)));
    }
    const stillSeeding = !(await ref.get()).get('seeded');
    const next = (await ref.collection('deliveries').orderBy('nextAttemptAt').limit(1).get()).docs[0];
    await ref.update({
      status: !stillSeeding && !next ? 'processed' : 'queued',
      nextAttemptAt: stillSeeding ? Date.now() : next?.get('nextAttemptAt') ?? FieldValue.delete(),
    });
  }
}

module.exports = { enqueue, processOutbox };
