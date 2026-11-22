
const assert = require('node:assert/strict');
const test = require('node:test');
const { leaveEvent, retryDelay, sessionEvent } = require('./events.cjs');

const scheduled = { status: 'TERJADWAL', classId: 'a', scheduleRevision: 2, labId: 'lab-ap', courseName: 'Mobile' };

test('opening wins over schedule changes and has a stable id', () => {
  const after = { ...scheduled, status: 'DIBUKA', scheduleRevision: 3, labId: 'lab-b' };
  const opened = sessionEvent('session', scheduled, after, 'first delivery');
  assert.equal(opened.type, 'session.opened');
  assert.equal(opened.id, sessionEvent('session', scheduled, after, 'redelivery').id);
  assert.equal(sessionEvent('session', after, after, 'id'), null);
});

test('schedule revision and material edits are both necessary', () => {
  assert.equal(sessionEvent('session', scheduled, { ...scheduled, scheduleRevision: 3, radiusMeters: 30 }, 'id').type, 'schedule.changed');
  assert.equal(sessionEvent('session', scheduled, { ...scheduled, scheduleRevision: 3, updatedAt: 123 }, 'id'), null);
  assert.equal(sessionEvent('session', scheduled, { ...scheduled, labId: 'lab-d' }, 'id'), null);
});

test('only pending to approved/rejected yields an event for the request owner', () => {
  const before = { decision: 'pending', sessionId: 's', studentUid: 'u' };
  for (const decision of ['approved', 'rejected']) {
    const after = { ...before, decision };
    assert.equal(leaveEvent('s__u', before, after).type, 'leave.' + decision);
    assert.equal(leaveEvent('s__u', before, after).recipientUid, 'u');
    assert.equal(leaveEvent('s__u', after, { ...after, classification: {} }), null);
  }
  assert.equal(leaveEvent('s__other', before, { ...before, decision: 'approved' }), null);
});

test('the final attempt is terminal', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(retryDelay), [60_000, 120_000, 240_000, 480_000, null]);
});
