
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

const { onCall } = require('firebase-functions/v2/https');
const { register, revoke } = require('./registrations.cjs');

const { leaveEvent, sessionEvent } = require('./events.cjs');
const { enqueue } = require('./outbox.cjs');

initializeApp();
const db = getFirestore();
const region = 'asia-southeast2';

exports.captureSessionNotification = onDocumentUpdated({ region, document: 'sessions/{id}', retry: true }, (event) =>
  enqueue(db, sessionEvent(event.params.id, event.data?.before.data(), event.data?.after.data(), event.id), Date.parse(event.time)));
exports.captureLeaveNotification = onDocumentUpdated({ region, document: 'leaveRequests/{id}', retry: true }, (event) =>
  enqueue(db, leaveEvent(event.params.id, event.data?.before.data(), event.data?.after.data()), Date.parse(event.time)));

exports.registerLabNotificationDevice = onCall({ region }, (request) => register(db, request));
exports.revokeLabNotificationDevice = onCall({ region }, (request) => revoke(db, request));
