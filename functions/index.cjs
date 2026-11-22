
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

const { canReceive, leaveEvent, sessionEvent } = require('./events.cjs');
const { enqueue, processOutbox } = require('./outbox.cjs');
const { register, revoke } = require('./registrations.cjs');

initializeApp();
const db = getFirestore();
const region = 'asia-southeast2';

exports.captureSessionNotification = onDocumentUpdated({ region, document: 'sessions/{id}', retry: true }, (event) =>
  enqueue(db, sessionEvent(event.params.id, event.data?.before.data(), event.data?.after.data(), event.id), Date.parse(event.time)));
exports.captureLeaveNotification = onDocumentUpdated({ region, document: 'leaveRequests/{id}', retry: true }, (event) =>
  enqueue(db, leaveEvent(event.params.id, event.data?.before.data(), event.data?.after.data()), Date.parse(event.time)));

exports.deliverLabNotifications = onSchedule({ region, schedule: 'every 1 minutes', timeoutSeconds: 120, maxInstances: 1 }, () =>
  processOutbox(db, getMessaging()));

exports.registerLabNotificationDevice = onCall({ region }, (request) => register(db, request));
exports.revokeLabNotificationDevice = onCall({ region }, (request) => revoke(db, request));

exports.resolveLabNotification = onCall({ region }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login diperlukan.');
  const { eventId, installationId } = request.data ?? {};
  if (typeof eventId !== 'string' || !/^[a-f0-9]{64}$/.test(eventId) ||
      typeof installationId !== 'string' || !/^[A-Za-z0-9]{20}$/.test(installationId)) return null;
  const ref = db.doc('notificationEvents/' + eventId);
  const [event, delivery, device] = await db.getAll(ref, ref.collection('deliveries').doc(installationId),
    db.doc('deviceRegistrations/' + installationId));
  const uid = request.auth.uid;
  if (delivery.get('recipientUid') !== uid || device.get('ownerUid') !== uid || !device.get('enabled') ||
      delivery.get('boundAt') !== device.get('boundAt') || !event.exists ||
      !await canReceive(db, event.data(), uid)) return null;
  return event.get('leaveRequestId')
    ? { leaveRequestId: event.get('leaveRequestId') }
    : { sessionId: event.get('sessionId') };
});
