const assert = require('node:assert/strict');
const { test } = require('node:test');

const { resolveCheckInFeedback } = require('../src/services/attendance/check-in-feedback.ts');

const ALL_14_CODES = [
  ['AUTH_REQUIRED', 'relogin'],
  ['FORBIDDEN', 'back-to-home'],
  ['SESSION_NOT_FOUND', 'back-to-home'],
  ['SESSION_CLOSED', 'back-to-home'],
  ['LAB_NOT_CONFIGURED', 'back-to-home'],
  ['POLICY_NOT_CONFIGURED', 'back-to-home'],
  ['QR_INVALID', 'rescan-qr'],
  ['QR_EXPIRED', 'rescan-qr'],
  ['LOCATION_INVALID', 'refresh-location'],
  ['LOCATION_STALE', 'refresh-location'],
  ['LOCATION_INACCURATE', 'refresh-location'],
  ['OUTSIDE_RADIUS', 'refresh-location'],
  ['RATE_LIMITED', 'retry-submit'],
  ['SERVICE_UNAVAILABLE', 'retry-submit'],
];

test('maps all 14 server CheckInErrorCode values to distinct recovery actions', () => {
  for (const [code, expectedAction] of ALL_14_CODES) {
    const view = resolveCheckInFeedback({
      kind: 'server-error',
      status: 400,
      code,
      message: 'raw',
    });
    assert.equal(view.recoveryAction, expectedAction, `Mismatch for ${code}`);
    assert.ok(view.title.length > 0);
    assert.ok(view.recoveryLabel && view.recoveryLabel.length > 0);
  }
});

test('distinguishes recorded, already-recorded, and network-error without optimistic success', () => {
  const recorded = resolveCheckInFeedback({
    kind: 'success',
    data: {
      status: 'recorded',
      attendanceId: 's1__u1',
      checkedInAt: '2026-11-20T01:00:00.000Z',
      distanceMeters: 5,
      radiusMeters: 25,
    },
  });
  assert.equal(recorded.tone, 'success');
  assert.equal(recorded.recoveryAction, 'none');

  const repeat = resolveCheckInFeedback({
    kind: 'success',
    data: {
      status: 'already-recorded',
      attendanceId: 's1__u1',
      checkedInAt: '2026-11-20T01:00:00.000Z',
      distanceMeters: 5,
      radiusMeters: 25,
    },
  });
  assert.equal(repeat.tone, 'success');
  assert.notEqual(repeat.title, recorded.title);

  const network = resolveCheckInFeedback({
    kind: 'network-error',
    message: 'Offline',
  });
  assert.equal(network.tone, 'warning');
  assert.equal(network.recoveryAction, 'retry-submit');
});
