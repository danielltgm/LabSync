
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


module.exports = { digest, leaveEvent, sessionEvent };
