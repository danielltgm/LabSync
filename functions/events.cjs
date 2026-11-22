
const { createHash } = require('node:crypto');

const scheduleFields = ['date', 'startTime', 'endTime', 'labId', 'labRoom', 'radiusMeters', 'courseName', 'className'];
const validId = (value) => typeof value === 'string' && /^[\w-]{1,260}$/.test(value);
const digest = (value) => createHash('sha256').update(value).digest('hex');

function sessionEvent(sessionId, before, after, triggerId) {
  if (!before || !after || !validId(after.classId) || before.classId !== after.classId) return null;
  const revision = after.scheduleRevision;
  const opened = before.status === 'TERJADWAL' && after.status === 'DIBUKA';
  const changed = before.status === 'TERJADWAL' && after.status === 'TERJADWAL' &&
    Number.isSafeInteger(revision) && revision > (before.scheduleRevision ?? 0) &&
    scheduleFields.some((field) => before[field] !== after[field]);
  if (!opened && !changed) return null;
  const type = opened ? 'session.opened' : 'schedule.changed';
  return {
    id: digest(JSON.stringify([type, sessionId, Number.isSafeInteger(revision) ? revision : triggerId])),
    type, sessionId, classId: after.classId,
    ...(Number.isSafeInteger(revision) ? { revision } : {}),
  };
}

function leaveEvent(leaveRequestId, before, after) {
  if (before?.decision !== 'pending' || !['approved', 'rejected'].includes(after?.decision) ||
      !validId(after.studentUid) || !validId(after.sessionId) ||
      leaveRequestId !== after.sessionId + '__' + after.studentUid ||
      before.studentUid !== after.studentUid || before.sessionId !== after.sessionId) return null;
  const type = 'leave.' + after.decision;
  return {
    id: digest(JSON.stringify([type, leaveRequestId])),
    type, sessionId: after.sessionId, leaveRequestId, recipientUid: after.studentUid,
  };
}

function enrollmentPath(uid, classId) {
  return 'enrollments/' + uid + '/classes/' + classId;
}

async function canReceive(db, event, uid) {
  if (event.recipientUid) {
    if (event.recipientUid !== uid) return false;
    const leave = await db.doc('leaveRequests/' + event.leaveRequestId).get();
    return leave.get('studentUid') === uid && leave.get('sessionId') === event.sessionId &&
      'leave.' + leave.get('decision') === event.type;
  }
  const [enrollment, session] = await db.getAll(
    db.doc(enrollmentPath(uid, event.classId)), db.doc('sessions/' + event.sessionId));
  return enrollment.exists && session.get('classId') === event.classId;
}

const retryableCodes = new Set([
  'messaging/server-unavailable', 'messaging/internal-error', 'messaging/unknown-error',
  'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded', 'app/network-error',
]);
const invalidTokenCodes = new Set(['messaging/invalid-registration-token', 'messaging/registration-token-not-registered']);

function retryDelay(attempt) {
  return attempt < 5 ? Math.min(60_000 * 2 ** (attempt - 1), 900_000) : null;
}

module.exports = { canReceive, digest, enrollmentPath, invalidTokenCodes, leaveEvent, retryableCodes, retryDelay, sessionEvent, validId };
