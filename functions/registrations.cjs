
const { HttpsError } = require('firebase-functions/v2/https');
const { digest } = require('./events.cjs');

function installation(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login diperlukan.');
  const { installationId, secret } = request.data ?? {};
  if (typeof installationId !== 'string' || !/^[A-Za-z0-9]{20}$/.test(installationId) ||
      typeof secret !== 'string' || !/^[A-Za-z0-9]{40}$/.test(secret) ||
      request.rawRequest?.rawBody?.length > 8192) {
    throw new HttpsError('invalid-argument', 'Identitas perangkat tidak valid.');
  }
  return { uid, installationId, proof: digest(secret) };
}

async function register(db, request) {
  const { uid, installationId, proof } = installation(request);
  const { token } = request.data;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_:\-]{40,4096}$/.test(token)) {
    throw new HttpsError('invalid-argument', 'Token FCM Android tidak valid.');
  }
  const ref = db.doc('deviceRegistrations/' + installationId);
  const tokenHash = digest(token);
  const index = db.doc('notificationTokens/' + tokenHash);
  await db.runTransaction(async (tx) => {
    const [existing, holder] = await Promise.all([tx.get(ref), tx.get(index)]);
    if (existing.exists && existing.get('proof') !== proof) {
      throw new HttpsError('permission-denied', 'Perangkat tidak dikenali.');
    }
    const otherId = holder.get('installationId');
    const other = otherId && otherId !== installationId ? await tx.get(db.doc('deviceRegistrations/' + otherId)) : null;
    const oldHash = existing.get('tokenHash');
    const oldIndex = oldHash && oldHash !== tokenHash ? await tx.get(db.doc('notificationTokens/' + oldHash)) : null;
    if (other?.get('tokenHash') === tokenHash) tx.update(other.ref, { enabled: false });
    if (oldIndex?.get('installationId') === installationId) tx.delete(oldIndex.ref);
    const sameOwner = existing.get('ownerUid') === uid && existing.get('enabled') === true;
    const now = Date.now();
    tx.set(ref, {
      ownerUid: uid, proof, token, tokenHash, platform: 'android', transport: 'fcm', enabled: true,
      updatedAt: now, boundAt: sameOwner ? existing.get('boundAt') : now,
    });
    tx.set(index, { installationId });
  });
  return { registered: true };
}

async function revoke(db, request) {
  const { uid, installationId, proof } = installation(request);
  const ref = db.doc('deviceRegistrations/' + installationId);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.get('ownerUid') === uid && existing.get('proof') === proof) {
      tx.update(ref, { enabled: false, updatedAt: Date.now() });
    }
  });
  return { revoked: true };
}

module.exports = { register, revoke };
