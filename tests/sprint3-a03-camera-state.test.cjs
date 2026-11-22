const assert = require('node:assert/strict');
const { test } = require('node:test');

const { resolveCameraGateState } = require('../src/services/attendance/camera-state.ts');

test('returns web-unsupported on web platform', () => {
  assert.equal(
    resolveCameraGateState({ platform: 'web', scanRequested: true, permission: null, isScreenActive: true }),
    'web-unsupported',
  );
});

test('handles permission states and releases camera when screen is inactive', () => {
  assert.equal(
    resolveCameraGateState({ platform: 'android', scanRequested: false, permission: null, isScreenActive: true }),
    'idle',
  );
  assert.equal(
    resolveCameraGateState({
      platform: 'android',
      scanRequested: true,
      permission: { granted: false, canAskAgain: true },
      isScreenActive: true,
    }),
    'denied-retryable',
  );
  assert.equal(
    resolveCameraGateState({
      platform: 'android',
      scanRequested: true,
      permission: { granted: false, canAskAgain: false },
      isScreenActive: true,
    }),
    'denied-settings',
  );
  assert.equal(
    resolveCameraGateState({
      platform: 'android',
      scanRequested: true,
      permission: { granted: true, canAskAgain: true },
      isScreenActive: false,
    }),
    'paused',
  );
  assert.equal(
    resolveCameraGateState({
      platform: 'android',
      scanRequested: true,
      permission: { granted: true, canAskAgain: true },
      isScreenActive: true,
    }),
    'active',
  );
});
