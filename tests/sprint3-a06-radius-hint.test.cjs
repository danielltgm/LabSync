const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  calculateDistanceMeters,
  evaluateClientRadiusHint,
} = require('../src/services/attendance/radius-hint.ts');

// Deliberately synthetic origin coordinates; never used as real lab locations.
const SYNTHETIC_LAB_COORDS = { latitude: 0, longitude: 0 };

const syntheticConfig = {
  labId: 'lab-ap',
  coordinates: SYNTHETIC_LAB_COORDS,
  labConfigVersion: 1,
  radiusMeters: 30,
  policyVersion: 's3-v1',
};

test('calculates distance and classifies inside vs outside radius', () => {
  assert.equal(calculateDistanceMeters(SYNTHETIC_LAB_COORDS, SYNTHETIC_LAB_COORDS), 0);

  const inside = evaluateClientRadiusHint(
    { latitude: 0, longitude: 0.0001, accuracyMeters: 10, capturedAtMs: 1_790_000_000_000 },
    syntheticConfig,
    null,
    'LAB AP',
    30,
  );
  assert.equal(inside.kind, 'inside-radius');

  const outside = evaluateClientRadiusHint(
    { latitude: 0, longitude: 0.001, accuracyMeters: 10, capturedAtMs: 1_790_000_000_000 },
    syntheticConfig,
    null,
    'LAB AP',
    30,
  );
  assert.equal(outside.kind, 'outside-radius');
});

test('returns lab-unconfigured when coordinates or radius are missing', () => {
  const hint = evaluateClientRadiusHint(
    { latitude: 0, longitude: 0, accuracyMeters: 10, capturedAtMs: 1_790_000_000_000 },
    null,
    { id: 'lab-ap', name: 'LAB AP', coordinates: null, enabled: false, configVersion: 1 },
    'LAB AP',
    null,
  );
  assert.equal(hint.kind, 'lab-unconfigured');
});
